#ifndef PERIPHERAL_MANAGER_H
#define PERIPHERAL_MANAGER_H

#include "IPeripheral.h"
#include "SettingsManager.h"
#include "SweepController.h"
#include "../modes/PeripheralCoilPassive.h"
#include "../modes/PeripheralCoilActive3P.h"
#include "../modes/PeripheralCoilActive4P.h"
#include "../modes/PeripheralInjector.h"
#include "../modes/PeripheralPwm.h"
#include "../modes/PeripheralIsc3Pin.h"
#include "../modes/PeripheralSpeedo.h"
#include "../modes/PeripheralStepperIacv.h"
#include "../modes/PeripheralStepperUni.h"
#include "../modes/PeripheralHallDac.h"

class PeripheralManager {
public:
    PeripheralManager(SettingsManager& settingsMgr);
    
    void begin();
    void update();
    
    void start();
    void stop();
    void trigger();
    
    // Returns the currently active peripheral
    IPeripheral* getActive();

private:
    SettingsManager& _settingsMgr;
    SweepController _sweepController;
    
    PeripheralCoilPassive _coilPassive;
    PeripheralCoilActive3P _coilActive3P;
    PeripheralCoilActive4P _coilActive4P;
    PeripheralInjector _injector;
    PeripheralPwm _pwm;
    PeripheralIsc3Pin _isc3pin;
    PeripheralSpeedo _speedo;
    PeripheralStepperIacv _stepperIacv;
    PeripheralStepperUni _stepperUni;
    PeripheralHallDac _hallDac;
    
    IPeripheral* _peripherals[10];
};

#endif // PERIPHERAL_MANAGER_H
