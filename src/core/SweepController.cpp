#include "SweepController.h"

SweepController::SweepController(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _sweepLastUpdate(0), _lastHardwareUpdate(0),
      _currentSweepVal(0.0f), _sweepUp(true),
      _currentDwellSweepVal(0.0f), _dwellSweepUp(true),
      _targetKmh(0), _targetRpm(0), _targetTemp(0), _targetFuel(0), _targetRpmNormal(0),
      _randomLastStepMs(0), _randomStartRpm(600), _randomTargetRpm(600),
      _randomStartDwell(1.5f), _randomTargetDwell(1.5f) {
}

void SweepController::beginSweep() {
    AppSettings& s = _settingsMgr.getSettings();
    _targetKmh = s.speedoKmh; _targetRpm = s.speedoRpm;
    _targetTemp = s.speedoTempPercent; _targetFuel = s.speedoFuelPercent;
    
    int minR = (s.sweepMinRpm >= 200) ? s.sweepMinRpm : 500;
    int maxR = (s.sweepMaxRpm > minR) ? s.sweepMaxRpm : ((s.rpm > minR) ? s.rpm : (minR + 2000));
    if (maxR > 16000) maxR = 16000;
    _targetRpmNormal = maxR;
    
    _currentSweepVal = 0.0f; _sweepUp = true;
    _currentDwellSweepVal = 0.0f; _dwellSweepUp = true;
    _sweepLastUpdate = millis(); _lastHardwareUpdate = millis();
}

void SweepController::beginRandom() {
    AppSettings& s = _settingsMgr.getSettings();
    _randomLastStepMs = millis();
    _randomStartRpm = (s.randomMinRpm >= 300) ? s.randomMinRpm : 600;
    _randomTargetRpm = _randomStartRpm;
    _randomStartDwell = (s.randomMinDwell >= 0.5f) ? s.randomMinDwell : 1.5f;
    _randomTargetDwell = _randomStartDwell;
    s.randomCurrentRpm = _randomStartRpm;
    s.randomCurrentDwell = _randomStartDwell;
    s.currentRpm = _randomStartRpm;
    s.currentDwellMs = _randomStartDwell;
    generateNextRandomTarget();
}

void SweepController::generateNextRandomTarget() {
    AppSettings& s = _settingsMgr.getSettings();
    int minR = (s.randomMinRpm >= 300) ? s.randomMinRpm : 600;
    int maxR = (s.randomMaxRpm > minR) ? s.randomMaxRpm : (minR + 1000);
    if (maxR > 16000) maxR = 16000;
    
    float minD = (s.randomMinDwell >= 0.5f) ? s.randomMinDwell : 1.5f;
    float maxD = (s.randomMaxDwell > minD) ? s.randomMaxDwell : (minD + 1.0f);
    if (maxD > 5.0f) maxD = 5.0f;
    
    _randomStartRpm = s.randomCurrentRpm;
    _randomStartDwell = s.randomCurrentDwell;
    
    // Generate new random RPM (rounded to nearest 50 RPM)
    int rawRpm = minR + (esp_random() % (maxR - minR + 1));
    _randomTargetRpm = (rawRpm / 50) * 50;
    
    // Generate new random Dwell (rounded to 0.1ms)
    float rndNorm = (float)(esp_random() % 1000) / 1000.0f;
    _randomTargetDwell = minD + (rndNorm * (maxD - minD));
    _randomTargetDwell = roundf(_randomTargetDwell * 10.0f) / 10.0f;
    
    _randomLastStepMs = millis();
}

bool SweepController::updateRandom() {
    AppSettings& s = _settingsMgr.getSettings();
    uint32_t now = millis();
    float intervalSec = (s.randomIntervalSec >= 0.5f) ? s.randomIntervalSec : 2.0f;
    if (intervalSec > 10.0f) intervalSec = 10.0f;
    uint32_t intervalMs = (uint32_t)(intervalSec * 1000.0f);
    
    uint32_t elapsed = now - _randomLastStepMs;
    if (elapsed >= intervalMs) {
        generateNextRandomTarget();
        elapsed = 0;
    }
    
    s.randomTimeLeftSec = max(0.0f, (float)(intervalMs - elapsed) / 1000.0f);
    
    if (s.randomTransitionMode == 0) {
        // Mode 0: Instant Step Jump
        s.randomCurrentRpm = _randomTargetRpm;
        s.randomCurrentDwell = _randomTargetDwell;
    } else {
        // Mode 1: Fast Ramp Transition
        float progress = (float)elapsed / (float)intervalMs;
        if (progress > 1.0f) progress = 1.0f;
        s.randomCurrentRpm = _randomStartRpm + (int)(progress * (_randomTargetRpm - _randomStartRpm));
        s.randomCurrentDwell = _randomStartDwell + (progress * (_randomTargetDwell - _randomStartDwell));
    }
    
    s.currentRpm = s.randomCurrentRpm;
    s.currentDwellMs = s.randomCurrentDwell;
    return true;
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
    if (s.mode == MODE_RANDOM) {
        return updateRandom();
    }
    
    uint32_t now = millis();
    uint32_t dt = now - _sweepLastUpdate;
    bool needsHardwareUpdate = false;
    
    float sweepSec = s.sweepTimeSec;
    if (sweepSec < 0.01f) sweepSec = 0.01f;
    if (sweepSec > 60.0f) sweepSec = 60.0f;
    
    if (dt >= 1) { // 1ms resolution for ultra-high speed sweep modulation
        float valPerMs = 1.0f / (sweepSec * 1000.0f);
        
        if (_sweepUp) {
            _currentSweepVal += (valPerMs * dt);
            if (_currentSweepVal >= 1.0f) { _currentSweepVal = 1.0f; _sweepUp = false; }
        } else {
            _currentSweepVal -= (valPerMs * dt);
            if (_currentSweepVal <= 0.0f) { _currentSweepVal = 0.0f; _sweepUp = true; }
        }
        
        if (s.pulseMode == PULSE_SPEEDO) {
            s.currentSpeedoKmh = s.speedoEnableKmh ? (int)(_currentSweepVal * _targetKmh) : 0;
            s.currentSpeedoRpm = s.speedoEnableRpm ? (int)(_currentSweepVal * _targetRpm) : 0;
            s.currentSpeedoTempPercent = s.speedoEnableTemp ? (int)(_currentSweepVal * _targetTemp) : 0;
            s.currentSpeedoFuelPercent = s.speedoEnableFuel ? (int)(_currentSweepVal * _targetFuel) : 0;
            if (now - _lastHardwareUpdate > 150) { needsHardwareUpdate = true; _lastHardwareUpdate = now; }
        } else {
            int minRpm = (s.sweepMinRpm >= 200) ? s.sweepMinRpm : 500;
            int maxRpm = (s.sweepMaxRpm > minRpm) ? s.sweepMaxRpm : ((s.rpm > minRpm) ? s.rpm : (minRpm + 1000));
            if (maxRpm > 16000) maxRpm = 16000;
            s.currentRpm = minRpm + (int)(_currentSweepVal * (maxRpm - minRpm));
            
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
                        if (_currentDwellSweepVal >= 1.0f) { _currentDwellSweepVal = 1.0f; _dwellSweepUp = false; }
                    } else {
                        _currentDwellSweepVal -= (dwValPerMs * dt);
                        if (_currentDwellSweepVal <= 0.0f) { _currentDwellSweepVal = 0.0f; _dwellSweepUp = true; }
                    }
                    s.currentDwellMs = minDwell + (_currentDwellSweepVal * (maxDwell - minDwell));
                    break;
                }
                case DWELL_SWEEP_SYNC:
                    s.currentDwellMs = minDwell + (_currentSweepVal * (maxDwell - minDwell));
                    break;
                case DWELL_SWEEP_INVERTED:
                    s.currentDwellMs = maxDwell - (_currentSweepVal * (maxDwell - minDwell));
                    break;
                case DWELL_SWEEP_FIXED:
                default:
                    s.currentDwellMs = s.dwellMs;
                    break;
            }
            needsHardwareUpdate = true;
        }
        _sweepLastUpdate = now;
    }
    return needsHardwareUpdate;
}
