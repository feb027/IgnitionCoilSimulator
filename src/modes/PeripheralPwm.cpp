#include "PeripheralPwm.h"
#include "config/Pins.h"

PeripheralPwm::PeripheralPwm(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController) {}

void PeripheralPwm::begin() {
    pinMode(PIN_SOLENOID, OUTPUT);
    digitalWrite(PIN_SOLENOID, LOW);
    ledcSetup(0, 100, 8); // Channel 0, default 100Hz, 8-bit
    ledcAttachPin(PIN_SOLENOID, 0);
    ledcWrite(0, 0);
}

void PeripheralPwm::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
    if (s.isRunning) {
        s.realCurrentA = 2.0f * ((float)s.dutyCycle / 100.0f);
    } else {
        s.realCurrentA = 0.0f;
    }
}

void PeripheralPwm::syncHardware() {
    updateTimerConfig();
}

void PeripheralPwm::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    int activeRpm = (s.mode == MODE_SWEEP && s.isRunning) ? s.currentRpm : s.rpm;
    
    if (activeRpm > 12000) activeRpm = 12000;
    if (activeRpm < 60) activeRpm = 60; // Min 1 Hz
    
    uint32_t freqHz = activeRpm / 60;
    if (freqHz < 1) freqHz = 1;
    if (freqHz > 5000) freqHz = 5000;
    
    ledcSetup(0, freqHz, 8);
    
    if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
    if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
    
    uint32_t dutyVal = (uint32_t)(s.dutyCycle * 255.0f / 100.0f);
    if (s.isRunning) {
        ledcWrite(0, dutyVal);
    } else {
        ledcWrite(0, 0);
    }
    
    uint32_t periodTicks = 1000000 / freqHz;
    uint32_t dwellTicks = (uint32_t)(periodTicks * (s.dutyCycle / 100.0f));
    s.dwellMs = (float)dwellTicks / 1000.0f;
}

void PeripheralPwm::start() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.mode == MODE_SWEEP) _sweepController.beginSweep();
    s.isRunning = true;
    s.lastFiredMs = millis();
    updateTimerConfig();
}

void PeripheralPwm::stop() {
    ledcWrite(0, 0);
    digitalWrite(PIN_SOLENOID, LOW);
    
    AppSettings& s = _settingsMgr.getSettings();
    bool wasRunning = s.isRunning;
    s.isRunning = false;
    
    if (wasRunning && s.mode == MODE_SWEEP) {
        _sweepController.reset();
        s.currentRpm = s.rpm;
        updateTimerConfig();
    }
}

void PeripheralPwm::trigger() {
    start();
}

void PeripheralPwm::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
        if (isEditMode && focusIndex == idx) {
            u8g2.setDrawColor(1);
            u8g2.drawBox(x, y, w, h);
            u8g2.setDrawColor(0);
        } else {
            u8g2.setDrawColor(1);
        }
    };
    
    u8g2.drawLine(0, 39, 128, 39);
    u8g2.drawLine(64, 39, 64, 64);
    
    // RPM
    drawHighlight(1, 0, 16, 128, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 25);
    u8g2.print("RPM");
    u8g2.setFont(u8g2_font_helvB18_tr);
    int activeRpm = (s.mode == MODE_SWEEP && s.isRunning) ? s.currentRpm : s.rpm;
    String rpmStr = String(activeRpm);
    int rpmWidth = u8g2.getStrWidth(rpmStr.c_str());
    u8g2.setCursor((128 - rpmWidth) / 2, 36);
    u8g2.print(rpmStr);
    
    // DWELL
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 49);
    u8g2.print("DWELL");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 61);
    u8g2.print(s.dwellMs, 1);
    u8g2.print("ms");
    
    // DUTY (Highlight here for PWM mode)
    drawHighlight(2, 65, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(68, 49);
    u8g2.print("DUTY");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 61);
    u8g2.print(s.dutyCycle, 1);
    u8g2.print("%");
    u8g2.setDrawColor(1);
}

void PeripheralPwm::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // RPM
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 12000) s.rpm = 12000;
    } else if (focusIndex == 2) { // DUTY
        s.dutyCycle += (diff * 1.0f);
        if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
        if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
    }
    
    if (s.isRunning && focusIndex > 0) {
        trigger();
    } else if (!s.isRunning && focusIndex > 0) {
        updateTimerConfig();
    }
}

bool PeripheralPwm::shouldShowMenuItem(int menuIndex) {
    // Hide Speedo specific pages (PPK: 1, Tacho PPR: 2, Speedo Steps: 5-8)
    if (menuIndex == 1 || menuIndex == 2) return false;
    if (menuIndex >= 5 && menuIndex <= 8) return false;
    return true;
}

const char* PeripheralPwm::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralPwm::cycleRunMode(AppSettings& s, int direction) {
    int nextMode = (s.mode + direction) % 4;
    if (nextMode < 0) nextMode += 4;
    s.mode = (CoilMode)nextMode;
}

void PeripheralPwm::handleDashboardEncoder(int diff, AppSettings& s) {
    if (s.isRunning && s.mode == MODE_CONTINUOUS) {
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 12000) s.rpm = 12000;
        stop();
        start();
    }
}

int PeripheralPwm::getMaxFocusIndex() const {
    return 2;
}
