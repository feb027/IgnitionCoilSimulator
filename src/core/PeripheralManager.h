#ifndef PERIPHERAL_MANAGER_H
#define PERIPHERAL_MANAGER_H

#include "IPeripheral.h"
#include "SettingsManager.h"
#include "SweepController.h"
#include "../modes/PeripheralCoil.h"
#include "../modes/PeripheralPwm.h"
#include "../modes/PeripheralSpeedo.h"

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
    
    PeripheralCoil _coil;
    PeripheralPwm _pwm;
    PeripheralSpeedo _speedo;
    
    IPeripheral* _peripherals[3];
};

#endif // PERIPHERAL_MANAGER_H
