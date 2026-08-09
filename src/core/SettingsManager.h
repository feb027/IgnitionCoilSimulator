#ifndef SETTINGS_MANAGER_H
#define SETTINGS_MANAGER_H

#include <Arduino.h>

// Modes of operation
enum CoilMode {
    MODE_CONTINUOUS,
    MODE_BURST,
    MODE_SINGLE,
    MODE_SWEEP
};

// Application settings struct
struct AppSettings {
    uint16_t frequencyHz;  // Output frequency in Hz
    float dwellMs;         // Dwell time in milliseconds
    CoilMode mode;         // Current operating mode
    bool isRunning;        // Is the driver currently active?
    uint32_t lastFiredMs;  // For visual feedback on display
};

class SettingsManager {
public:
    SettingsManager();
    
    // Initialize NVS and load saved settings
    void begin();

    // Get a reference to current settings
    AppSettings& getSettings();

    // Save settings to NVS
    void save();

    // Reset to safe defaults
    void resetToDefaults();

private:
    AppSettings _settings;
    AppSettings _savedSettings;
    void load();
};

#endif // SETTINGS_MANAGER_H
