#include "PeripheralHallDac.h"
#include "config/Pins.h"
#include <Arduino.h>

static const char* profileNames[] = {
    "FREE VADJ", "TPS PEDAL", "MAP SENSOR", "AC PRESSURE", 
    "FUEL RAIL", "ECT TEMP", "O2 SENSOR", "CKP HALL", "VSS SPEED"
};

PeripheralHallDac::PeripheralHallDac(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController),
      _i2cAddr(MCP4725_I2C_ADDR), _isFound(false),
      _lastWaveTime(0), _sweepVolt(0.5f), _sweepDir(1), _sineAngle(0.0f) {}

bool PeripheralHallDac::detectDevice() {
    Wire.beginTransmission(MCP4725_I2C_ADDR);
    if (Wire.endTransmission() == 0) {
        _i2cAddr = MCP4725_I2C_ADDR;
        _isFound = true;
        return true;
    }
    
    Wire.beginTransmission(MCP4725_I2C_ADDR_ALT);
    if (Wire.endTransmission() == 0) {
        _i2cAddr = MCP4725_I2C_ADDR_ALT;
        _isFound = true;
        return true;
    }
    
    _isFound = false;
    return false;
}

void PeripheralHallDac::begin() {
    _isFound = detectDevice();
    AppSettings& s = _settingsMgr.getSettings();
    s.hallDacConnected = _isFound;
    
    // Set initial safe 0.0V output
    writeVoltage(0.0f);
}

void PeripheralHallDac::writeDac(uint16_t dacValue) {
    if (!_isFound) {
        if (millis() % 2000 == 0) {
            _isFound = detectDevice();
            _settingsMgr.getSettings().hallDacConnected = _isFound;
        }
        if (!_isFound) return;
    }
    
    if (dacValue > 4095) dacValue = 4095;
    
    Wire.beginTransmission(_i2cAddr);
    Wire.write((dacValue >> 8) & 0x0F);
    Wire.write(dacValue & 0xFF);
    Wire.endTransmission();
}

void PeripheralHallDac::writeVoltage(float volts) {
    if (volts < 0.0f) volts = 0.0f;
    if (volts > 5.00f) volts = 5.00f;
    
    uint16_t dacVal = (uint16_t)((volts / 5.00f) * 4095.0f);
    writeDac(dacVal);
}

void PeripheralHallDac::setVoltage(float volts) {
    AppSettings& s = _settingsMgr.getSettings();
    s.hallDacVoltage = volts;
    if (s.hallDacWaveform == 0 && s.isRunning) {
        writeVoltage(volts);
    }
}

void PeripheralHallDac::update() {
    AppSettings& s = _settingsMgr.getSettings();
    uint32_t now = millis();
    
    if (!s.isRunning) return;
    
    // 0: DC CONSTANT VOLTAGE (VADJ)
    if (s.hallDacWaveform == 0) {
        return;
    }
    
    // 1: VOLTAGE SWEEP RAMP (0.50V <-> 4.50V for TPS / MAP simulation)
    if (s.hallDacWaveform == 1) {
        if (now - _lastWaveTime >= 20) {
            _lastWaveTime = now;
            float step = 0.05f;
            if (_sweepDir == 1) {
                _sweepVolt += step;
                if (_sweepVolt >= 4.50f) {
                    _sweepVolt = 4.50f;
                    _sweepDir = -1;
                }
            } else {
                _sweepVolt -= step;
                if (_sweepVolt <= 0.50f) {
                    _sweepVolt = 0.50f;
                    _sweepDir = 1;
                }
            }
            writeVoltage(_sweepVolt);
        }
        return;
    }
    
    // 2: HALL SQUARE WAVE PULSES (0.0V / 5.0V at hallDacFreqHz)
    if (s.hallDacWaveform == 2) {
        int freq = s.hallDacFreqHz > 0 ? s.hallDacFreqHz : 50;
        uint32_t halfPeriodMs = 1000 / (freq * 2);
        if (halfPeriodMs < 2) halfPeriodMs = 2;
        
        if (now - _lastWaveTime >= halfPeriodMs) {
            _lastWaveTime = now;
            static bool toggle = false;
            toggle = !toggle;
            writeVoltage(toggle ? s.hallDacVoltage : 0.0f);
        }
        return;
    }
    
    // 3: ANALOG SINE WAVE (0.5V to 4.5V Sine at hallDacFreqHz)
    if (s.hallDacWaveform == 3) {
        if (now - _lastWaveTime >= 10) {
            _lastWaveTime = now;
            int freq = s.hallDacFreqHz > 0 ? s.hallDacFreqHz : 10;
            _sineAngle += (float)freq * 0.0628f;
            if (_sineAngle >= 6.283f) _sineAngle -= 6.283f;
            
            float sineVal = sin(_sineAngle);
            float volt = 2.50f + (sineVal * 2.00f);
            writeVoltage(volt);
        }
        return;
    }
}

void PeripheralHallDac::syncHardware() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.isRunning) {
        if (s.hallDacWaveform == 0) {
            writeVoltage(s.hallDacVoltage);
        }
    } else {
        writeVoltage(0.0f);
    }
}

void PeripheralHallDac::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    _sweepVolt = 0.5f;
    _sweepDir = 1;
    _sineAngle = 0.0f;
    _lastWaveTime = millis();
    
    if (s.hallDacWaveform == 0) {
        writeVoltage(s.hallDacVoltage);
    }
}

