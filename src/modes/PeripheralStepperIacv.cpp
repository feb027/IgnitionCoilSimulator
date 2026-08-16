#include "PeripheralStepperIacv.h"
#include "config/Pins.h"

// 4-Phase Full-Step sequence for bipolar/unipolar IACV
static const uint8_t iacvStepSequence[4][4] = {
    {HIGH, LOW,  HIGH, LOW},  // Phase 1
    {LOW,  HIGH, HIGH, LOW},  // Phase 2
    {LOW,  HIGH, LOW,  HIGH}, // Phase 3
    {HIGH, LOW,  LOW,  HIGH}  // Phase 4
};

PeripheralStepperIacv::PeripheralStepperIacv(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _phaseIndex(0), _lastStepTime(0),
      _isAutoCycling(false), _cycleDirection(1), _calibStepsLeft(0) {}

void PeripheralStepperIacv::begin() {
    pinMode(PIN_STEP_A_PLUS, OUTPUT);
    pinMode(PIN_STEP_A_MINUS, OUTPUT);
    pinMode(PIN_STEP_B_PLUS, OUTPUT);
    pinMode(PIN_STEP_B_MINUS, OUTPUT);
    
    digitalWrite(PIN_STEP_A_PLUS, LOW);
    digitalWrite(PIN_STEP_A_MINUS, LOW);
    digitalWrite(PIN_STEP_B_PLUS, LOW);
    digitalWrite(PIN_STEP_B_MINUS, LOW);
}

void PeripheralStepperIacv::writeStepPhase(int phase) {
    digitalWrite(PIN_STEP_A_PLUS, iacvStepSequence[phase][0]);
    digitalWrite(PIN_STEP_A_MINUS, iacvStepSequence[phase][1]);
    digitalWrite(PIN_STEP_B_PLUS, iacvStepSequence[phase][2]);
    digitalWrite(PIN_STEP_B_MINUS, iacvStepSequence[phase][3]);
}

void PeripheralStepperIacv::stepMotor(int direction) {
    _phaseIndex += direction;
    if (_phaseIndex > 3) _phaseIndex = 0;
    if (_phaseIndex < 0) _phaseIndex = 3;
    
    writeStepPhase(_phaseIndex);
    
    AppSettings& s = _settingsMgr.getSettings();
    s.lastFiredMs = millis();
    s.stepperSpinDir = direction;
}

void PeripheralStepperIacv::update() {
    AppSettings& s = _settingsMgr.getSettings();
    uint32_t now = millis();
    
    // Auto-Homing / Calibration Routine (Retracts pintle to stopper)
    if (s.iacvAutoCalibrating) {
        if (now - _lastStepTime >= 12) { // 12ms per step (~80 steps/sec)
            _lastStepTime = now;
            stepMotor(-1); // Move backward to home
            _calibStepsLeft--;
            if (_calibStepsLeft <= 0) {
                s.iacvAutoCalibrating = false;
                s.iacvCurrentSteps = 0;
                s.iacvTargetSteps = 0;
                stop();
            }
        }
        return;
    }
    
    // Auto Cycling Sweep Test (0 -> 255 -> 0)
    if (_isAutoCycling && s.isRunning) {
        if (now - _lastStepTime >= 12) {
            _lastStepTime = now;
            if (_cycleDirection == 1) {
                if (s.iacvCurrentSteps < 255) {
                    s.iacvCurrentSteps++;
                    stepMotor(1);
                } else {
                    _cycleDirection = -1; // Reverse to close
                }
            } else {
                if (s.iacvCurrentSteps > 0) {
                    s.iacvCurrentSteps--;
                    stepMotor(-1);
                } else {
                    _cycleDirection = 1; // Reverse to open
                }
            }
        }
        return;
    }
    
    // Move towards target position
    if (s.isRunning && s.iacvCurrentSteps != s.iacvTargetSteps) {
        if (now - _lastStepTime >= 12) {
            _lastStepTime = now;
            if (s.iacvCurrentSteps < s.iacvTargetSteps) {
                s.iacvCurrentSteps++;
                stepMotor(1);
            } else if (s.iacvCurrentSteps > s.iacvTargetSteps) {
                s.iacvCurrentSteps--;
                stepMotor(-1);
            }
        }
    } else {
        // De-energize coils when stationary to prevent heating
        if (millis() - s.lastFiredMs > 250) {
            digitalWrite(PIN_STEP_A_PLUS, LOW);
            digitalWrite(PIN_STEP_A_MINUS, LOW);
            digitalWrite(PIN_STEP_B_PLUS, LOW);
            digitalWrite(PIN_STEP_B_MINUS, LOW);
            s.stepperSpinDir = 0;
        }
    }
}

void PeripheralStepperIacv::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    _lastStepTime = millis();
}

