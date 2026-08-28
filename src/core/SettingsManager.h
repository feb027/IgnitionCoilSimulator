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
    PULSE_COIL_PASSIVE = 0,    // 0: Coil Pasif 2-Pin (Driver IGBT on Pin 33)
    PULSE_COIL_ACTIVE_3P = 1,  // 1: Coil Aktif 3-Pin (Logic IGT on Pin 25)
    PULSE_COIL_ACTIVE_4P = 2,  // 2: Coil Aktif 4-Pin (Logic IGT on Pin 25 + IGF Monitor on Pin 34)
    PULSE_INJECTOR = 3,        // 3: Fuel Injector Tester (Pin 32)
    PULSE_DUTY = 4,            // 4: Solenoid 2-Pin / PWM (Pin 32)
    PULSE_ISC3PIN = 5,         // 5: ISC 3-Pin Rotary (Pins 32 & 33)
    PULSE_SPEEDO = 6,          // 6: Speedometer Cluster (Pins 2, 4, 13, 15)
    PULSE_STEPPER_IACV = 7,    // 7: Stepper Motor IACV Valve (Step Position & Calibrate)
    PULSE_STEPPER_UNI = 8,     // 8: Stepper Motor 4-Kabel 1-Arah / Continuous Spin
    PULSE_HALL_DAC = 9         // 9: Hall Sensor & VADJ 0-5V DAC (MCP4725)
};

#define PULSE_DWELL PULSE_COIL_PASSIVE
#define PULSE_STEPPER PULSE_STEPPER_IACV
#define NUM_PULSE_MODES 10

// Application settings struct
struct AppSettings {
    int rpm;               // Output speed in RPM (for Ignition Coil / PWM)
    int rpmStep;           // Step size for RPM adjustment (10, 50, 100, etc)
    float dwellMs;         // Dwell time in milliseconds (for coils)
    float dutyCycle;       // Duty cycle in percentage 0.0 - 100.0 (for PWM)
    float iscDuty;         // ISC 3-Pin Opening percentage 0.0 - 100.0% (RSO=D%, RSC=100-D%)
    int iscFreq;           // ISC 3-Pin PWM Frequency in Hz (50 - 500 Hz)
    PulseMode pulseMode;   // Which variable is locked/controlling
    CoilMode mode;         // Current operating mode
    int sweepTimeSec;      // Time in seconds to reach sweep max
    int sweepMinRpm;       // Sweep start/lower limit in RPM (e.g. 500 RPM)
    int sweepMaxRpm;       // Sweep peak/upper limit in RPM (e.g. 6000 RPM)
    int pulsePerKm;        // Pulses per kilometer (calibration for speedo)
    int speedoKmh;         // Target km/h for speedometer (and sweep max)
    int speedoRpm;         // Target RPM for speedometer (and sweep max)
    int speedoTempPercent; // 0-100% for temperature gauge
    int speedoFuelPercent; // 0-100% for fuel gauge
    int speedoRpmStep;     // Step size for RPM adjustment in Speedo mode
    int speedoKmhStep;     // Step size for KMH adjustment in Speedo mode
    int speedoTempStep;    // Step size for Temp adjustment in Speedo mode
    int speedoFuelStep;    // Step size for Fuel adjustment in Speedo mode
    bool speedoEnableRpm;  // Independent enable for RPM channel (Pin 4)
    bool speedoEnableKmh;  // Independent enable for KM/H channel (Pin 2)
    bool speedoEnableTemp; // Independent enable for Temp channel (Pin 13)
    bool speedoEnableFuel; // Independent enable for Fuel channel (Pin 15)
    float speedoTachoPpr;  // Tachometer Pulses Per Revolution (1.0, 2.0, 3.0, 4.0, 0.5)
    int speedoGaugeCurve;  // 0: Non-Linear (Thermal/Fuel Sqrt Curve), 1: Linear 1:1
    int speedoDacRouting;  // 0: Dual PWM, 1: Single DAC Fuel, 2: Single DAC Temp, 3: Dual MCP4725 (0x60 Fuel + 0x61 Temp)
    int speedoPwmFreqHz;   // Gauge PWM frequency in Hz (10 - 5000 Hz, default 5000)
    bool speedoDacFuelFound; // MCP4725 0x60 detected
    bool speedoDacTempFound; // MCP4725 0x61 detected
    
