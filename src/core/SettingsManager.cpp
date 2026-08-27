#include "SettingsManager.h"
#include <Preferences.h>

Preferences preferences;

SettingsManager::SettingsManager() {
    resetToDefaults();
}

void SettingsManager::begin() {
    // Open NVS namespace "coil_tester" in read-write mode
    preferences.begin("coil_tester", false);
    load();
}

AppSettings& SettingsManager::getSettings() {
    return _settings;
}

void SettingsManager::save() {
    // Feature C: Optimize NVS saving (only save if changed)
    if (_settings.rpm != _savedSettings.rpm || 
        _settings.rpmStep != _savedSettings.rpmStep ||
        _settings.dwellMs != _savedSettings.dwellMs || 
        _settings.dutyCycle != _savedSettings.dutyCycle ||
        _settings.iscDuty != _savedSettings.iscDuty ||
        _settings.iscFreq != _savedSettings.iscFreq ||
        _settings.pulseMode != _savedSettings.pulseMode ||
        _settings.mode != _savedSettings.mode ||
        _settings.sweepTimeSec != _savedSettings.sweepTimeSec ||
        _settings.pulsePerKm != _savedSettings.pulsePerKm ||
        _settings.speedoKmh != _savedSettings.speedoKmh ||
        _settings.speedoRpm != _savedSettings.speedoRpm ||
        _settings.speedoTempPercent != _savedSettings.speedoTempPercent ||
        _settings.speedoFuelPercent != _savedSettings.speedoFuelPercent ||
        _settings.speedoRpmStep != _savedSettings.speedoRpmStep ||
        _settings.speedoKmhStep != _savedSettings.speedoKmhStep ||
        _settings.speedoTempStep != _savedSettings.speedoTempStep ||
        _settings.speedoFuelStep != _savedSettings.speedoFuelStep ||
        _settings.speedoEnableRpm != _savedSettings.speedoEnableRpm ||
        _settings.speedoEnableKmh != _savedSettings.speedoEnableKmh ||
        _settings.speedoEnableTemp != _savedSettings.speedoEnableTemp ||
        _settings.speedoEnableFuel != _savedSettings.speedoEnableFuel ||
        _settings.speedoTachoPpr != _savedSettings.speedoTachoPpr ||
        _settings.speedoGaugeCurve != _savedSettings.speedoGaugeCurve ||
        _settings.speedoDacRouting != _savedSettings.speedoDacRouting ||
        _settings.speedoPwmFreqHz != _savedSettings.speedoPwmFreqHz ||
        _settings.speedoTempCalMin != _savedSettings.speedoTempCalMin ||
        _settings.speedoTempCalMid != _savedSettings.speedoTempCalMid ||
        _settings.speedoTempCalMax != _savedSettings.speedoTempCalMax ||
        _settings.speedoFuelCalMin != _savedSettings.speedoFuelCalMin ||
        _settings.speedoFuelCalMid != _savedSettings.speedoFuelCalMid ||
        _settings.speedoFuelCalMax != _savedSettings.speedoFuelCalMax ||
        _settings.stepperSpeed != _savedSettings.stepperSpeed) {
        
        preferences.putInt("rpm", _settings.rpm);
        preferences.putInt("rpm_s", _settings.rpmStep);
        preferences.putFloat("dwell", _settings.dwellMs);
        preferences.putFloat("duty", _settings.dutyCycle);
        preferences.putFloat("isc_d", _settings.iscDuty);
        preferences.putInt("isc_f", _settings.iscFreq);
        preferences.putUChar("pmode", static_cast<uint8_t>(_settings.pulseMode));
        preferences.putUChar("mode", static_cast<uint8_t>(_settings.mode));
        preferences.putInt("s_time", _settings.sweepTimeSec);
        preferences.putInt("s_ppk", _settings.pulsePerKm);
        preferences.putInt("s_kmh", _settings.speedoKmh);
        preferences.putInt("s_rpm", _settings.speedoRpm);
        preferences.putInt("s_tmp", _settings.speedoTempPercent);
        preferences.putInt("s_fuel", _settings.speedoFuelPercent);
        preferences.putInt("s_rpm_s", _settings.speedoRpmStep);
        preferences.putInt("s_kmh_s", _settings.speedoKmhStep);
        preferences.putInt("s_tmp_s", _settings.speedoTempStep);
        preferences.putInt("s_ful_s", _settings.speedoFuelStep);
        preferences.putBool("s_en_rpm", _settings.speedoEnableRpm);
        preferences.putBool("s_en_kmh", _settings.speedoEnableKmh);
        preferences.putBool("s_en_tmp", _settings.speedoEnableTemp);
        preferences.putBool("s_en_ful", _settings.speedoEnableFuel);
        preferences.putFloat("s_t_ppr", _settings.speedoTachoPpr);
        preferences.putInt("s_g_crv", _settings.speedoGaugeCurve);
        preferences.putInt("s_dac_rt", _settings.speedoDacRouting);
        preferences.putInt("s_pwm_f", _settings.speedoPwmFreqHz);
        preferences.putInt("s_t_cmin", _settings.speedoTempCalMin);
        preferences.putInt("s_t_cmid", _settings.speedoTempCalMid);
        preferences.putInt("s_t_cmax", _settings.speedoTempCalMax);
        preferences.putInt("s_f_cmin", _settings.speedoFuelCalMin);
        preferences.putInt("s_f_cmid", _settings.speedoFuelCalMid);
        preferences.putInt("s_f_cmax", _settings.speedoFuelCalMax);
        preferences.putInt("st_spd", _settings.stepperSpeed);
        preferences.putInt("lk_sens", _settings.coilLeakSensitivity);
        preferences.putInt("lk_th", _settings.coilLeakThreshold);
        preferences.putFloat("lk_db", _settings.coilLeakDebounceMs);
        
        // Sync saved state
        _savedSettings = _settings;
    }
}

