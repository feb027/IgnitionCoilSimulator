#ifndef SWEEP_CONTROLLER_H
#define SWEEP_CONTROLLER_H

#include <Arduino.h>
#include "SettingsManager.h"

class SweepController {
public:
    SweepController(SettingsManager& settingsMgr);
    
    // Start or reset a sweep/random cycle
    void beginSweep();
    void beginRandom();
    
    // Reset to targets (when stopped)
    void reset();
    
    // Process math. Returns true if hardware should be updated
    bool update();
    bool updateRandom();
    
    bool isSweepingUp() const { return _sweepUp; }
    float getRpmSweepProgress() const { return _currentSweepVal; }
    float getDwellSweepProgress() const { return _currentDwellSweepVal; }
    
    int getRandomTargetRpm() const { return _randomTargetRpm; }
    float getRandomTargetDwell() const { return _randomTargetDwell; }

private:
    SettingsManager& _settingsMgr;
    
    uint32_t _sweepLastUpdate;
    uint32_t _lastHardwareUpdate;
    float _currentSweepVal;
    bool _sweepUp;
    float _currentDwellSweepVal;
    bool _dwellSweepUp;
    
    int _targetKmh;
    int _targetRpm;
    int _targetTemp;
    int _targetFuel;
    int _targetRpmNormal;

    uint32_t _randomLastStepMs;
    int _randomStartRpm;
    int _randomTargetRpm;
    float _randomStartDwell;
    float _randomTargetDwell;
    
    void generateNextRandomTarget();
};

#endif // SWEEP_CONTROLLER_H