void PeripheralStepperIacv::stop() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    _isAutoCycling = false;
    s.iacvAutoCalibrating = false;
    
    digitalWrite(PIN_STEP_A_PLUS, LOW);
    digitalWrite(PIN_STEP_A_MINUS, LOW);
    digitalWrite(PIN_STEP_B_PLUS, LOW);
    digitalWrite(PIN_STEP_B_MINUS, LOW);
}

void PeripheralStepperIacv::trigger() {
    start();
}

void PeripheralStepperIacv::setTargetSteps(int target) {
    AppSettings& s = _settingsMgr.getSettings();
    if (target < 0) target = 0;
    if (target > 255) target = 255;
    s.iacvTargetSteps = target;
    start();
}

void PeripheralStepperIacv::startAutoCalibrate() {
    AppSettings& s = _settingsMgr.getSettings();
    s.iacvAutoCalibrating = true;
    _calibStepsLeft = 300; // 300 steps ensures reaching home stop
    start();
}

void PeripheralStepperIacv::cycleSweepTest() {
    AppSettings& s = _settingsMgr.getSettings();
    _isAutoCycling = true;
    _cycleDirection = 1;
    start();
}

void PeripheralStepperIacv::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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

    // Left Box: Target Steps (Focus 1)
    drawHighlight(1, 0, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(3, 25);
    u8g2.print("TARGET STEP");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(3, 44);
    u8g2.print(s.iacvTargetSteps);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.print(" /255");

    // Right Box: Current Live Steps
    drawHighlight(2, 65, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(68, 25);
    u8g2.print("LIVE VALVE POS");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 44);
    if (s.iacvAutoCalibrating) {
        u8g2.print("CALIB...");
    } else {
        u8g2.print(s.iacvCurrentSteps);
        u8g2.setFont(u8g2_font_5x7_tr);
        u8g2.print(" STP");
    }
    
    // Bottom Status Line
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    u8g2.print("IACV 4-Pin Valve");
    
    u8g2.setCursor(80, 60);
    if (s.iacvAutoCalibrating) u8g2.print("[HOMING]");
    else if (_isAutoCycling) u8g2.print("[CYCLE]");
    else if (s.iacvCurrentSteps == s.iacvTargetSteps) u8g2.print("[LOCKED]");
    else u8g2.print("[MOVING]");
}

int PeripheralStepperIacv::getMaxFocusIndex() const {
    return 1;
}

void PeripheralStepperIacv::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1 || focusIndex == 0) {
        s.iacvTargetSteps += (diff * 5);
        if (s.iacvTargetSteps < 0) s.iacvTargetSteps = 0;
        if (s.iacvTargetSteps > 255) s.iacvTargetSteps = 255;
        _settingsMgr.save();
        start();
    }
}

void PeripheralStepperIacv::syncHardware() {}

bool PeripheralStepperIacv::shouldShowMenuItem(int menuIndex) {
    if (menuIndex == 0 || menuIndex == 9) return true;
    return false;
}

const char* PeripheralStepperIacv::getModeString() {
    return "STEPPER IACV";
}

void PeripheralStepperIacv::cycleRunMode(AppSettings& s, int direction) {}

void PeripheralStepperIacv::handleDashboardEncoder(int diff, AppSettings& s) {
    s.iacvTargetSteps += (diff * 5);
    if (s.iacvTargetSteps < 0) s.iacvTargetSteps = 0;
    if (s.iacvTargetSteps > 255) s.iacvTargetSteps = 255;
    _settingsMgr.save();
    start();
}
