#include "PeripheralSpeedo.h"
#include "config/Pins.h"
#include <Wire.h>

#define MCP4725_ADDR_FUEL 0x60 // Jumper A0 to GND
#define MCP4725_ADDR_TEMP 0x61 // Jumper A0 to VCC

PeripheralSpeedo::PeripheralSpeedo(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController),
      _dacFuelFound(false), _dacTempFound(false), _lastDacPollMs(0),
      _lastHzRpm(-1.0f), _lastHzKmh(-1.0f),
      _lastRpmActive(false), _lastKmhActive(false),
      _lastTempActive(false), _lastFuelActive(false),
      _lastDutyTemp(9999), _lastDutyFuel(9999),
      _lastPwmFreq(5000),
      _lastDacFuelVolt(-1.0f), _lastDacTempVolt(-1.0f) {}

void PeripheralSpeedo::detectDacs() {
    Wire.beginTransmission(MCP4725_ADDR_FUEL);
    _dacFuelFound = (Wire.endTransmission() == 0);
    
    Wire.beginTransmission(MCP4725_ADDR_TEMP);
    _dacTempFound = (Wire.endTransmission() == 0);
    
    AppSettings& s = _settingsMgr.getSettings();
    s.speedoDacFuelFound = _dacFuelFound;
    s.speedoDacTempFound = _dacTempFound;
}

void PeripheralSpeedo::writeDac(uint8_t addr, float volts) {
    if (volts < 0.0f) volts = 0.0f;
    if (volts > 5.0f) volts = 5.0f;
    uint16_t dacValue = (uint16_t)((volts / 5.0f) * 4095.0f);
    if (dacValue > 4095) dacValue = 4095;
    
    Wire.beginTransmission(addr);
    Wire.write((dacValue >> 8) & 0x0F);
    Wire.write(dacValue & 0xFF);
    Wire.endTransmission();
}

void PeripheralSpeedo::begin() {
    detectDacs();
    
    AppSettings& s = _settingsMgr.getSettings();
    int pwmFreq = (s.speedoPwmFreqHz >= 10 && s.speedoPwmFreqHz <= 5000) ? s.speedoPwmFreqHz : 5000;
    _lastPwmFreq = pwmFreq;
    
    // LEDC Channel 4 and 5 for Temp and Fuel PWM (Configurable 10Hz - 5kHz, 8-bit resolution)
    // They share Timer 2, leaving Timer 0 for RPM (Ch 1) and Timer 1 for KMH (Ch 2)
    ledcSetup(4, pwmFreq, 8);
    ledcAttachPin(PIN_PWM_TEMP, 4);
    ledcWrite(4, 0);
    
    ledcSetup(5, pwmFreq, 8);
    ledcAttachPin(PIN_PWM_FUEL, 5);
    ledcWrite(5, 0);
    
    // Timer 0 and 1 for LEDC (ESP32)
    ledcSetup(1, 50, 10);
    ledcAttachPin(PIN_RPM, 1);
    ledcWrite(1, 0);
    
    ledcSetup(2, 50, 10);
    ledcAttachPin(PIN_KMH, 2);
    ledcWrite(2, 0);
    
    if (_dacFuelFound) writeDac(MCP4725_ADDR_FUEL, 0.0f);
    if (_dacTempFound) writeDac(MCP4725_ADDR_TEMP, 0.0f);
}

void PeripheralSpeedo::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Periodically re-detect DACs only when stopped to avoid I2C jitter during operation
    uint32_t now = millis();
    if (!s.isRunning && (now - _lastDacPollMs > 3000)) {
        detectDacs();
        _lastDacPollMs = now;
    }
    
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    } else {
        // Keep current values matching targets (hardware gating is handled in updateTimerConfig)
        s.currentSpeedoKmh = s.speedoKmh;
        s.currentSpeedoRpm = s.speedoRpm;
        s.currentSpeedoTempPercent = s.speedoTempPercent;
        s.currentSpeedoFuelPercent = s.speedoFuelPercent;
        updateTimerConfig();
    }
}

