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
      _currentStep(0), _lastStepTime(0) {
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
    
    AppSettings& s = _settingsMgr.getSettings();
    s.lastFiredMs = millis();
}

void PeripheralStepper::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    if (s.isRunning) {
        uint32_t now = millis();
        // Convert stepperSpeed (0-100% or similar) to delay. Let's say speed is 10-100 RPM or delay
        // We will treat s.stepperSpeed as delay in milliseconds (e.g. 5ms = very fast, 100ms = slow)
        // Let's invert it so higher number = faster. 
        // 100 speed = 2ms delay. 1 speed = 50ms delay
        uint32_t delayMs = map(s.stepperSpeed, 1, 100, 50, 2);
        if (delayMs < 2) delayMs = 2; // Mechanical limit
        
        if (now - _lastStepTime >= delayMs) {
            _lastStepTime = now;
            
            if (s.mode == MODE_CONTINUOUS) {
                // Continuous rotation (forward)
                step(1);
            } else if (s.mode == MODE_SWEEP) {
                // Sweep back and forth
                _sweepController.update();
                // Sweep controller manages an internal float 0.0 to 1.0. 
                // We can use it to determine direction.
                // But a stepper sweeping is just rotating back and forth. 
                // A simple approach: sweep controller tells us if we are sweeping up or down.
                bool isUp = _sweepController.isSweepingUp();
                step(isUp ? 1 : -1);
            }
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
    if (s.mode == MODE_SWEEP) {
        _sweepController.beginSweep();
    }
    s.isRunning = true;
    _lastStepTime = millis();
}

void PeripheralStepper::stop() {
    AppSettings& s = _settingsMgr.getSettings();
    bool wasRunning = s.isRunning;
    s.isRunning = false;
    
    if (wasRunning && s.mode == MODE_SWEEP) {
        _sweepController.reset();
    }
    
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
    
    // Draw motor icon
    u8g2.drawCircle(64, 40, 15, U8G2_DRAW_ALL);
    // Draw Coils
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(30, 25); u8g2.print("A+");
    u8g2.setCursor(30, 60); u8g2.print("A-");
    u8g2.setCursor(90, 25); u8g2.print("B+");
    u8g2.setCursor(90, 60); u8g2.print("B-");
    
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
    if (focusIndex == 0 && diff != 0 && !s.isRunning) {
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
