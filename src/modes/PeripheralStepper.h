#ifndef PERIPHERAL_STEPPER_H
#define PERIPHERAL_STEPPER_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include "../core/SweepController.h"
#include <Arduino.h>

class PeripheralStepper : public IPeripheral {
public:
    PeripheralStepper(SettingsManager& settingsMgr);

    void begin() override;
    void update() override;
    void start() override;
    void stop() override;
    void trigger() override;
    
    // UI specific
    void drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) override;
    int getMaxFocusIndex() const override;
    void handleEncoder(int diff, int focusIndex) override;
    void syncHardware() override;

    bool shouldShowMenuItem(int menuIndex) override;
    const char* getModeString() override;
    void cycleRunMode(AppSettings& s, int direction) override;
    void handleDashboardEncoder(int diff, AppSettings& s) override;
    
    // Stepper specific actions
    void step(int direction); // 1 for forward, -1 for backward
    void setSpinDirection(int direction);
    
private:
    SettingsManager& _settingsMgr;
    SweepController _sweepController; // Reuse sweep controller for automated sweeps
    
    int _currentStep;
    uint32_t _lastStepTime;
    
    int _autoDirection; // 1 for right, -1 for left, 0 for stop
    float _fanAngle; // 0 to 360 for animation
    
    void updateTimerConfig();
    void writeStep(int stepIndex);
};

#endif
