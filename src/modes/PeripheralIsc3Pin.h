#ifndef PERIPHERAL_ISC_3PIN_H
#define PERIPHERAL_ISC_3PIN_H

#include "core/IPeripheral.h"
#include "core/SettingsManager.h"

class PeripheralIsc3Pin : public IPeripheral {
public:
    PeripheralIsc3Pin(SettingsManager& settingsMgr);
    ~PeripheralIsc3Pin() override = default;

    void begin() override;
    void update() override;
    void syncHardware() override;
    void start() override;
    void stop() override;
    void trigger() override;

    bool shouldShowMenuItem(int menuIndex) override;
    const char* getModeString() override { return "ISC 3-PIN"; }
    void cycleRunMode(AppSettings& s, int direction) override;

    void drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) override;
    void handleEncoder(int diff, int focusIndex) override;
    void handleDashboardEncoder(int diff, AppSettings& s) override;
    int getMaxFocusIndex() const override { return 2; }

private:
    SettingsManager& _settingsMgr;
    float _lastDuty;
    int _lastFreq;
    bool _lastRunning;
    
    void updatePwmHardware();
};

#endif // PERIPHERAL_ISC_3PIN_H