void PeripheralSpeedo::syncHardware() {
    AppSettings& s = _settingsMgr.getSettings();
    float hzKmh = ((float)s.currentSpeedoKmh * s.pulsePerKm) / 3600.0f;
    float ppr = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
    float hzRpm = ((float)s.currentSpeedoRpm * ppr) / 60.0f;
    
    bool targetKmh = (s.isRunning && s.speedoEnableKmh && hzKmh >= 1.0f);
    bool targetRpm = (s.isRunning && s.speedoEnableRpm && hzRpm >= 1.0f);
    
    // Invalidate caches by forcing the previous state to the opposite of target
    _lastKmhActive = !targetKmh;
    _lastRpmActive = !targetRpm;
    _lastTempActive = !(s.isRunning && s.speedoEnableTemp);
    _lastFuelActive = !(s.isRunning && s.speedoEnableFuel);
    
    _lastHzRpm = -999.0f;
    _lastHzKmh = -999.0f;
    _lastDutyTemp = 9999;
    _lastDutyFuel = 9999;
    _lastPwmFreq = -1;
    _lastDacFuelVolt = -999.0f;
    _lastDacTempVolt = -999.0f;
    updateTimerConfig();
}

static float apply3PointCal(float frac, int minPct, int midPct, int maxPct) {
    if (frac < 0.0f) frac = 0.0f;
    if (frac > 1.0f) frac = 1.0f;
    
    float minF = (float)minPct / 100.0f;
    float midF = (float)midPct / 100.0f;
    float maxF = (float)maxPct / 100.0f;
    
    if (frac <= 0.5f) {
        float t = frac * 2.0f; // 0.0 to 1.0 in lower half
        return minF + t * (midF - minF);
    } else {
        float t = (frac - 0.5f) * 2.0f; // 0.0 to 1.0 in upper half
        return midF + t * (maxF - midF);
    }
}