void SettingsManager::load() {
    _settings.rpm = preferences.getInt("rpm", 600);                 // Default 600 RPM (10 Hz)
    _settings.rpmStep = preferences.getInt("rpm_s", 10);            // Default step 10
    _settings.dwellMs = preferences.getFloat("dwell", 3.0f);        // Default 3.0 ms
    _settings.dutyCycle = preferences.getFloat("duty", 50.0f);      // Default 50.0%
    _settings.iscDuty = preferences.getFloat("isc_d", 50.0f);       // Default 50.0% opening
    _settings.iscFreq = preferences.getInt("isc_f", 250);           // Default 250 Hz
    _settings.pulseMode = static_cast<PulseMode>(preferences.getUChar("pmode", PULSE_DWELL));
    _settings.mode = static_cast<CoilMode>(preferences.getUChar("mode", MODE_CONTINUOUS));
    _settings.sweepTimeSec = preferences.getInt("s_time", 5);
    if (_settings.sweepTimeSec < 1) _settings.sweepTimeSec = 1;
    if (_settings.sweepTimeSec > 60) _settings.sweepTimeSec = 60;
    
    _settings.pulsePerKm = preferences.getInt("s_ppk", 4000);
    _settings.speedoKmh = preferences.getInt("s_kmh", 120);
    _settings.speedoRpm = preferences.getInt("s_rpm", 4000);
    _settings.speedoTempPercent = preferences.getInt("s_tmp", 50);
    _settings.speedoFuelPercent = preferences.getInt("s_fuel", 50);
    _settings.speedoRpmStep = preferences.getInt("s_rpm_s", 500);
    _settings.speedoKmhStep = preferences.getInt("s_kmh_s", 10);
    _settings.speedoTempStep = preferences.getInt("s_tmp_s", 5);
    _settings.speedoFuelStep = preferences.getInt("s_ful_s", 5);
    _settings.speedoEnableRpm = preferences.getBool("s_en_rpm", true);
    _settings.speedoEnableKmh = preferences.getBool("s_en_kmh", true);
    _settings.speedoEnableTemp = preferences.getBool("s_en_tmp", true);
    _settings.speedoEnableFuel = preferences.getBool("s_en_ful", true);
    _settings.speedoTachoPpr = preferences.getFloat("s_t_ppr", 2.0f);
    _settings.speedoGaugeCurve = preferences.getInt("s_g_crv", 0); // 0: Non-Linear Sqrt Curve
    _settings.speedoDacRouting = preferences.getInt("s_dac_rt", 3); // 3: Dual MCP4725 (0x60 Fuel + 0x61 Temp)
    _settings.speedoPwmFreqHz = preferences.getInt("s_pwm_f", 5000); // Default 5000 Hz (5kHz)
    if (_settings.speedoPwmFreqHz < 10) _settings.speedoPwmFreqHz = 10;
    if (_settings.speedoPwmFreqHz > 5000) _settings.speedoPwmFreqHz = 5000;
    _settings.speedoTempCalMin = preferences.getInt("s_t_cmin", 0);
    _settings.speedoTempCalMid = preferences.getInt("s_t_cmid", 50);
    _settings.speedoTempCalMax = preferences.getInt("s_t_cmax", 100);
    _settings.speedoFuelCalMin = preferences.getInt("s_f_cmin", 0);
    _settings.speedoFuelCalMid = preferences.getInt("s_f_cmid", 50);
    _settings.speedoFuelCalMax = preferences.getInt("s_f_cmax", 100);
    _settings.speedoDacFuelFound = false;
    _settings.speedoDacTempFound = false;
    _settings.stepperSpeed = preferences.getInt("st_spd", 50);
    
    // Initialize current/live values to match target
    _settings.currentSpeedoKmh = _settings.speedoKmh;
    _settings.currentSpeedoRpm = _settings.speedoRpm;
    _settings.currentSpeedoTempPercent = _settings.speedoTempPercent;
    _settings.currentSpeedoFuelPercent = _settings.speedoFuelPercent;
    
    // Injector Defaults
    _settings.injectorMs = preferences.getFloat("inj_ms", 3.0f);
    _settings.injectorRpm = preferences.getInt("inj_rpm", 1500);
    _settings.injectorFlowPulses = preferences.getInt("inj_pul", 100);
    _settings.injectorPulsesLeft = 0;
    _settings.injectorFlowRunning = false;
    _settings.injectorPeakCurrentA = 0.0f;
    _settings.injectorResistanceOhm = 0.0f;
    _settings.injectorAutoDiagRunning = false;
    _settings.injectorDiagPhase = 0;
    _settings.injectorDiagProgress = 0;
    strncpy(_settings.injectorDiagVerdict, "READY", sizeof(_settings.injectorDiagVerdict));
    
    // IACV Stepper Defaults
    _settings.iacvTargetSteps = preferences.getInt("iacv_tgt", 50);
    _settings.iacvCurrentSteps = 0;
    _settings.iacvAutoCalibrating = false;
    
    // Hall Sensor & MCP4725 DAC Defaults
    _settings.hallDacVoltage = preferences.getFloat("hall_v", 2.50f);
    _settings.hallDacFreqHz = preferences.getInt("hall_f", 50);
    _settings.hallDacWaveform = preferences.getInt("hall_w", 0); // 0: DC VADJ
    _settings.hallDacProfile = preferences.getInt("hall_p", 0); // 0: Custom VADJ
    _settings.hallDacDomain = preferences.getInt("hall_d", 0);  // 0: Domain 5V, 1: Domain 12V
    _settings.hallDacConnected = false;
    
    // Coil Diagnostic Defaults
    _settings.coilFiredCount = 0;
    _settings.coilIgfCount = 0;
    _settings.coilSparkReturnCount = 0;
    _settings.coilMissedCount = 0;
    _settings.coilHealthPercent = 100.0f;
    _settings.coilPeakCurrentA = 0.0f;
    _settings.coilSparkCurrentmA = 0.0f;
    _settings.coilSparkHealthScore = 100.0f;
    _settings.coilAutoDiagRunning = false;
    _settings.coilDiagPhase = 0;
    _settings.coilDiagProgress = 0;
    strncpy(_settings.coilDiagVerdict, "READY", sizeof(_settings.coilDiagVerdict));
    
    _settings.coilLeakCount = 0;
    _settings.coilLeakRate = 0;
    _settings.coilLeakDetected = false;
    _settings.coilLeakSensitivity = preferences.getInt("lk_sens", 3);
    if (_settings.coilLeakSensitivity < 1 || _settings.coilLeakSensitivity > 5) _settings.coilLeakSensitivity = 3;
    _settings.coilLeakThreshold = preferences.getInt("lk_th", 3);
    if (_settings.coilLeakThreshold < 1) _settings.coilLeakThreshold = 1;
    if (_settings.coilLeakThreshold > 15) _settings.coilLeakThreshold = 15;
    _settings.coilLeakDebounceMs = preferences.getFloat("lk_db", 1.0f);
    if (_settings.coilLeakDebounceMs < 0.1f) _settings.coilLeakDebounceMs = 0.1f;
    if (_settings.coilLeakDebounceMs > 5.0f) _settings.coilLeakDebounceMs = 5.0f;
    
    _settings.supplyVoltage = 12.6f;
    _settings.realCurrentA = 0.0f;
    _settings.tempCoilC = 28.5f;
    _settings.tempDriverC = 29.0f;
    _settings.checkCoilPulseCount = preferences.getInt("chk_pulses", 3);
    if (_settings.checkCoilPulseCount < 1 || _settings.checkCoilPulseCount > 10) _settings.checkCoilPulseCount = 3;
    strncpy(_settings.checkCoilVerdict, "READY", sizeof(_settings.checkCoilVerdict));

    // Setup fallback defaults just in case
    _settings.isRunning = false; // Always start stopped for safety
    
    // Sync saved state
    _savedSettings = _settings;
}

