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

enum PulseMode {
    PULSE_DWELL,
    PULSE_DUTY
};

// Application settings struct
struct AppSettings {
    int rpm;               // Output speed in RPM
    float dwellMs;         // Dwell time in milliseconds (for coils)
    float dutyCycle;       // Duty cycle in percentage 0.0 - 100.0 (for PWM)
    PulseMode pulseMode;   // Which variable is locked/controlling
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
