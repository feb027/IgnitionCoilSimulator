#ifndef COIL_DRIVER_H
#define COIL_DRIVER_H

#include <Arduino.h>
#include "SettingsManager.h"
#include "DigipotDriver.h"

// Hard safety limits
#define MAX_DWELL_MS    5.0f
#define MAX_RPM         12000

class CoilDriver {
public:
    CoilDriver(SettingsManager& settingsMgr);
    
    // Initialize hardware pins and timers
    void begin();
    
    // Process driver state (called from loop) to sync UI auto-stop
    void update();
    
    // Control driver execution
    void start();
    void stop();
    
    // Triggers a single burst or single shot if in those modes
    void trigger();
    
    // Force emergency stop
    static void emergencyStop();

private:
    SettingsManager& _settingsMgr;
    DigipotDriver _tempPot;
    DigipotDriver _fuelPot;
    
    uint32_t _sweepLastUpdate = 0; // Tracks last sweep increment
    uint32_t _lastHardwareUpdate = 0; // Tracks last hardware PWM update to prevent phase resets
    float _currentSweepVal = 0.0f; // Normalized 0.0 to 1.0
    bool _sweepUp = true;          // Sweep direction
    int _targetKmh = 0;
    int _targetRpm = 0;
    int _targetTemp = 0;
    int _targetFuel = 0;
    int _targetRpmNormal = 0;
    
    // Reconfigure the hardware timer based on current settings
    void updateTimerConfig();
};

#endif // COIL_DRIVER_H
