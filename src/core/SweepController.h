#ifndef SWEEP_CONTROLLER_H
#define SWEEP_CONTROLLER_H

#include <Arduino.h>
#include "SettingsManager.h"

class SweepController {
public:
    SweepController(SettingsManager& settingsMgr);
    
    // Start or reset a sweep cycle
    void beginSweep();
    
    // Reset to targets (when stopped)
    void reset();
    
    // Process math. Returns true if hardware should be updated
    bool update();
    
    bool isSweepingUp() const { return _sweepUp; }
    float getRpmSweepProgress() const { return _currentSweepVal; }
    float getDwellSweepProgress() const { return _currentDwellSweepVal; }

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
};

#endif // SWEEP_CONTROLLER_H