void PeripheralSpeedo::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    
    float hzKmh = ((float)s.currentSpeedoKmh * s.pulsePerKm) / 3600.0f;
    float ppr = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
    float hzRpm = ((float)s.currentSpeedoRpm * ppr) / 60.0f;
    
    // 1. KM/H (Channel 2 / Pin 2) - Only update timer when frequency or active state actually changes
    bool kmhActive = (s.isRunning && s.speedoEnableKmh && hzKmh >= 1.0f);
    if (kmhActive != _lastKmhActive || (kmhActive && fabsf(hzKmh - _lastHzKmh) > 0.05f)) {
        if (kmhActive) {
            ledcAttachPin(PIN_KMH, 2);
            ledcWriteTone(2, hzKmh);
        } else {
            ledcWriteTone(2, 0);
            ledcWrite(2, 0);
            ledcDetachPin(PIN_KMH);
            pinMode(PIN_KMH, OUTPUT);
            digitalWrite(PIN_KMH, LOW);
        }
        _lastKmhActive = kmhActive;
        _lastHzKmh = kmhActive ? hzKmh : 0.0f;
    }
    
    // 2. RPM (Channel 1 / Pin 4) - Only update timer when frequency or active state actually changes
    bool rpmActive = (s.isRunning && s.speedoEnableRpm && hzRpm >= 1.0f);
    if (rpmActive != _lastRpmActive || (rpmActive && fabsf(hzRpm - _lastHzRpm) > 0.05f)) {
        if (rpmActive) {
            ledcAttachPin(PIN_RPM, 1);
            ledcWriteTone(1, hzRpm);
        } else {
            ledcWriteTone(1, 0);
            ledcWrite(1, 0);
            ledcDetachPin(PIN_RPM);
            pinMode(PIN_RPM, OUTPUT);
            digitalWrite(PIN_RPM, LOW);
        }
        _lastRpmActive = rpmActive;
        _lastHzRpm = rpmActive ? hzRpm : 0.0f;
    }
    
    // Convert 0-100% to 8-bit PWM (0-255) with 3-Point Calibration & thermal/non-linear compensation
    uint32_t dutyTemp = 0;
    uint32_t dutyFuel = 0;
    float correctedTempFrac = 0.0f;
    float correctedFuelFrac = 0.0f;
    
    bool tempActive = (s.isRunning && s.speedoEnableTemp);
    if (tempActive) {
        float fraction = (float)s.currentSpeedoTempPercent / 100.0f;
        if (fraction < 0.0f) fraction = 0.0f;
        if (fraction > 1.0f) fraction = 1.0f;
        float shapedFrac = (s.speedoGaugeCurve == 0) ? sqrtf(fraction) : fraction;
        correctedTempFrac = apply3PointCal(shapedFrac, s.speedoTempCalMin, s.speedoTempCalMid, s.speedoTempCalMax);
        if (correctedTempFrac < 0.0f) correctedTempFrac = 0.0f;
        if (correctedTempFrac > 1.0f) correctedTempFrac = 1.0f;
        dutyTemp = (uint32_t)(correctedTempFrac * 255.0f);
    }
    
    bool fuelActive = (s.isRunning && s.speedoEnableFuel);
    if (fuelActive) {
        float fraction = (float)s.currentSpeedoFuelPercent / 100.0f;
        if (fraction < 0.0f) fraction = 0.0f;
        if (fraction > 1.0f) fraction = 1.0f;
        float shapedFrac = (s.speedoGaugeCurve == 0) ? sqrtf(fraction) : fraction;
        correctedFuelFrac = apply3PointCal(shapedFrac, s.speedoFuelCalMin, s.speedoFuelCalMid, s.speedoFuelCalMax);
        if (correctedFuelFrac < 0.0f) correctedFuelFrac = 0.0f;
        if (correctedFuelFrac > 1.0f) correctedFuelFrac = 1.0f;
        dutyFuel = (uint32_t)(correctedFuelFrac * 255.0f);
    }
    
    // 3. Output standard PWM pins (Pin 13 & Pin 15) - Only write when duty or frequency changes
    int pwmFreq = (s.speedoPwmFreqHz >= 10 && s.speedoPwmFreqHz <= 5000) ? s.speedoPwmFreqHz : 5000;
    if (pwmFreq != _lastPwmFreq) {
        ledcSetup(4, pwmFreq, 8);
        ledcSetup(5, pwmFreq, 8);
        _lastPwmFreq = pwmFreq;
        _lastDutyTemp = 9999; // force re-applying duty cycles
        _lastDutyFuel = 9999;
    }
    
    if (dutyTemp != _lastDutyTemp) {
        ledcWrite(4, dutyTemp);
        _lastDutyTemp = dutyTemp;
    }
    if (dutyFuel != _lastDutyFuel) {
        ledcWrite(5, dutyFuel);
        _lastDutyFuel = dutyFuel;
    }
    
    // 4. Output to Dual MCP4725 DACs (Pure DC 0.00V - 5.00V) - Only write I2C when voltage changes
    float dacFuelVolt = fuelActive ? (correctedFuelFrac * 5.0f) : 0.0f;
    float dacTempVolt = tempActive ? (correctedTempFrac * 5.0f) : 0.0f;
    
    if (fabsf(dacFuelVolt - _lastDacFuelVolt) > 0.01f || fabsf(dacTempVolt - _lastDacTempVolt) > 0.01f) {
        if (s.speedoDacRouting == 3) {
            // Mode 3: Dual DAC (Fuel on 0x60, Temp on 0x61)
            if (_dacFuelFound) writeDac(MCP4725_ADDR_FUEL, dacFuelVolt);
            if (_dacTempFound) writeDac(MCP4725_ADDR_TEMP, dacTempVolt);
        } else if (s.speedoDacRouting == 1) {
            // Mode 1: Single DAC on Fuel (Address 0x60 or fallback 0x61)
            uint8_t targetAddr = _dacFuelFound ? MCP4725_ADDR_FUEL : MCP4725_ADDR_TEMP;
            writeDac(targetAddr, dacFuelVolt);
        } else if (s.speedoDacRouting == 2) {
            // Mode 2: Single DAC on Temp (Address 0x61 or fallback 0x60)
            uint8_t targetAddr = _dacTempFound ? MCP4725_ADDR_TEMP : MCP4725_ADDR_FUEL;
            writeDac(targetAddr, dacTempVolt);
        } else {
            // Mode 0: Dual PWM Standby
            if (_dacFuelFound) writeDac(MCP4725_ADDR_FUEL, 0.0f);
            if (_dacTempFound) writeDac(MCP4725_ADDR_TEMP, 0.0f);
        }
        _lastDacFuelVolt = dacFuelVolt;
        _lastDacTempVolt = dacTempVolt;
    }
    
    _lastTempActive = tempActive;
    _lastFuelActive = fuelActive;
}

