#include "SweepController.h"

SweepController::SweepController(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _sweepLastUpdate(0), _lastHardwareUpdate(0),
      _currentSweepVal(0.0f), _sweepUp(true), 
      _targetKmh(0), _targetRpm(0), _targetTemp(0), _targetFuel(0), _targetRpmNormal(0) {
}

void SweepController::beginSweep() {
    AppSettings& s = _settingsMgr.getSettings();
    _targetKmh = s.speedoKmh;
    _targetRpm = s.speedoRpm;
    _targetTemp = s.speedoTempPercent;
    _targetFuel = s.speedoFuelPercent;
    _targetRpmNormal = (s.rpm >= 600) ? s.rpm : 6000;
    
    _currentSweepVal = 0.0f;
    _sweepUp = true;
    _sweepLastUpdate = millis();
    _lastHardwareUpdate = millis();
}

void SweepController::reset() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.pulseMode == PULSE_SPEEDO) {
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
    
    uint32_t sweepSec = s.sweepTimeSec;
    if (sweepSec < 1) sweepSec = 1;
    if (sweepSec > 60) sweepSec = 60;
    
    if (dt >= 15) { // 15ms resolution for ultra-smooth frequency modulation
        float valPerMs = 1.0f / (sweepSec * 1000.0f);
        
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
            s.currentSpeedoKmh = s.speedoEnableKmh ? (int)(_currentSweepVal * _targetKmh) : 0;
            s.currentSpeedoRpm = s.speedoEnableRpm ? (int)(_currentSweepVal * _targetRpm) : 0;
            s.currentSpeedoTempPercent = s.speedoEnableTemp ? (int)(_currentSweepVal * _targetTemp) : 0;
            s.currentSpeedoFuelPercent = s.speedoEnableFuel ? (int)(_currentSweepVal * _targetFuel) : 0;
            
            if (now - _lastHardwareUpdate > 150) {
                needsHardwareUpdate = true;
                _lastHardwareUpdate = now;
            }
        } else {
            // Sweep range: from 500 RPM (idle) up to set Target RPM (e.g. 6000 RPM)
            int minRpm = 500;
            int maxRpm = _targetRpmNormal;
            if (maxRpm <= minRpm) maxRpm = minRpm + 1000;
            s.currentRpm = minRpm + (int)(_currentSweepVal * (maxRpm - minRpm));
            needsHardwareUpdate = true;
        }
        _sweepLastUpdate = now;
    }
    
    return needsHardwareUpdate;
}
