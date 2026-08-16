#include "PeripheralStepperUni.h"
#include "config/Pins.h"
#include <Arduino.h>

static const uint8_t uniStepSequence[4][4] = {
    {HIGH, LOW,  HIGH, LOW},  // Step 1
    {LOW,  HIGH, HIGH, LOW},  // Step 2
    {LOW,  HIGH, LOW,  HIGH}, // Step 3
    {HIGH, LOW,  LOW,  HIGH}  // Step 4
};

PeripheralStepperUni::PeripheralStepperUni(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _currentStep(0), _lastStepTime(0), _autoDirection(1), _fanAngle(0) {}

void PeripheralStepperUni::begin() {
    pinMode(PIN_STEP_A_PLUS, OUTPUT);
    pinMode(PIN_STEP_A_MINUS, OUTPUT);
    pinMode(PIN_STEP_B_PLUS, OUTPUT);
    pinMode(PIN_STEP_B_MINUS, OUTPUT);
    
    digitalWrite(PIN_STEP_A_PLUS, LOW);
    digitalWrite(PIN_STEP_A_MINUS, LOW);
    digitalWrite(PIN_STEP_B_PLUS, LOW);
    digitalWrite(PIN_STEP_B_MINUS, LOW);
}

void PeripheralStepperUni::writeStep(int stepIndex) {
    digitalWrite(PIN_STEP_A_PLUS, uniStepSequence[stepIndex][0]);
    digitalWrite(PIN_STEP_A_MINUS, uniStepSequence[stepIndex][1]);
    digitalWrite(PIN_STEP_B_PLUS, uniStepSequence[stepIndex][2]);
    digitalWrite(PIN_STEP_B_MINUS, uniStepSequence[stepIndex][3]);
}

void PeripheralStepperUni::step(int direction) {
    _currentStep += direction;
    if (_currentStep > 3) _currentStep = 0;
    if (_currentStep < 0) _currentStep = 3;
    
    writeStep(_currentStep);
    
    _fanAngle += direction * 30.0f;
    if (_fanAngle >= 360.0f) _fanAngle -= 360.0f;
    if (_fanAngle < 0.0f) _fanAngle += 360.0f;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.lastFiredMs = millis();
    s.stepperSpinDir = direction;
}

void PeripheralStepperUni::setSpinDirection(int direction) {
    _autoDirection = direction;
    AppSettings& s = _settingsMgr.getSettings();
    s.stepperSpinDir = direction;
}

void PeripheralStepperUni::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    if (s.isRunning && _autoDirection != 0) {
        uint32_t now = millis();
        uint32_t delayMs = map(s.stepperSpeed, 1, 100, 50, 8);
        if (delayMs < 8) delayMs = 8;
        
        if (now - _lastStepTime >= delayMs) {
            _lastStepTime = now;
            step(_autoDirection);
        }
    } else {
        if (millis() - s.lastFiredMs > 200) {
            digitalWrite(PIN_STEP_A_PLUS, LOW);
            digitalWrite(PIN_STEP_A_MINUS, LOW);
            digitalWrite(PIN_STEP_B_PLUS, LOW);
            digitalWrite(PIN_STEP_B_MINUS, LOW);
            s.stepperSpinDir = 0;
        }
    }
}

void PeripheralStepperUni::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    if (_autoDirection == 0) _autoDirection = 1;
    _lastStepTime = millis();
}

void PeripheralStepperUni::stop() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    _autoDirection = 0;
    
    digitalWrite(PIN_STEP_A_PLUS, LOW);
    digitalWrite(PIN_STEP_A_MINUS, LOW);
    digitalWrite(PIN_STEP_B_PLUS, LOW);
    digitalWrite(PIN_STEP_B_MINUS, LOW);
}

void PeripheralStepperUni::trigger() {
    start();
}

void PeripheralStepperUni::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Draw motor fan animation
    u8g2.drawCircle(64, 38, 15, U8G2_DRAW_ALL);
    
    int center_x = 64;
    int center_y = 38;
    int radius = 13;
    
    for(int i=0; i<3; i++) {
        float angle = (_fanAngle + i * 120.0f) * PI / 180.0f;
        int x2 = center_x + radius * cos(angle);
        int y2 = center_y + radius * sin(angle);
        u8g2.drawLine(center_x, center_y, x2, y2);
    }
    
    // Draw Speed Box
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
    
    drawHighlight(1, 0, 16, 45, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(3, 25);
    u8g2.print("SPEED");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(3, 44);
    u8g2.print(s.stepperSpeed);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.print("%");

    // Right Box: Direction
    drawHighlight(2, 83, 16, 45, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(86, 25);
    u8g2.print("DIR");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(86, 44);
    u8g2.print(_autoDirection >= 0 ? "CW" : "CCW");
    
    // Bottom Status Line
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    u8g2.print("STEPPER 4-PIN CONT");
    
    u8g2.setCursor(95, 60);
    u8g2.print(s.isRunning ? "[SPIN]" : "[STOP]");
}

int PeripheralStepperUni::getMaxFocusIndex() const {
    return 2;
}

void PeripheralStepperUni::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // Speed
        s.stepperSpeed += (diff * 5);
        if (s.stepperSpeed > 100) s.stepperSpeed = 100;
        if (s.stepperSpeed < 1) s.stepperSpeed = 1;
    } else if (focusIndex == 2) { // Direction
        _autoDirection = (_autoDirection == 1) ? -1 : 1;
        s.stepperSpinDir = _autoDirection;
    }
    _settingsMgr.save();
}

void PeripheralStepperUni::syncHardware() {}

bool PeripheralStepperUni::shouldShowMenuItem(int menuIndex) {
    if (menuIndex == 0 || menuIndex == 9) return true;
    return false;
}

const char* PeripheralStepperUni::getModeString() {
    return "STEPPER KONTINU";
}

void PeripheralStepperUni::cycleRunMode(AppSettings& s, int direction) {}

void PeripheralStepperUni::handleDashboardEncoder(int diff, AppSettings& s) {
    s.stepperSpeed += (diff * 5);
    if (s.stepperSpeed < 1) s.stepperSpeed = 1;
    if (s.stepperSpeed > 100) s.stepperSpeed = 100;
    _settingsMgr.save();
}