    // 3-Point Calibration for Temp & Fuel Gauges (0-100% duty mapping)
    int speedoTempCalMin;  // Output duty % at 0% input (Cold / C), default 0
    int speedoTempCalMid;  // Output duty % at 50% input (Norm / Middle), default 50
    int speedoTempCalMax;  // Output duty % at 100% input (Hot / H), default 100
    int speedoFuelCalMin;  // Output duty % at 0% input (Empty / E), default 0
    int speedoFuelCalMid;  // Output duty % at 50% input (Half / 1/2), default 50
    int speedoFuelCalMax;  // Output duty % at 100% input (Full / F), default 100
    int currentSpeedoKmh;  // Live km/h (for sweep display)
    int currentSpeedoRpm;  // Live RPM
    int currentSpeedoTempPercent; // Live temp
    int currentSpeedoFuelPercent; // Live fuel
    int currentRpm;        // Live RPM for coil/pwm sweep
    int stepperSpeed;      // Speed for stepper motor (RPM or delay)
    int stepperSpinDir;    // 1 for right, -1 for left, 0 for stopped
    bool isRunning;        // Is the driver currently active?
    uint32_t lastFiredMs;  // For visual feedback on display
    
    // Injector Tester Parameters
    float injectorMs;          // Injection Pulse Width in ms (1.0 - 30.0 ms)
    int injectorRpm;           // Injection RPM (500 - 8000 RPM)
    int injectorFlowPulses;    // Flow Volume Test target pulses (100, 500, 1000)
    int injectorPulsesLeft;    // Remaining pulses during flow test
    bool injectorFlowRunning;  // Is flow volume test active?
    float injectorPeakCurrentA; // Live peak primary coil current (A)
    float injectorResistanceOhm; // Live calculated coil resistance (Ohm)
    bool injectorAutoDiagRunning; // Auto health scan active
    int injectorDiagPhase;     // Phase 1, 2, 3
    int injectorDiagProgress;  // 0 - 100%
    char injectorDiagVerdict[32]; // Verdict string
    
    // IACV Stepper Specific Parameters
    int iacvTargetSteps;       // Target position (0 - 255 steps)
    int iacvCurrentSteps;      // Current live step position (0 - 255 steps)
    bool iacvAutoCalibrating;  // Auto homing/calibration state
    
    // Hall Sensor & MCP4725 DAC Parameters
    float hallDacVoltage;      // Output Voltage 0.00 - 5.00 V (or 0.00 - 12.00 V in 12V domain)
    int hallDacFreqHz;         // Frequency for wave/pulse generator (1 - 500 Hz)
    int hallDacWaveform;       // 0: DC VADJ, 1: Voltage Sweep, 2: Hall Square Wave, 3: Sine Wave
    int hallDacProfile;        // Sensor profile id
    int hallDacDomain;         // 0: Domain 5V (Standard ECU), 1: Domain 12V (High Voltage / Cluster)
    bool hallDacConnected;     // Detected MCP4725 on I2C bus
    
    // Coil Diagnostic & IGF Telemetry
    uint32_t coilFiredCount;        // Total IGT triggers fired
    uint32_t coilIgfCount;          // Total Internal IGF confirmation pulses received (Pin 34)
    uint32_t coilSparkReturnCount;  // Total External Spark Gap Return pulses received (Pin 39)
    uint32_t coilMissedCount;       // Missed spark count
    float coilHealthPercent;        // Spark health efficiency % (0.0 - 100.0%)
    float coilPeakCurrentA;         // Peak primary current in Amperes
    float coilSparkCurrentmA;       // Secondary spark discharge current in mA (0.0 - 100.0 mA via LM358 Pin 39 ADC)
    float coilSparkHealthScore;     // Multi-tier health score (0%, 25%, 50%, 75%, 100%)
    bool coilAutoDiagRunning;       // Is auto health scan active?
    int coilDiagPhase;              // 0: Idle, 1: Dwell Sweep, 2: Accel Burst, 3: High-RPM Stress, 4: Finished
    int coilDiagProgress;           // 0 - 100% progress
    char coilDiagVerdict[32];       // Verdict string: "READY", "HEALTHY", "DEGRADED", "FAIL"
    
