#include "PeripheralSpeedo.h"
#include "config/Pins.h"
#include <Wire.h>

#define MCP4725_ADDR_FUEL 0x60 // Jumper A0 to GND
#define MCP4725_ADDR_TEMP 0x61 // Jumper A0 to VCC

PeripheralSpeedo::PeripheralSpeedo(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController),
      _dacFuelFound(false), _dacTempFound(false), _lastDacPollMs(0) {}

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
    
    // LEDC Channel 4 and 5 for Temp and Fuel PWM (5kHz, 8-bit resolution)
    // They share Timer 2, leaving Timer 0 for RPM (Ch 1) and Timer 1 for KMH (Ch 2)
    ledcSetup(4, 5000, 8);
    ledcAttachPin(PIN_PWM_TEMP, 4);
    ledcWrite(4, 0);
    
    ledcSetup(5, 5000, 8);
    ledcAttachPin(PIN_PWM_FUEL, 5);
    ledcWrite(5, 0);
    
    // Timer 1 and 2 for LEDC (ESP32)
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
    
    // Periodically re-detect DACs if any disconnected
    uint32_t now = millis();
    if (now - _lastDacPollMs > 3000) {
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
        if (s.isRunning) {
            updateTimerConfig();
        }
    }
}

void PeripheralSpeedo::syncHardware() {
    updateTimerConfig();
}

void PeripheralSpeedo::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    
    float hzKmh = ((float)s.currentSpeedoKmh * s.pulsePerKm) / 3600.0f;
    float ppr = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
    float hzRpm = ((float)s.currentSpeedoRpm * ppr) / 60.0f;
    
    // KM/H (Channel 2 / Pin 2)
    if (s.isRunning && s.speedoEnableKmh && hzKmh > 1.0f) {
        ledcWriteTone(2, hzKmh);
    } else {
        ledcWriteTone(2, 0);
        ledcWrite(2, 0);
    }
    
    // RPM (Channel 1 / Pin 4)
    if (s.isRunning && s.speedoEnableRpm && hzRpm > 1.0f) {
        ledcWriteTone(1, hzRpm);
    } else {
        ledcWriteTone(1, 0);
        ledcWrite(1, 0);
    }
    
    // Convert 0-100% to 8-bit PWM (0-255) with thermal/non-linear compensation
    uint32_t dutyTemp = 0;
    uint32_t dutyFuel = 0;
    float correctedTempFrac = 0.0f;
    float correctedFuelFrac = 0.0f;
    
    if (s.isRunning && s.speedoEnableTemp) {
        float fraction = (float)s.currentSpeedoTempPercent / 100.0f;
        if (fraction < 0.0f) fraction = 0.0f;
        if (fraction > 1.0f) fraction = 1.0f;
        correctedTempFrac = (s.speedoGaugeCurve == 0) ? sqrtf(fraction) : fraction;
        dutyTemp = (uint32_t)(correctedTempFrac * 255.0f);
    }
    
    if (s.isRunning && s.speedoEnableFuel) {
        float fraction = (float)s.currentSpeedoFuelPercent / 100.0f;
        if (fraction < 0.0f) fraction = 0.0f;
        if (fraction > 1.0f) fraction = 1.0f;
        correctedFuelFrac = (s.speedoGaugeCurve == 0) ? sqrtf(fraction) : fraction;
        dutyFuel = (uint32_t)(correctedFuelFrac * 255.0f);
    }
    
    // 1. Output standard PWM pins (Pin 13 & Pin 15)
    ledcWrite(4, dutyTemp);
    ledcWrite(5, dutyFuel);
    
    // 2. Output to Dual MCP4725 DACs (Pure DC 0.00V - 5.00V)
    float dacFuelVolt = (s.isRunning && s.speedoEnableFuel) ? (correctedFuelFrac * 5.0f) : 0.0f;
    float dacTempVolt = (s.isRunning && s.speedoEnableTemp) ? (correctedTempFrac * 5.0f) : 0.0f;
    
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
}

void PeripheralSpeedo::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    _sweepController.beginSweep();
    updateTimerConfig();
    s.lastFiredMs = millis();
}

void PeripheralSpeedo::stop() {
    ledcWrite(1, 0);
    ledcWrite(2, 0);
    ledcWrite(4, 0);
    ledcWrite(5, 0);
    if (_dacFuelFound) writeDac(MCP4725_ADDR_FUEL, 0.0f);
    if (_dacTempFound) writeDac(MCP4725_ADDR_TEMP, 0.0f);
    
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
