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
    PULSE_DUTY,
    PULSE_SPEEDO,
    PULSE_STEPPER
};

// Application settings struct
struct AppSettings {
    int rpm;               // Output speed in RPM (for Ignition Coil / PWM)
    int rpmStep;           // Step size for RPM adjustment (10, 50, 100, etc)
    float dwellMs;         // Dwell time in milliseconds (for coils)
    float dutyCycle;       // Duty cycle in percentage 0.0 - 100.0 (for PWM)
    PulseMode pulseMode;   // Which variable is locked/controlling
    CoilMode mode;         // Current operating mode
    int sweepTimeSec;      // Time in seconds to reach sweep max
    int pulsePerKm;        // Pulses per kilometer (calibration for speedo)
    int speedoKmh;         // Target km/h for speedometer (and sweep max)
    int speedoRpm;         // Target RPM for speedometer (and sweep max)
    int speedoTempPercent; // 0-100% for temperature gauge
    int speedoFuelPercent; // 0-100% for fuel gauge
    int speedoRpmStep;     // Step size for RPM adjustment in Speedo mode
    int speedoKmhStep;     // Step size for KMH adjustment in Speedo mode
    int speedoTempStep;    // Step size for Temp adjustment in Speedo mode
    int speedoFuelStep;    // Step size for Fuel adjustment in Speedo mode
    int currentSpeedoKmh;  // Live km/h (for sweep display)
    int currentSpeedoRpm;  // Live RPM
    int currentSpeedoTempPercent; // Live temp
    int currentSpeedoFuelPercent; // Live fuel
    int currentRpm;        // Live RPM for coil/pwm sweep
    int stepperSpeed;      // Speed for stepper motor (RPM or delay)
    int stepperSpinDir;    // 1 for right, -1 for left, 0 for stopped
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