    // Coil Body Leakage Detection Telemetry (Pin 36 Probe)
    uint32_t coilLeakCount;     // Total body leakage arcs detected
    uint16_t coilLeakRate;      // Leakage sparks per second (Hz)
    bool coilLeakDetected;      // True if leakage detected in current window
    int coilLeakSensitivity;    // 1: Ultra, 2: High, 3: Medium (Standard), 4: Low (Direct Arc Only), 5: Custom
    int coilLeakThreshold;      // Custom Hit Threshold (1 - 10 arcs per window)
    float coilLeakDebounceMs;   // Custom Lockout Debounce Filter (0.1 - 3.0 ms)
    uint8_t leakArcCutIn;       // Cut-in ARC threshold (default: 2)
    uint8_t leakArc25;          // 25% Leak ARC threshold (default: 5)
    uint8_t leakArc50;          // 50% Leak ARC threshold (default: 10)
    uint8_t leakArc75;          // 75% Leak ARC threshold (default: 18)
    uint8_t leakArc100;         // 100% Leak ARC threshold (default: 25)
    uint8_t leakArcMax;         // Maximum Scale ARC threshold (default: 30)
    uint8_t coilLeakPercent;    // Live dynamic leak percentage (0 - 100%)
    bool coilConnected;         // True if coil load is detected via Auto-Ping / Current Sense
    char coilLeakSeverity[32];  // "PERFECT (0 LEAK)", "MICRO-LEAKAGE", "MEDIUM ARCING", "SEVERE BREAKDOWN"
    char coilCurrentStatus[32]; // "OPTIMAL (6-10A)", "WEAK (<5A)", "OVERCURRENT (>11A)", "STANDBY"

    // 5-Parameter 5-Tier Manual Calibration Matrix & Sub-Sensitivities
    float calSparkPrima;        // Default 45.0 mA
    float calSparkBaik;         // Default 35.0 mA
    float calSparkCukup;        // Default 25.0 mA
    float calSparkKurang;       // Default 15.0 mA
    float calSparkGain;         // Secondary ADC multiplier gain (default: 1.00)
    
    float calCadencePrima;      // Default 98.0 %
    float calCadenceBaik;       // Default 90.0 %
    float calCadenceCukup;      // Default 80.0 %
    float calCadenceKurang;     // Default 60.0 %
    float calCadenceDebounceMs; // Anti-ringing response debounce (default: 1.5 ms)
    float calCadenceWindowMs;   // Time-gate firing window (default: 3.5 ms)
    
    float calCurrentPrima;      // Default 6.5 A
    float calCurrentBaik;       // Default 5.5 A
    float calCurrentCukup;      // Default 4.5 A
    float calCurrentKurang;     // Default 3.0 A
    float calCurrentMax;        // Default 11.5 A
    float calCurrentZeroVolt;   // ACS712 zero offset voltage (default: 1.85 V)
    
    float calTempPrima;         // Default 45.0 °C
    float calTempBaik;          // Default 55.0 °C
    float calTempCukup;         // Default 65.0 °C
    float calTempPanas;         // Default 75.0 °C
    float calTempCutoff;        // Default 85.0 °C
    float calTempOffset;        // Sensor temp offset (default: 0.0 °C)
    
    // DC Power Calibration (Voltage Divider & DC Current Offset/Gain)
    float calVoltGain;          // Supply voltage multiplier (default: 1.00)
    float calVoltOffset;        // Supply voltage offset in Volts (default: 0.00)
    float calDcCurrentGain;     // Real DC current multiplier (default: 1.00)
    float calDcCurrentOffset;   // Real DC current offset in Amperes (default: 0.00)

    // Auxiliary Sensors (ADS1115 ADC Voltmeter, Dual DS18B20 Temp & Real Current)
    float supplyVoltage;        // Battery supply voltage in Volts (e.g. 12.6V)
    float realCurrentA;         // Real continuous average/quiescent current in Amperes
    float tempCoilC;            // Coil body temperature in °C
    float tempDriverC;          // IGBT driver heatsink temperature in °C
    int checkCoilPulseCount;    // Custom Check Coil pulse count (1x, 2x, 3x, 5x, 10x)
    char checkCoilVerdict[64];  // Multi-case Check Coil verdict string
};

class SettingsManager {
public:
    SettingsManager();
    
    // Initialize NVS and load saved settings
    void begin();

    // Get a reference to current settings
    AppSettings& getSettings();

    // Save settings to NVS (debounced by default, immediate on demand)
    void save(bool immediate = false);

    // Background update to commit debounced saves
    void update();

    // Reset to safe defaults
    void resetToDefaults();

private:
    AppSettings _settings;
    AppSettings _savedSettings;
    bool _isDirty;
    uint32_t _lastDirtyTime;

    void load();
    void commitToNvs();
};

#endif // SETTINGS_MANAGER_H
