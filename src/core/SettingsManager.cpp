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
    if (_settings.frequencyHz != _savedSettings.frequencyHz || 
        _settings.dwellMs != _savedSettings.dwellMs || 
        _settings.mode != _savedSettings.mode) {
        
        preferences.putUShort("freq", _settings.frequencyHz);
        preferences.putFloat("dwell", _settings.dwellMs);
        preferences.putUChar("mode", static_cast<uint8_t>(_settings.mode));
        
        // Sync saved state
        _savedSettings.frequencyHz = _settings.frequencyHz;
        _savedSettings.dwellMs = _settings.dwellMs;
        _savedSettings.mode = _settings.mode;
    }
}

void SettingsManager::load() {
    _settings.frequencyHz = preferences.getUShort("freq", 10);      // Default 10 Hz
    _settings.dwellMs = preferences.getFloat("dwell", 3.0f);        // Default 3.0 ms
    _settings.mode = static_cast<CoilMode>(preferences.getUChar("mode", MODE_CONTINUOUS));
    _settings.isRunning = false; // Always start stopped for safety
    
    // Sync saved state
    _savedSettings.frequencyHz = _settings.frequencyHz;
    _savedSettings.dwellMs = _settings.dwellMs;
    _savedSettings.mode = _settings.mode;
}

void SettingsManager::resetToDefaults() {
    _settings.frequencyHz = 10;
    _settings.dwellMs = 3.0f;
    _settings.mode = MODE_CONTINUOUS;
    _settings.isRunning = false;
}
