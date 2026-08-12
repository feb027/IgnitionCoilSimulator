#include "SweepController.h"

SweepController::SweepController(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _sweepLastUpdate(0), _lastHardwareUpdate(0),
      _currentSweepVal(0.0f), _sweepUp(true), 
      _targetKmh(0), _targetRpm(0), _targetTemp(0), _targetFuel(0), _targetRpmNormal(0) {
}

void SweepController::beginSweep() {
    AppSettings& s = _settingsMgr.getSettings();
    _targetKmh = s.speedoKmh;
    if (_targetKmh <= 0) _targetKmh = 120; // Fallback so sweep is always visible
    _targetRpm = s.speedoRpm;
    if (_targetRpm <= 0) _targetRpm = 4000;
    _targetTemp = s.speedoTempPercent;
    if (_targetTemp <= 0) _targetTemp = 50;
    _targetFuel = s.speedoFuelPercent;
    if (_targetFuel <= 0) _targetFuel = 50;
    _targetRpmNormal = s.rpm;
    
    _currentSweepVal = 0.0f;
    _sweepUp = true;
    _sweepLastUpdate = millis();
    _lastHardwareUpdate = millis();
}

void SweepController::reset() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.pulseMode == PULSE_SPEEDO) {
        s.speedoKmh = _targetKmh;
        s.speedoRpm = _targetRpm;
        s.speedoTempPercent = _targetTemp;
        s.speedoFuelPercent = _targetFuel;
        s.currentSpeedoKmh = _targetKmh;
        s.currentSpeedoRpm = _targetRpm;
        s.currentSpeedoTempPercent = _targetTemp;
        s.currentSpeedoFuelPercent = _targetFuel;
    } else {
        s.currentRpm = _targetRpmNormal;
    }
}

bool SweepController::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    uint32_t now = millis();
    uint32_t dt = now - _sweepLastUpdate;
    bool needsHardwareUpdate = false;
    
    if (dt > 10) { // Update every 10ms for smooth sweep
        float valPerMs = 1.0f / (s.sweepTimeSec * 1000.0f);
        
        if (_sweepUp) {
            _currentSweepVal += (valPerMs * dt);
            if (_currentSweepVal >= 1.0f) {
                _currentSweepVal = 1.0f;
                _sweepUp = false;
            }
        } else {
            _currentSweepVal -= (valPerMs * dt);
            if (_currentSweepVal <= 0.0f) {
                _currentSweepVal = 0.0f;
                _sweepUp = true;
            }
        }
        
        if (s.pulseMode == PULSE_SPEEDO) {
            s.currentSpeedoKmh = (int)(_currentSweepVal * _targetKmh);
            s.currentSpeedoRpm = (int)(_currentSweepVal * _targetRpm);
            s.currentSpeedoTempPercent = (int)(_currentSweepVal * _targetTemp);
            s.currentSpeedoFuelPercent = (int)(_currentSweepVal * _targetFuel);
        } else {
            s.currentRpm = (int)(_currentSweepVal * _targetRpmNormal);
        }
        
        // Rate limit hardware updates for LEDC to prevent phase resets (Speedometer PWM glitching)
        if (s.pulseMode == PULSE_SPEEDO) {
            if (now - _lastHardwareUpdate > 150) { // 150ms allows frequencies down to 6.6 Hz to complete a cycle
                needsHardwareUpdate = true;
                _lastHardwareUpdate = now;
            }
        } else {
            needsHardwareUpdate = true; // Safe for Coil mode
        }
        _sweepLastUpdate = now;
    }
    
    return needsHardwareUpdate;
}