void PeripheralSpeedo::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    _sweepController.beginSweep();
    syncHardware();
    s.lastFiredMs = millis();
}

void PeripheralSpeedo::stop() {
    ledcWriteTone(1, 0);
    ledcWrite(1, 0);
    ledcDetachPin(PIN_RPM);
    pinMode(PIN_RPM, OUTPUT);
    digitalWrite(PIN_RPM, LOW);
    
    ledcWriteTone(2, 0);
    ledcWrite(2, 0);
    ledcDetachPin(PIN_KMH);
    pinMode(PIN_KMH, OUTPUT);
    digitalWrite(PIN_KMH, LOW);
    
    ledcWrite(4, 0);
    ledcWrite(5, 0);
    if (_dacFuelFound) writeDac(MCP4725_ADDR_FUEL, 0.0f);
    if (_dacTempFound) writeDac(MCP4725_ADDR_TEMP, 0.0f);
    
    _lastHzRpm = 0.0f;
    _lastHzKmh = 0.0f;
    _lastRpmActive = false;
    _lastKmhActive = false;
    _lastTempActive = false;
    _lastFuelActive = false;
    _lastDutyTemp = 0;
    _lastDutyFuel = 0;
    _lastDacFuelVolt = 0.0f;
    _lastDacTempVolt = 0.0f;
    
    AppSettings& s = _settingsMgr.getSettings();
    bool wasRunning = s.isRunning;
    s.isRunning = false;
    
    if (wasRunning && s.mode == MODE_SWEEP) {
        _sweepController.reset();
        s.currentSpeedoKmh = s.speedoKmh;
        s.currentSpeedoRpm = s.speedoRpm;
        s.currentSpeedoTempPercent = s.speedoTempPercent;
        s.currentSpeedoFuelPercent = s.speedoFuelPercent;
        updateTimerConfig();
    }
}

void PeripheralSpeedo::trigger() {
    start();
}

void PeripheralSpeedo::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
        if (isEditMode && focusIndex == idx) {
            u8g2.setDrawColor(1);
            u8g2.drawBox(x, y, w, h);
            u8g2.setDrawColor(0);
        } else {
            u8g2.setDrawColor(1);
            if (focusIndex == idx) {
                u8g2.drawFrame(x, y, w, h);
            }
        }
    };

    float ppr = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
    
    // Display values: show target value when in edit mode or stopped, live value when running sweep on enabled channels
    int dispKmh = (s.isRunning && s.mode == MODE_SWEEP && !(isEditMode && focusIndex == 1)) 
                  ? (s.speedoEnableKmh ? s.currentSpeedoKmh : 0) 
                  : s.speedoKmh;
    int dispRpm = (s.isRunning && s.mode == MODE_SWEEP && !(isEditMode && focusIndex == 2)) 
                  ? (s.speedoEnableRpm ? s.currentSpeedoRpm : 0) 
                  : s.speedoRpm;
    int dispTemp = (s.isRunning && s.mode == MODE_SWEEP && !(isEditMode && focusIndex == 3)) 
                   ? (s.speedoEnableTemp ? s.currentSpeedoTempPercent : 0) 
                   : s.speedoTempPercent;
    int dispFuel = (s.isRunning && s.mode == MODE_SWEEP && !(isEditMode && focusIndex == 4)) 
                   ? (s.speedoEnableFuel ? s.currentSpeedoFuelPercent : 0) 
                   : s.speedoFuelPercent;

    float liveHzKmh = s.speedoEnableKmh ? (((float)dispKmh * s.pulsePerKm) / 3600.0f) : 0.0f;
    float liveHzRpm = s.speedoEnableRpm ? (((float)dispRpm * ppr) / 60.0f) : 0.0f;
    
    // 2x2 Grid Layout
    u8g2.drawLine(64, 15, 64, 64);
    u8g2.drawLine(0, 39, 128, 39);
    
    // Top Left: KM/H
    drawHighlight(1, 0, 16, 63, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 26);
    u8g2.print("KMH");
    
    // Bold Status ON / OFF (No brackets)
    u8g2.setCursor(34, 26);
    u8g2.print(s.speedoEnableKmh ? "ON" : "OFF");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 38);
    u8g2.print(dispKmh);
    u8g2.setFont(u8g2_font_micro_tr);
    u8g2.setCursor(32, 38);
    u8g2.print((int)liveHzKmh);
    u8g2.print("Hz");

    // Top Right: RPM
    drawHighlight(2, 65, 16, 63, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(67, 26);
    u8g2.print("RPM");
    
    // Bold Status ON / OFF (No brackets)
    u8g2.setCursor(102, 26);
    u8g2.print(s.speedoEnableRpm ? "ON" : "OFF");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(67, 38);
    u8g2.print(dispRpm);
    u8g2.setFont(u8g2_font_micro_tr);
    u8g2.setCursor(102, 38);
    u8g2.print((int)liveHzRpm);
    u8g2.print("Hz");

    // Bottom Left: TEMP
    drawHighlight(3, 0, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 50);
    u8g2.print("TEMP");
    
    // Bold Status ON / OFF (No brackets)
    u8g2.setCursor(38, 50);
    u8g2.print(s.speedoEnableTemp ? "ON" : "OFF");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 62);
    u8g2.print(dispTemp);
    u8g2.print("%");

    // Bottom Right: FUEL
    drawHighlight(4, 65, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(67, 50);
    u8g2.print("FUEL");
    
    // Bold Status ON / OFF (No brackets)
    u8g2.setCursor(102, 50);
    u8g2.print(s.speedoEnableFuel ? "ON" : "OFF");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(67, 62);
    u8g2.print(dispFuel);
    u8g2.print("%");
    
    u8g2.setDrawColor(1);
}

