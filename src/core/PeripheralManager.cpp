#include "PeripheralManager.h"

PeripheralManager::PeripheralManager(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), 
      _sweepController(settingsMgr),
      _coilPassive(settingsMgr, _sweepController),
      _coilActive3P(settingsMgr, _sweepController),
      _coilActive4P(settingsMgr, _sweepController),
      _injector(settingsMgr, _sweepController),
      _pwm(settingsMgr, _sweepController),
      _isc3pin(settingsMgr),
      _speedo(settingsMgr, _sweepController),
      _stepperIacv(settingsMgr),
      _stepperUni(settingsMgr),
      _hallDac(settingsMgr, _sweepController) {
          
    _peripherals[0] = &_coilPassive;
    _peripherals[1] = &_coilActive3P;
    _peripherals[2] = &_coilActive4P;
    _peripherals[3] = &_injector;
    _peripherals[4] = &_pwm;
    _peripherals[5] = &_isc3pin;
    _peripherals[6] = &_speedo;
    _peripherals[7] = &_stepperIacv;
    _peripherals[8] = &_stepperUni;
    _peripherals[9] = &_hallDac;
}

void PeripheralManager::begin() {
    for (int i = 0; i < 10; i++) {
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
    for (int i = 0; i < 10; i++) {
        _peripherals[i]->stop();
    }
}

void PeripheralManager::trigger() {
    getActive()->trigger();
}

IPeripheral* PeripheralManager::getActive() {
    AppSettings& s = _settingsMgr.getSettings();
    int modeIndex = (int)s.pulseMode;
    if (modeIndex < 0 || modeIndex > 9) {
        modeIndex = 0; // Fallback
    }
    return _peripherals[modeIndex];
}
