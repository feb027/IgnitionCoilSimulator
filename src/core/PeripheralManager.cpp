#include "PeripheralManager.h"

PeripheralManager::PeripheralManager(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), 
      _sweepController(settingsMgr),
      _coil(settingsMgr, _sweepController),
      _pwm(settingsMgr, _sweepController),
      _speedo(settingsMgr, _sweepController) {
          
    _peripherals[0] = &_coil;
    _peripherals[1] = &_pwm;
    _peripherals[2] = &_speedo;
}

void PeripheralManager::begin() {
    for (int i = 0; i < 3; i++) {
        _peripherals[i]->begin();
    }
}

void PeripheralManager::update() {
    getActive()->update();
}

void PeripheralManager::start() {
    getActive()->start();
}

void PeripheralManager::stop() {
    // To be safe, stop all peripherals to ensure no hardware is left running
    for (int i = 0; i < 3; i++) {
        _peripherals[i]->stop();
    }
}

void PeripheralManager::trigger() {
    getActive()->trigger();
}

IPeripheral* PeripheralManager::getActive() {
    AppSettings& s = _settingsMgr.getSettings();
    int modeIndex = (int)s.pulseMode;
    if (modeIndex < 0 || modeIndex > 2) {
        modeIndex = 0; // Fallback
    }
    return _peripherals[modeIndex];
}