void PeripheralSpeedo::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    
    if (focusIndex == 1) { // KMH
        s.speedoKmh += (diff * s.speedoKmhStep);
        if (s.speedoKmh < 0) s.speedoKmh = 0;
        if (s.speedoKmh > 300) s.speedoKmh = 300;
        if (s.mode != MODE_SWEEP || !s.isRunning) s.currentSpeedoKmh = s.speedoKmh;
    } else if (focusIndex == 2) { // RPM
        s.speedoRpm += (diff * s.speedoRpmStep);
        if (s.speedoRpm < 0) s.speedoRpm = 0;
        if (s.speedoRpm > 15000) s.speedoRpm = 15000;
        if (s.mode != MODE_SWEEP || !s.isRunning) s.currentSpeedoRpm = s.speedoRpm;
    } else if (focusIndex == 3) { // TEMP
        s.speedoTempPercent += (diff * s.speedoTempStep);
        if (s.speedoTempPercent < 0) s.speedoTempPercent = 0;
        if (s.speedoTempPercent > 100) s.speedoTempPercent = 100;
        if (s.mode != MODE_SWEEP || !s.isRunning) s.currentSpeedoTempPercent = s.speedoTempPercent;
    } else if (focusIndex == 4) { // FUEL
        s.speedoFuelPercent += (diff * s.speedoFuelStep);
        if (s.speedoFuelPercent < 0) s.speedoFuelPercent = 0;
        if (s.speedoFuelPercent > 100) s.speedoFuelPercent = 100;
        if (s.mode != MODE_SWEEP || !s.isRunning) s.currentSpeedoFuelPercent = s.speedoFuelPercent;
    }
    
    _settingsMgr.save();
    updateTimerConfig();
}

int PeripheralSpeedo::getMaxFocusIndex() const {
    return 4;
}

bool PeripheralSpeedo::shouldShowMenuItem(int menuIndex) {
    // Hide Coil RPM Step (4)
    if (menuIndex == 4) return false;
    return true;
}

const char* PeripheralSpeedo::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralSpeedo::cycleRunMode(AppSettings& s, int direction) {
    if (s.mode == MODE_CONTINUOUS) s.mode = MODE_SWEEP;
    else s.mode = MODE_CONTINUOUS;
}

void PeripheralSpeedo::handleDashboardEncoder(int diff, AppSettings& s) {
    // Directly adjust KM/H when encoder is turned from dashboard
    s.speedoKmh += (diff * s.speedoKmhStep);
    if (s.speedoKmh < 0) s.speedoKmh = 0;
    if (s.speedoKmh > 300) s.speedoKmh = 300;
    if (s.mode != MODE_SWEEP || !s.isRunning) s.currentSpeedoKmh = s.speedoKmh;
    _settingsMgr.save();
    updateTimerConfig();
}
