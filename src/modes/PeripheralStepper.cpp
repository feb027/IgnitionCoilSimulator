#include "PeripheralStepper.h"
#include "config/Pins.h"
#include <Arduino.h>

// Full-step sequence (2 phases on) for maximum torque
// A+, A-, B+, B-
static const uint8_t stepSequence[4][4] = {
    {HIGH, LOW,  HIGH, LOW},  // Step 1: 1010
    {LOW,  HIGH, HIGH, LOW},  // Step 2: 0110
    {LOW,  HIGH, LOW,  HIGH}, // Step 3: 0101
    {HIGH, LOW,  LOW,  HIGH}  // Step 4: 1001
};

PeripheralStepper::PeripheralStepper(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _sweepController(settingsMgr),
      _currentStep(0), _lastStepTime(0), _autoDirection(0), _fanAngle(0) {
}

void PeripheralStepper::begin() {
    pinMode(PIN_STEP_A_PLUS, OUTPUT);
    pinMode(PIN_STEP_A_MINUS, OUTPUT);
    pinMode(PIN_STEP_B_PLUS, OUTPUT);
    pinMode(PIN_STEP_B_MINUS, OUTPUT);
    
    digitalWrite(PIN_STEP_A_PLUS, LOW);
    digitalWrite(PIN_STEP_A_MINUS, LOW);
    digitalWrite(PIN_STEP_B_PLUS, LOW);
    digitalWrite(PIN_STEP_B_MINUS, LOW);
}

void PeripheralStepper::writeStep(int stepIndex) {
    digitalWrite(PIN_STEP_A_PLUS, stepSequence[stepIndex][0]);
    digitalWrite(PIN_STEP_A_MINUS, stepSequence[stepIndex][1]);
    digitalWrite(PIN_STEP_B_PLUS, stepSequence[stepIndex][2]);
    digitalWrite(PIN_STEP_B_MINUS, stepSequence[stepIndex][3]);
}

void PeripheralStepper::step(int direction) {
    _currentStep += direction;
    if (_currentStep > 3) _currentStep = 0;
    if (_currentStep < 0) _currentStep = 3;
    
    writeStep(_currentStep);
    
    _fanAngle += direction * 30.0f;
    if (_fanAngle >= 360.0f) _fanAngle -= 360.0f;
    if (_fanAngle < 0.0f) _fanAngle += 360.0f;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.lastFiredMs = millis();
}

void PeripheralStepper::setSpinDirection(int direction) {
    _autoDirection = direction;
}

void PeripheralStepper::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    if (s.isRunning && _autoDirection != 0) {
        uint32_t now = millis();
        uint32_t delayMs = map(s.stepperSpeed, 1, 100, 50, 2);
        if (delayMs < 2) delayMs = 2; // Mechanical limit
        
        if (now - _lastStepTime >= delayMs) {
            _lastStepTime = now;
            step(_autoDirection);
        }
    } else {
        // If not running, ensure coils are powered off to prevent overheating
        // (Unless we want holding torque, but for IACV we usually turn off to avoid burning)
        digitalWrite(PIN_STEP_A_PLUS, LOW);
        digitalWrite(PIN_STEP_A_MINUS, LOW);
        digitalWrite(PIN_STEP_B_PLUS, LOW);
        digitalWrite(PIN_STEP_B_MINUS, LOW);
    }
}

void PeripheralStepper::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    _lastStepTime = millis();
}

void PeripheralStepper::stop() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    _autoDirection = 0;
    
    digitalWrite(PIN_STEP_A_PLUS, LOW);
    digitalWrite(PIN_STEP_A_MINUS, LOW);
    digitalWrite(PIN_STEP_B_PLUS, LOW);
    digitalWrite(PIN_STEP_B_MINUS, LOW);
}

void PeripheralStepper::trigger() {
    start();
}

void PeripheralStepper::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Draw motor fan animation
    u8g2.drawCircle(64, 40, 15, U8G2_DRAW_ALL);
    
    // Draw 3 fan blades based on _fanAngle
    int center_x = 64;
    int center_y = 40;
    int radius = 13;
    
    for(int i=0; i<3; i++) {
        float angle = (_fanAngle + i * 120.0f) * PI / 180.0f;
        int x2 = center_x + radius * cos(angle);
        int y2 = center_y + radius * sin(angle);
        u8g2.drawLine(center_x, center_y, x2, y2);
    }
    
    // Draw Coils
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(25, 25); u8g2.print("A+");
    u8g2.setCursor(25, 60); u8g2.print("A-");
    u8g2.setCursor(95, 25); u8g2.print("B+");
    u8g2.setCursor(95, 60); u8g2.print("B-");
    
    // Draw Speed
    auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
        if (isEditMode && focusIndex == idx) {
            u8g2.setDrawColor(1);
            u8g2.drawBox(x, y, w, h);
            u8g2.setDrawColor(0);
        } else {
            u8g2.setDrawColor(1);
        }
    };
    
    drawHighlight(1, 40, 75, 50, 15);
    u8g2.setCursor(42, 86);
    u8g2.print("SPD: ");
    u8g2.print(s.stepperSpeed);
    u8g2.setDrawColor(1);
}

int PeripheralStepper::getMaxFocusIndex() const {
    return 1; // 0 = MODE, 1 = SPEED
}

void PeripheralStepper::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    
    // If we are NOT in edit mode and the dashboard is just focused, 
    // rotating the encoder directly steps the motor!
    if (focusIndex == 0 && diff != 0) {
        // Physical jogging
        step(diff > 0 ? 1 : -1);
        return;
    }
    
    if (focusIndex == 1) {
        s.stepperSpeed += diff * 5;
        if (s.stepperSpeed > 100) s.stepperSpeed = 100;
        if (s.stepperSpeed < 1) s.stepperSpeed = 1;
    }
}

void PeripheralStepper::syncHardware() {
    // No hardware timers for stepper, handled in update() loop
}
