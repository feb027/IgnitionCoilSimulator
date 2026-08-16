#ifndef PERIPHERAL_COIL_ACTIVE_4P_H
#define PERIPHERAL_COIL_ACTIVE_4P_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"

class PeripheralCoilActive4P : public IPeripheral {
public:
    PeripheralCoilActive4P(SettingsManager& settingsMgr, SweepController& sweepController);
    ~PeripheralCoilActive4P() override = default;
    
    void begin() override;
    void update() override;
    void syncHardware() override;
    
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

    // Diagnostic Specific Methods
    void startAutoDiag();
    void stopAutoDiag();
    void resetCounters();

private:
    SettingsManager& _settingsMgr;
    SweepController& _sweepController;
    
    uint32_t _diagStartTime;
    uint32_t _lastCurrentSampleTime;
    
    void updateTimerConfig();
    void updateAutoDiag();
    void samplePrimaryCurrent();
};

#endif // PERIPHERAL_COIL_ACTIVE_4P_H
