#ifndef PERIPHERAL_SPEEDO_H
#define PERIPHERAL_SPEEDO_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"
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

    bool shouldShowMenuItem(int menuIndex) override;
    const char* getModeString() override;
    void cycleRunMode(AppSettings& s, int direction) override;
    void handleDashboardEncoder(int diff, AppSettings& s) override;

private:
    SettingsManager& _settingsMgr;
    SweepController& _sweepController;

    
    void updateTimerConfig();
};

#endif // PERIPHERAL_SPEEDO_H