void PeripheralHallDac::stop() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    writeVoltage(0.0f);
}

void PeripheralHallDac::trigger() {
    start();
}

void PeripheralHallDac::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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

    // Left Box: Output Voltage / Frequency (Focus 1)
    drawHighlight(1, 0, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(3, 25);
    if (s.hallDacWaveform == 2 || s.hallDacWaveform == 3) {
        u8g2.print("FREQ (HERTZ)");
        u8g2.setFont(u8g2_font_helvB10_tr);
        u8g2.setCursor(3, 44);
        u8g2.print(s.hallDacFreqHz);
        u8g2.setFont(u8g2_font_5x7_tr);
        u8g2.print(" Hz");
    } else {
        u8g2.print("OUT VOLTAGE");
        u8g2.setFont(u8g2_font_helvB10_tr);
        u8g2.setCursor(3, 44);
        u8g2.print(s.hallDacVoltage, 2);
        u8g2.setFont(u8g2_font_5x7_tr);
        u8g2.print(" V");
    }

    // Right Box: Sensor Profile (Focus 2)
    drawHighlight(2, 65, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(68, 25);
    u8g2.print("PROFILE");
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(68, 38);
    int p = s.hallDacProfile;
    if (p < 0 || p > 8) p = 0;
    u8g2.print(profileNames[p]);
    
    u8g2.setCursor(68, 46);
    if (s.hallDacWaveform == 0) u8g2.print("[DC]");
    else if (s.hallDacWaveform == 1) u8g2.print("[SWEEP]");
    else if (s.hallDacWaveform == 2) u8g2.print("[SQ WAVE]");
    else u8g2.print("[SINE]");
    
    // Bottom Status Line
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    if (_isFound) {
        u8g2.print("MCP4725: OK [0x");
        u8g2.print(_i2cAddr, HEX);
        u8g2.print("]");
    } else {
        u8g2.print("MCP4725: NOT FOUND");
    }
    
    u8g2.setCursor(95, 60);
    u8g2.print(s.isRunning ? "[OUT ON]" : "[OFF]");
}

int PeripheralHallDac::getMaxFocusIndex() const {
    return 2;
}

void PeripheralHallDac::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // Voltage or Frequency
        if (s.hallDacWaveform == 2 || s.hallDacWaveform == 3) {
            s.hallDacFreqHz += (diff * 5);
            if (s.hallDacFreqHz < 1) s.hallDacFreqHz = 1;
            if (s.hallDacFreqHz > 500) s.hallDacFreqHz = 500;
        } else {
            s.hallDacVoltage += (diff * 0.05f);
            if (s.hallDacVoltage < 0.0f) s.hallDacVoltage = 0.0f;
            if (s.hallDacVoltage > 5.00f) s.hallDacVoltage = 5.00f;
            if (s.isRunning && s.hallDacWaveform == 0) writeVoltage(s.hallDacVoltage);
        }
    } else if (focusIndex == 2) { // Profile Switch
        s.hallDacProfile += diff;
        if (s.hallDacProfile < 0) s.hallDacProfile = 8;
        if (s.hallDacProfile > 8) s.hallDacProfile = 0;
        
        // Auto-configure waveform and voltage based on selected profile
        switch (s.hallDacProfile) {
            case 0: s.hallDacWaveform = 0; break; // Free VADJ
            case 1: s.hallDacWaveform = 0; s.hallDacVoltage = 0.75f; break; // TPS Idle
            case 2: s.hallDacWaveform = 0; s.hallDacVoltage = 2.50f; break; // MAP 1-bar
            case 3: s.hallDacWaveform = 0; s.hallDacVoltage = 2.50f; break; // AC Press
            case 4: s.hallDacWaveform = 0; s.hallDacVoltage = 1.80f; break; // Fuel Rail
            case 5: s.hallDacWaveform = 0; s.hallDacVoltage = 0.80f; break; // ECT 90C
            case 6: s.hallDacWaveform = 0; s.hallDacVoltage = 0.45f; break; // O2 Stoich
            case 7: s.hallDacWaveform = 2; s.hallDacFreqHz = 50; break;    // CKP Hall
            case 8: s.hallDacWaveform = 2; s.hallDacFreqHz = 66; break;    // VSS Speed
        }
        if (s.isRunning && s.hallDacWaveform == 0) writeVoltage(s.hallDacVoltage);
    }
    _settingsMgr.save();
}

bool PeripheralHallDac::shouldShowMenuItem(int menuIndex) {
    if (menuIndex == 0 || menuIndex == 9) return true;
    return false;
}

const char* PeripheralHallDac::getModeString() {
    return "HALL & VADJ DAC";
}

void PeripheralHallDac::cycleRunMode(AppSettings& s, int direction) {}

void PeripheralHallDac::handleDashboardEncoder(int diff, AppSettings& s) {
    s.hallDacVoltage += (diff * 0.05f);
    if (s.hallDacVoltage < 0.0f) s.hallDacVoltage = 0.0f;
    if (s.hallDacVoltage > 5.00f) s.hallDacVoltage = 5.00f;
    _settingsMgr.save();
    if (s.isRunning && s.hallDacWaveform == 0) writeVoltage(s.hallDacVoltage);
}
