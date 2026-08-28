#include "SettingsManager.h"
#include <Preferences.h>

Preferences preferences;

SettingsManager::SettingsManager() 
    : _isDirty(false), _lastDirtyTime(0) {
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

void SettingsManager::save(bool immediate) {
    _isDirty = true;
    _lastDirtyTime = millis();
    if (immediate) {
        commitToNvs();
    }
}

void SettingsManager::update() {
    if (_isDirty && (millis() - _lastDirtyTime >= 1500)) {
        commitToNvs();
    }
}

void SettingsManager::commitToNvs() {
    _isDirty = false;
    if (_settings.rpm == _savedSettings.rpm && _settings.dwellMs == _savedSettings.dwellMs &&
        _settings.dutyCycle == _savedSettings.dutyCycle && _settings.iscDuty == _savedSettings.iscDuty &&
        _settings.iscFreq == _savedSettings.iscFreq && _settings.pulseMode == _savedSettings.pulseMode &&
        _settings.mode == _savedSettings.mode && _settings.speedoKmh == _savedSettings.speedoKmh &&
        _settings.speedoRpm == _savedSettings.speedoRpm && _settings.stepperSpeed == _savedSettings.stepperSpeed &&
        _settings.coilLeakSensitivity == _savedSettings.coilLeakSensitivity &&
        _settings.coilLeakThreshold == _savedSettings.coilLeakThreshold &&
        _settings.coilLeakDebounceMs == _savedSettings.coilLeakDebounceMs) {
        return; // No critical change
    }
    preferences.putInt("rpm", _settings.rpm); preferences.putInt("rpm_s", _settings.rpmStep);
    preferences.putFloat("dwell", _settings.dwellMs); preferences.putFloat("duty", _settings.dutyCycle);
    preferences.putFloat("isc_d", _settings.iscDuty); preferences.putInt("isc_f", _settings.iscFreq);
    preferences.putUChar("pmode", static_cast<uint8_t>(_settings.pulseMode));
    preferences.putUChar("mode", static_cast<uint8_t>(_settings.mode));
    preferences.putFloat("s_time", _settings.sweepTimeSec); preferences.putInt("s_ppk", _settings.pulsePerKm);
    preferences.putInt("sw_min", _settings.sweepMinRpm); preferences.putInt("sw_max", _settings.sweepMaxRpm);
    preferences.putInt("s_kmh", _settings.speedoKmh); preferences.putInt("s_rpm", _settings.speedoRpm);
    preferences.putInt("s_tmp", _settings.speedoTempPercent); preferences.putInt("s_fuel", _settings.speedoFuelPercent);
    preferences.putInt("s_rpm_s", _settings.speedoRpmStep); preferences.putInt("s_kmh_s", _settings.speedoKmhStep);
    preferences.putInt("s_tmp_s", _settings.speedoTempStep); preferences.putInt("s_ful_s", _settings.speedoFuelStep);
    preferences.putBool("s_en_rpm", _settings.speedoEnableRpm); preferences.putBool("s_en_kmh", _settings.speedoEnableKmh);
    preferences.putBool("s_en_tmp", _settings.speedoEnableTemp); preferences.putBool("s_en_ful", _settings.speedoEnableFuel);
    preferences.putFloat("s_t_ppr", _settings.speedoTachoPpr); preferences.putInt("s_g_crv", _settings.speedoGaugeCurve);
    preferences.putInt("s_dac_rt", _settings.speedoDacRouting); preferences.putInt("s_pwm_f", _settings.speedoPwmFreqHz);
    preferences.putInt("s_t_cmin", _settings.speedoTempCalMin); preferences.putInt("s_t_cmid", _settings.speedoTempCalMid);
    preferences.putInt("s_t_cmax", _settings.speedoTempCalMax); preferences.putInt("s_f_cmin", _settings.speedoFuelCalMin);
    preferences.putInt("s_f_cmid", _settings.speedoFuelCalMid); preferences.putInt("s_f_cmax", _settings.speedoFuelCalMax);
    preferences.putInt("st_spd", _settings.stepperSpeed);
    preferences.putInt("lk_sens", _settings.coilLeakSensitivity);
    preferences.putInt("lk_th", _settings.coilLeakThreshold);
    preferences.putFloat("lk_db", _settings.coilLeakDebounceMs);
    preferences.putUChar("lk_cut", _settings.leakArcCutIn);
    preferences.putUChar("lk_25", _settings.leakArc25);
    preferences.putUChar("lk_50", _settings.leakArc50);
    preferences.putUChar("lk_75", _settings.leakArc75);
    preferences.putUChar("lk_100", _settings.leakArc100);
    preferences.putUChar("lk_max", _settings.leakArcMax);
    preferences.putFloat("c_sp_p", _settings.calSparkPrima); preferences.putFloat("c_sp_b", _settings.calSparkBaik);
    preferences.putFloat("c_sp_c", _settings.calSparkCukup); preferences.putFloat("c_sp_k", _settings.calSparkKurang);
    preferences.putFloat("c_sp_g", _settings.calSparkGain);
    preferences.putFloat("c_cd_p", _settings.calCadencePrima); preferences.putFloat("c_cd_b", _settings.calCadenceBaik);
    preferences.putFloat("c_cd_c", _settings.calCadenceCukup); preferences.putFloat("c_cd_k", _settings.calCadenceKurang);
    preferences.putFloat("c_cd_db", _settings.calCadenceDebounceMs); preferences.putFloat("c_cd_win", _settings.calCadenceWindowMs);
    preferences.putFloat("c_cr_p", _settings.calCurrentPrima); preferences.putFloat("c_cr_b", _settings.calCurrentBaik);
    preferences.putFloat("c_cr_c", _settings.calCurrentCukup); preferences.putFloat("c_cr_k", _settings.calCurrentKurang);
    preferences.putFloat("c_cr_m", _settings.calCurrentMax); preferences.putFloat("c_cr_z", _settings.calCurrentZeroVolt);
    preferences.putFloat("c_tp_p", _settings.calTempPrima); preferences.putFloat("c_tp_b", _settings.calTempBaik);
    preferences.putFloat("c_tp_c", _settings.calTempCukup); preferences.putFloat("c_tp_h", _settings.calTempPanas);
    preferences.putFloat("c_tp_cut", _settings.calTempCutoff); preferences.putFloat("c_tp_off", _settings.calTempOffset);
    preferences.putFloat("c_vt_g", _settings.calVoltGain); preferences.putFloat("c_vt_o", _settings.calVoltOffset);
    preferences.putFloat("c_dc_g", _settings.calDcCurrentGain); preferences.putFloat("c_dc_o", _settings.calDcCurrentOffset);
    _savedSettings = _settings;
}

void SettingsManager::load() {
    _settings.rpm = preferences.getInt("rpm", 600);
    _settings.rpmStep = preferences.getInt("rpm_s", 10);
    _settings.dwellMs = preferences.getFloat("dwell", 3.0f);
    _settings.dutyCycle = preferences.getFloat("duty", 50.0f);
    _settings.iscDuty = preferences.getFloat("isc_d", 50.0f);
    _settings.iscFreq = preferences.getInt("isc_f", 250);
    _settings.pulseMode = static_cast<PulseMode>(preferences.getUChar("pmode", PULSE_DWELL));
    _settings.mode = static_cast<CoilMode>(preferences.getUChar("mode", MODE_CONTINUOUS));
    _settings.sweepTimeSec = preferences.getFloat("s_time", 5.0f);
    if (_settings.sweepTimeSec < 0.01f) _settings.sweepTimeSec = 0.01f;
    if (_settings.sweepTimeSec > 60.0f) _settings.sweepTimeSec = 60.0f;
    _settings.sweepMinRpm = preferences.getInt("sw_min", 500);
    if (_settings.sweepMinRpm < 200) _settings.sweepMinRpm = 200;
    _settings.sweepMaxRpm = preferences.getInt("sw_max", 6000);
    if (_settings.sweepMaxRpm < 500) _settings.sweepMaxRpm = 500;
    
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
    _settings.speedoGaugeCurve = preferences.getInt("s_g_crv", 0);
    _settings.speedoDacRouting = preferences.getInt("s_dac_rt", 3);
    _settings.speedoPwmFreqHz = preferences.getInt("s_pwm_f", 5000);
    if (_settings.speedoPwmFreqHz < 10) _settings.speedoPwmFreqHz = 10;
    if (_settings.speedoPwmFreqHz > 5000) _settings.speedoPwmFreqHz = 5000;
    _settings.speedoTempCalMin = preferences.getInt("s_t_cmin", 0);
    _settings.speedoTempCalMid = preferences.getInt("s_t_cmid", 50);
    _settings.speedoTempCalMax = preferences.getInt("s_t_cmax", 100);
    _settings.speedoFuelCalMin = preferences.getInt("s_f_cmin", 0);
    _settings.speedoFuelCalMid = preferences.getInt("s_f_cmid", 50);
    _settings.speedoFuelCalMax = preferences.getInt("s_f_cmax", 100);
    _settings.speedoDacFuelFound = false; _settings.speedoDacTempFound = false;
    _settings.stepperSpeed = preferences.getInt("st_spd", 50);
    _settings.currentSpeedoKmh = _settings.speedoKmh; _settings.currentSpeedoRpm = _settings.speedoRpm;
    _settings.currentSpeedoTempPercent = _settings.speedoTempPercent; _settings.currentSpeedoFuelPercent = _settings.speedoFuelPercent;
    
    _settings.injectorMs = preferences.getFloat("inj_ms", 3.0f);
    _settings.injectorRpm = preferences.getInt("inj_rpm", 1500);
    _settings.injectorFlowPulses = preferences.getInt("inj_pul", 100);
    _settings.injectorPulsesLeft = 0; _settings.injectorFlowRunning = false;
    _settings.injectorPeakCurrentA = 0.0f; _settings.injectorResistanceOhm = 0.0f;
    _settings.injectorAutoDiagRunning = false; _settings.injectorDiagPhase = 0; _settings.injectorDiagProgress = 0;
    strncpy(_settings.injectorDiagVerdict, "READY", sizeof(_settings.injectorDiagVerdict));
    
    _settings.iacvTargetSteps = preferences.getInt("iacv_tgt", 50);
    _settings.iacvCurrentSteps = 0; _settings.iacvAutoCalibrating = false;
    
    _settings.hallDacVoltage = preferences.getFloat("hall_v", 2.50f);
    _settings.hallDacFreqHz = preferences.getInt("hall_f", 50);
    _settings.hallDacWaveform = preferences.getInt("hall_w", 0);
    _settings.hallDacProfile = preferences.getInt("hall_p", 0);
    _settings.hallDacDomain = preferences.getInt("hall_d", 0);
    _settings.hallDacConnected = false;
    
    _settings.coilFiredCount = 0; _settings.coilIgfCount = 0; _settings.coilSparkReturnCount = 0; _settings.coilMissedCount = 0;
    _settings.coilHealthPercent = 100.0f; _settings.coilPeakCurrentA = 0.0f; _settings.coilSparkCurrentmA = 0.0f;
    _settings.coilSparkHealthScore = 100.0f; _settings.coilAutoDiagRunning = false; _settings.coilDiagPhase = 0; _settings.coilDiagProgress = 0;
    strncpy(_settings.coilDiagVerdict, "READY", sizeof(_settings.coilDiagVerdict));
    
    _settings.coilLeakCount = 0; _settings.coilLeakRate = 0;
    _settings.coilLeakSensitivity = preferences.getInt("lk_sens", 1);
    if (_settings.coilLeakSensitivity < 1 || _settings.coilLeakSensitivity > 6) _settings.coilLeakSensitivity = 1;
    _settings.coilLeakThreshold = preferences.getInt("lk_th", 4);
    if (_settings.coilLeakThreshold < 1) _settings.coilLeakThreshold = 1;
    if (_settings.coilLeakThreshold > 50) _settings.coilLeakThreshold = 50;
    _settings.coilLeakDebounceMs = preferences.getFloat("lk_db", 3.0f);
    if (_settings.coilLeakDebounceMs < 0.1f) _settings.coilLeakDebounceMs = 0.1f;
    if (_settings.coilLeakDebounceMs > 8.0f) _settings.coilLeakDebounceMs = 8.0f;
    
    _settings.leakArcCutIn = preferences.getUChar("lk_cut", 10);
    _settings.leakArc25 = preferences.getUChar("lk_25", 20);
    _settings.leakArc50 = preferences.getUChar("lk_50", 30);
    _settings.leakArc75 = preferences.getUChar("lk_75", 40);
    _settings.leakArc100 = preferences.getUChar("lk_100", 50);
    _settings.leakArcMax = preferences.getUChar("lk_max", 50);
    _settings.coilLeakPercent = 0;
    
    _settings.calSparkPrima = preferences.getFloat("c_sp_p", 45.0f);
    _settings.calSparkBaik = preferences.getFloat("c_sp_b", 35.0f);
    _settings.calSparkCukup = preferences.getFloat("c_sp_c", 25.0f);
    _settings.calSparkKurang = preferences.getFloat("c_sp_k", 15.0f);
    _settings.calSparkGain = preferences.getFloat("c_sp_g", 1.00f);
    
    _settings.calCadencePrima = preferences.getFloat("c_cd_p", 98.0f);
    _settings.calCadenceBaik = preferences.getFloat("c_cd_b", 90.0f);
    _settings.calCadenceCukup = preferences.getFloat("c_cd_c", 80.0f);
    _settings.calCadenceKurang = preferences.getFloat("c_cd_k", 60.0f);
    _settings.calCadenceDebounceMs = preferences.getFloat("c_cd_db", 1.5f);
    _settings.calCadenceWindowMs = preferences.getFloat("c_cd_win", 3.5f);
    
    _settings.calCurrentPrima = preferences.getFloat("c_cr_p", 6.5f);
    _settings.calCurrentBaik = preferences.getFloat("c_cr_b", 5.5f);
    _settings.calCurrentCukup = preferences.getFloat("c_cr_c", 4.5f);
    _settings.calCurrentKurang = preferences.getFloat("c_cr_k", 3.0f);
    _settings.calCurrentMax = preferences.getFloat("c_cr_m", 11.5f);
    _settings.calCurrentZeroVolt = preferences.getFloat("c_cr_z", 1.85f);
    
    _settings.calTempPrima = preferences.getFloat("c_tp_p", 45.0f);
    _settings.calTempBaik = preferences.getFloat("c_tp_b", 55.0f);
    _settings.calTempCukup = preferences.getFloat("c_tp_c", 65.0f);
    _settings.calTempPanas = preferences.getFloat("c_tp_h", 75.0f);
    _settings.calTempCutoff = preferences.getFloat("c_tp_cut", 85.0f);
    _settings.calTempOffset = preferences.getFloat("c_tp_off", 0.0f);
    _settings.calVoltGain = preferences.getFloat("c_vt_g", 1.00f);
    _settings.calVoltOffset = preferences.getFloat("c_vt_o", 0.0f);
    _settings.calDcCurrentGain = preferences.getFloat("c_dc_g", 1.00f);
    _settings.calDcCurrentOffset = preferences.getFloat("c_dc_o", 0.0f);
    
    _settings.supplyVoltage = 12.6f; _settings.realCurrentA = 0.0f;
    _settings.tempCoilC = 28.5f; _settings.tempDriverC = 29.0f;
    _settings.checkCoilPulseCount = preferences.getInt("chk_pulses", 3);
    if (_settings.checkCoilPulseCount < 1 || _settings.checkCoilPulseCount > 10) _settings.checkCoilPulseCount = 3;
    strncpy(_settings.checkCoilVerdict, "READY", sizeof(_settings.checkCoilVerdict));
    _settings.isRunning = false;
    _savedSettings = _settings;
}

void SettingsManager::resetToDefaults() {
    _settings.rpm = 600; _settings.rpmStep = 10; _settings.dwellMs = 3.0f; _settings.dutyCycle = 50.0f;
    _settings.iscDuty = 50.0f; _settings.iscFreq = 250; _settings.pulseMode = PULSE_DWELL; _settings.mode = MODE_CONTINUOUS;
    _settings.sweepTimeSec = 5; _settings.pulsePerKm = 4000; _settings.speedoKmh = 120; _settings.speedoRpm = 4000;
    _settings.speedoTempPercent = 50; _settings.speedoFuelPercent = 50; _settings.speedoRpmStep = 500;
    _settings.speedoKmhStep = 10; _settings.speedoTempStep = 5; _settings.speedoFuelStep = 5;
    _settings.speedoEnableRpm = true; _settings.speedoEnableKmh = true; _settings.speedoEnableTemp = true; _settings.speedoEnableFuel = true;
    _settings.speedoTachoPpr = 2.0f; _settings.speedoGaugeCurve = 0; _settings.speedoDacRouting = 3; _settings.speedoPwmFreqHz = 5000;
    _settings.speedoTempCalMin = 0; _settings.speedoTempCalMid = 50; _settings.speedoTempCalMax = 100;
    _settings.speedoFuelCalMin = 0; _settings.speedoFuelCalMid = 50; _settings.speedoFuelCalMax = 100;
    _settings.speedoDacFuelFound = false; _settings.speedoDacTempFound = false; _settings.stepperSpeed = 50;
    _settings.stepperSpinDir = 0; _settings.isRunning = false; _settings.lastFiredMs = 0;
    
    _settings.injectorMs = 3.0f; _settings.injectorRpm = 1500; _settings.injectorFlowPulses = 100;
    _settings.injectorPulsesLeft = 0; _settings.injectorFlowRunning = false;
    _settings.injectorPeakCurrentA = 0.0f; _settings.injectorResistanceOhm = 0.0f;
    _settings.injectorAutoDiagRunning = false; _settings.injectorDiagPhase = 0; _settings.injectorDiagProgress = 0;
    strncpy(_settings.injectorDiagVerdict, "READY", sizeof(_settings.injectorDiagVerdict));
    
    _settings.iacvTargetSteps = 50; _settings.iacvCurrentSteps = 0; _settings.iacvAutoCalibrating = false;
    
    _settings.hallDacVoltage = 2.50f; _settings.hallDacFreqHz = 50; _settings.hallDacWaveform = 0;
    _settings.hallDacProfile = 0; _settings.hallDacDomain = 0; _settings.hallDacConnected = false;
    
    _settings.coilFiredCount = 0; _settings.coilIgfCount = 0; _settings.coilMissedCount = 0;
    _settings.coilHealthPercent = 100.0f; _settings.coilPeakCurrentA = 0.0f;
    _settings.coilAutoDiagRunning = false; _settings.coilDiagPhase = 0; _settings.coilDiagProgress = 0;
    strncpy(_settings.coilDiagVerdict, "READY", sizeof(_settings.coilDiagVerdict));
    
    _settings.coilLeakCount = 0; _settings.coilLeakRate = 0; _settings.coilLeakDetected = false;
    _settings.coilLeakSensitivity = 1; _settings.coilLeakThreshold = 4; _settings.coilLeakDebounceMs = 3.0f;
    _settings.leakArcCutIn = 10; _settings.leakArc25 = 20; _settings.leakArc50 = 30;
    _settings.leakArc75 = 40; _settings.leakArc100 = 50; _settings.leakArcMax = 50; _settings.coilLeakPercent = 0;
    
    _settings.calSparkPrima = 45.0f; _settings.calSparkBaik = 35.0f; _settings.calSparkCukup = 25.0f; _settings.calSparkKurang = 15.0f;
    _settings.calSparkGain = 1.00f;
    
    _settings.calCadencePrima = 98.0f; _settings.calCadenceBaik = 90.0f; _settings.calCadenceCukup = 80.0f; _settings.calCadenceKurang = 60.0f;
    _settings.calCadenceDebounceMs = 1.5f; _settings.calCadenceWindowMs = 3.5f;
    
    _settings.calCurrentPrima = 6.5f; _settings.calCurrentBaik = 5.5f; _settings.calCurrentCukup = 4.5f; _settings.calCurrentKurang = 3.0f;
    _settings.calCurrentMax = 11.5f; _settings.calCurrentZeroVolt = 1.85f;
    
    _settings.calTempPrima = 45.0f; _settings.calTempBaik = 55.0f; _settings.calTempCukup = 65.0f; _settings.calTempPanas = 75.0f;
    _settings.calTempCutoff = 85.0f; _settings.calTempOffset = 0.0f;
    _settings.calVoltGain = 1.00f; _settings.calVoltOffset = 0.0f;
    _settings.calDcCurrentGain = 1.00f; _settings.calDcCurrentOffset = 0.0f;
    
    _savedSettings = _settings;
}
