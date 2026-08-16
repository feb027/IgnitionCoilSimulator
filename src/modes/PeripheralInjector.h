#ifndef PERIPHERAL_INJECTOR_H
#define PERIPHERAL_INJECTOR_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"

class PeripheralInjector : public IPeripheral {
public:
    PeripheralInjector(SettingsManager& settingsMgr, SweepController& sweepController);
    ~PeripheralInjector() override = default;
    
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

    // Injector Specific Flow & Auto Health Scan
    void startFlowTest(int numPulses);
    void stopFlowTest();
    void startAutoDiag();
    void stopAutoDiag();

private:
    SettingsManager& _settingsMgr;
    SweepController& _sweepController;
    
    uint32_t _lastCurrentSampleTime;
    uint32_t _diagStartTime;
    
    void updateTimerConfig();
    void samplePrimaryCurrent();
    void updateAutoDiag();
};

#endif // PERIPHERAL_INJECTOR_H
