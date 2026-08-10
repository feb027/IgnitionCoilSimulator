#ifndef PERIPHERAL_SPEEDO_H
#define PERIPHERAL_SPEEDO_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"
#include "../core/DigipotDriver.h"

class PeripheralSpeedo : public IPeripheral {
public:
    PeripheralSpeedo(SettingsManager& settingsMgr, SweepController& sweepController);
    
    void begin() override;
    void update() override;
    
    void start() override;
    void stop() override;
    void trigger() override;

    void drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) override;
    
    void handleEncoder(int diff, int focusIndex) override;
    int getMaxFocusIndex() const override;

private:
    SettingsManager& _settingsMgr;
    SweepController& _sweepController;
    DigipotDriver _tempPot;
    DigipotDriver _fuelPot;
    
    void updateTimerConfig();
};

#endif // PERIPHERAL_SPEEDO_H
