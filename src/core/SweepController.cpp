#include "SweepController.h"

SweepController::SweepController(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _sweepLastUpdate(0), _lastHardwareUpdate(0),
      _currentSweepVal(0.0f), _sweepUp(true),
      _currentDwellSweepVal(0.0f), _dwellSweepUp(true),
      _targetKmh(0), _targetRpm(0), _targetTemp(0), _targetFuel(0), _targetRpmNormal(0) {
}

void SweepController::beginSweep() {
    AppSettings& s = _settingsMgr.getSettings();
    _targetKmh = s.speedoKmh;
    _targetRpm = s.speedoRpm;
    _targetTemp = s.speedoTempPercent;
    _targetFuel = s.speedoFuelPercent;
    
    int minR = (s.sweepMinRpm >= 200) ? s.sweepMinRpm : 500;
    int maxR = (s.sweepMaxRpm > minR) ? s.sweepMaxRpm : ((s.rpm > minR) ? s.rpm : (minR + 2000));
    if (maxR > 16000) maxR = 16000;
    _targetRpmNormal = maxR;
    
    _currentSweepVal = 0.0f;
    _sweepUp = true;
    _currentDwellSweepVal = 0.0f;
    _dwellSweepUp = true;
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
        s.currentDwellMs = s.dwellMs;
    }
}

bool SweepController::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    uint32_t now = millis();
    uint32_t dt = now - _sweepLastUpdate;
    bool needsHardwareUpdate = false;
    
    float sweepSec = s.sweepTimeSec;
    if (sweepSec < 0.01f) sweepSec = 0.01f;
    if (sweepSec > 60.0f) sweepSec = 60.0f;
    
    if (dt >= 1) { // 1ms resolution for ultra-high speed (up to 10ms / 100Hz) sweep modulation
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
            // 1. RPM Modulation
            int minRpm = (s.sweepMinRpm >= 200) ? s.sweepMinRpm : 500;
            int maxRpm = (s.sweepMaxRpm > minRpm) ? s.sweepMaxRpm : ((s.rpm > minRpm) ? s.rpm : (minRpm + 1000));
            if (maxRpm > 16000) maxRpm = 16000;
            s.currentRpm = minRpm + (int)(_currentSweepVal * (maxRpm - minRpm));
            
            // 2. Dwell Modulation (4 Modes)
            float minDwell = (s.dwellMinMs >= 0.2f) ? s.dwellMinMs : 1.0f;
            float maxDwell = (s.dwellMaxMs > minDwell) ? s.dwellMaxMs : (minDwell + 1.0f);
            if (maxDwell > 5.0f) maxDwell = 5.0f;
            
            switch (s.dwellSweepMode) {
                case DWELL_SWEEP_INDEPENDENT: {
                    float dwSec = s.dwellSweepTimeSec;
                    if (dwSec < 0.01f) dwSec = 0.01f;
                    if (dwSec > 60.0f) dwSec = 60.0f;
                    float dwValPerMs = 1.0f / (dwSec * 1000.0f);
                    if (_dwellSweepUp) {
                        _currentDwellSweepVal += (dwValPerMs * dt);
                        if (_currentDwellSweepVal >= 1.0f) {
                            _currentDwellSweepVal = 1.0f;
                            _dwellSweepUp = false;
                        }
                    } else {
                        _currentDwellSweepVal -= (dwValPerMs * dt);
                        if (_currentDwellSweepVal <= 0.0f) {
                            _currentDwellSweepVal = 0.0f;
                            _dwellSweepUp = true;
                        }
                    }
                    s.currentDwellMs = minDwell + (_currentDwellSweepVal * (maxDwell - minDwell));
                    break;
                }
                case DWELL_SWEEP_SYNC:
                    // Mode 3: In-Phase (Searah RPM: RPM Naik -> Dwell Naik)
                    s.currentDwellMs = minDwell + (_currentSweepVal * (maxDwell - minDwell));
                    break;
                case DWELL_SWEEP_INVERTED:
                    // Mode 4: Anti-Phase (Berlawanan RPM: RPM Naik -> Dwell Turun)
                    s.currentDwellMs = maxDwell - (_currentSweepVal * (maxDwell - minDwell));
                    break;
                case DWELL_SWEEP_FIXED:
                default:
                    // Mode 1: Dwell Tetap
                    s.currentDwellMs = s.dwellMs;
                    break;
            }
            needsHardwareUpdate = true;
        }
        _sweepLastUpdate = now;
    }
    
    return needsHardwareUpdate;
}
