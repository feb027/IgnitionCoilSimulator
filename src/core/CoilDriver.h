#ifndef COIL_DRIVER_H
#define COIL_DRIVER_H

#include <Arduino.h>
#include "SettingsManager.h"

// Hard safety limits
#define MAX_DWELL_MS    5.0f
#define MAX_FREQ_HZ     200

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
    uint32_t _sweepLastUpdate = 0; // Tracks last sweep increment
    
    // Reconfigure the hardware timer based on current settings
    void updateTimerConfig();
};

#endif // COIL_DRIVER_H
