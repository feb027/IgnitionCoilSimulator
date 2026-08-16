#ifndef PERIPHERAL_STEPPER_IACV_H
#define PERIPHERAL_STEPPER_IACV_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include <Arduino.h>

class PeripheralStepperIacv : public IPeripheral {
public:
    PeripheralStepperIacv(SettingsManager& settingsMgr);
    ~PeripheralStepperIacv() override = default;

    void begin() override;
    void update() override;
    void start() override;
    void stop() override;
    void trigger() override;
    
    void drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) override;
    int getMaxFocusIndex() const override;
    void handleEncoder(int diff, int focusIndex) override;
    void syncHardware() override;

    bool shouldShowMenuItem(int menuIndex) override;
    const char* getModeString() override;
    void cycleRunMode(AppSettings& s, int direction) override;
    void handleDashboardEncoder(int diff, AppSettings& s) override;
    
    // IACV Specific Controls
    void setTargetSteps(int target);
    void startAutoCalibrate();
    void cycleSweepTest();

private:
    SettingsManager& _settingsMgr;
    
    int _phaseIndex;
    uint32_t _lastStepTime;
    
    bool _isAutoCycling;
    int _cycleDirection; // 1 for opening, -1 for closing
    int _calibStepsLeft;
    
    void writeStepPhase(int phase);
    void stepMotor(int direction);
};

#endif // PERIPHERAL_STEPPER_IACV_H
