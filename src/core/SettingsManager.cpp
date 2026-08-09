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
        _settings.dwellMs != _savedSettings.dwellMs || 
        _settings.dutyCycle != _savedSettings.dutyCycle ||
        _settings.pulseMode != _savedSettings.pulseMode ||
        _settings.mode != _savedSettings.mode) {
        
        preferences.putInt("rpm", _settings.rpm);
        preferences.putFloat("dwell", _settings.dwellMs);
        preferences.putFloat("duty", _settings.dutyCycle);
        preferences.putUChar("pmode", static_cast<uint8_t>(_settings.pulseMode));
        preferences.putUChar("mode", static_cast<uint8_t>(_settings.mode));
        
        // Sync saved state
        _savedSettings = _settings;
    }
}

void SettingsManager::load() {
    _settings.rpm = preferences.getInt("rpm", 600);                 // Default 600 RPM (10 Hz)
    _settings.dwellMs = preferences.getFloat("dwell", 3.0f);        // Default 3.0 ms
    _settings.dutyCycle = preferences.getFloat("duty", 50.0f);      // Default 50.0%
    _settings.pulseMode = static_cast<PulseMode>(preferences.getUChar("pmode", PULSE_DWELL));
    _settings.mode = static_cast<CoilMode>(preferences.getUChar("mode", MODE_CONTINUOUS));
    _settings.isRunning = false; // Always start stopped for safety
    
    // Sync saved state
    _savedSettings = _settings;
}

void SettingsManager::resetToDefaults() {
    _settings.rpm = 600;
    _settings.dwellMs = 3.0f;
    _settings.dutyCycle = 50.0f;
    _settings.pulseMode = PULSE_DWELL;
    _settings.mode = MODE_CONTINUOUS;
    _settings.isRunning = false;
}
