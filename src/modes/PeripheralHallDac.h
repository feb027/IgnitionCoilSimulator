#ifndef PERIPHERAL_HALL_DAC_H
#define PERIPHERAL_HALL_DAC_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"
#include <Wire.h>

class PeripheralHallDac : public IPeripheral {
public:
    PeripheralHallDac(SettingsManager& settingsMgr, SweepController& sweepController);
    ~PeripheralHallDac() override = default;

    void begin() override;
    void update() override;
    void syncHardware() override;

    void start() override;
    void stop() override;
    void trigger() override;

    void drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) override;
    int getMaxFocusIndex() const override;
    void handleEncoder(int diff, int focusIndex) override;

    bool shouldShowMenuItem(int menuIndex) override;
    const char* getModeString() override;
    void cycleRunMode(AppSettings& s, int direction) override;
    void handleDashboardEncoder(int diff, AppSettings& s) override;

    // DAC specific helper
    void setVoltage(float volts);

private:
    SettingsManager& _settingsMgr;
    SweepController& _sweepController;
    uint8_t _i2cAddr;
    bool _isFound;
    uint32_t _lastWaveTime;
    float _sweepVolt;
    int _sweepDir; // 1: rising, -1: falling
    float _sineAngle;

    bool detectDevice();
    void writeDac(uint16_t dacValue);
    void writeVoltage(float volts);
};

#endif // PERIPHERAL_HALL_DAC_H
