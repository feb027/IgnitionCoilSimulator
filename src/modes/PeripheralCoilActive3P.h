#ifndef PERIPHERAL_COIL_ACTIVE_3P_H
#define PERIPHERAL_COIL_ACTIVE_3P_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"

class PeripheralCoilActive3P : public IPeripheral {
public:
    PeripheralCoilActive3P(SettingsManager& settingsMgr, SweepController& sweepController);
    ~PeripheralCoilActive3P() override = default;
    
    void begin() override;
    void update() override;
    void syncHardware() override;
    
    void start() override;
    void stop() override;
    void trigger() override;
    void probeCoil() override;
    void resetCounters() override;

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
    uint32_t _lastCurrentSampleTime;
    float _zeroCurrentVoltage;
    float _sumPeakAmps;
    uint32_t _sampleCountAmps;
    float _sumSparkmA;
    uint32_t _sampleCountSpark;
    
    void updateTimerConfig();
    void samplePrimaryCurrent();
};

#endif // PERIPHERAL_COIL_ACTIVE_3P_H