void SettingsManager::resetToDefaults() {
    _settings.rpm = 600;
    _settings.rpmStep = 10;
    _settings.dwellMs = 3.0f;
    _settings.dutyCycle = 50.0f;
    _settings.iscDuty = 50.0f;
    _settings.iscFreq = 250;
    _settings.pulseMode = PULSE_DWELL;
    _settings.mode = MODE_CONTINUOUS;
    _settings.sweepTimeSec = 5;
    _settings.pulsePerKm = 4000;
    _settings.speedoKmh = 120;
    _settings.speedoRpm = 4000;
    _settings.speedoTempPercent = 50;
    _settings.speedoFuelPercent = 50;
    _settings.speedoRpmStep = 500;
    _settings.speedoKmhStep = 10;
    _settings.speedoTempStep = 5;
    _settings.speedoFuelStep = 5;
    _settings.speedoEnableRpm = true;
    _settings.speedoEnableKmh = true;
    _settings.speedoEnableTemp = true;
    _settings.speedoEnableFuel = true;
    _settings.speedoTachoPpr = 2.0f;
    _settings.speedoGaugeCurve = 0;
    _settings.speedoDacRouting = 3;
    _settings.speedoPwmFreqHz = 5000;
    _settings.speedoTempCalMin = 0;
    _settings.speedoTempCalMid = 50;
    _settings.speedoTempCalMax = 100;
    _settings.speedoFuelCalMin = 0;
    _settings.speedoFuelCalMid = 50;
    _settings.speedoFuelCalMax = 100;
    _settings.speedoDacFuelFound = false;
    _settings.speedoDacTempFound = false;
    _settings.stepperSpeed = 50;
    _settings.stepperSpinDir = 0;
    _settings.isRunning = false;
    _settings.lastFiredMs = 0;
    
    _settings.injectorMs = 3.0f;
    _settings.injectorRpm = 1500;
    _settings.injectorFlowPulses = 100;
    _settings.injectorPulsesLeft = 0;
    _settings.injectorFlowRunning = false;
    _settings.injectorPeakCurrentA = 0.0f;
    _settings.injectorResistanceOhm = 0.0f;
    _settings.injectorAutoDiagRunning = false;
    _settings.injectorDiagPhase = 0;
    _settings.injectorDiagProgress = 0;
    strncpy(_settings.injectorDiagVerdict, "READY", sizeof(_settings.injectorDiagVerdict));
    
    _settings.iacvTargetSteps = 50;
    _settings.iacvCurrentSteps = 0;
    _settings.iacvAutoCalibrating = false;
    
    _settings.hallDacVoltage = 2.50f;
    _settings.hallDacFreqHz = 50;
    _settings.hallDacWaveform = 0;
    _settings.hallDacProfile = 0;
    _settings.hallDacDomain = 0;
    _settings.hallDacConnected = false;
    
    _settings.coilFiredCount = 0;
    _settings.coilIgfCount = 0;
    _settings.coilMissedCount = 0;
    _settings.coilHealthPercent = 100.0f;
    _settings.coilPeakCurrentA = 0.0f;
    _settings.coilAutoDiagRunning = false;
    _settings.coilDiagPhase = 0;
    _settings.coilDiagProgress = 0;
    strncpy(_settings.coilDiagVerdict, "READY", sizeof(_settings.coilDiagVerdict));
    
    _settings.coilLeakCount = 0;
    _settings.coilLeakRate = 0;
    _settings.coilLeakDetected = false;
    
    _savedSettings = _settings;
}
