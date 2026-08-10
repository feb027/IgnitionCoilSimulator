#ifndef PERIPHERAL_PWM_H
#define PERIPHERAL_PWM_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"

class PeripheralPwm : public IPeripheral {
public:
    PeripheralPwm(SettingsManager& settingsMgr, SweepController& sweepController);
    
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
    
    void updateTimerConfig();
};

#endif // PERIPHERAL_PWM_H
