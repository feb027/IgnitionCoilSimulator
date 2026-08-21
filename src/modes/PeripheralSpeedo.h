#ifndef PERIPHERAL_SPEEDO_H
#define PERIPHERAL_SPEEDO_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"

class PeripheralSpeedo : public IPeripheral {
public:
    PeripheralSpeedo(SettingsManager& settingsMgr, SweepController& sweepController);
    ~PeripheralSpeedo() override = default;
    
    void begin() override;
    void update() override;
    
    void start() override;
    void stop() override;
    void trigger() override;
    void syncHardware() override;

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
    bool _dacFuelFound;
    bool _dacTempFound;
    uint32_t _lastDacPollMs;
    
    // Hardware state cache to prevent continuous LEDC timer register resets and I2C flooding
    float _lastHzRpm;
    float _lastHzKmh;
    bool  _lastRpmActive;
    bool  _lastKmhActive;
    bool  _lastTempActive;
    bool  _lastFuelActive;
    uint32_t _lastDutyTemp;
    uint32_t _lastDutyFuel;
    int   _lastPwmFreq;
    float _lastDacFuelVolt;
    float _lastDacTempVolt;
    
    void detectDacs();
    void writeDac(uint8_t addr, float volts);
    void updateTimerConfig();
};

#endif // PERIPHERAL_SPEEDO_H
