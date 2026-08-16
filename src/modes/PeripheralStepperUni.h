#ifndef PERIPHERAL_STEPPER_UNI_H
#define PERIPHERAL_STEPPER_UNI_H

#include "../core/IPeripheral.h"
#include "../core/SettingsManager.h"
#include <Arduino.h>

class PeripheralStepperUni : public IPeripheral {
public:
    PeripheralStepperUni(SettingsManager& settingsMgr);
    ~PeripheralStepperUni() override = default;

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
    
    // Continuous Stepper Controls
    void step(int direction);
    void setSpinDirection(int direction);

private:
    SettingsManager& _settingsMgr;
    
    int _currentStep;
    uint32_t _lastStepTime;
    int _autoDirection; // 1: CW, -1: CCW, 0: Stop
    float _fanAngle;
    
    void writeStep(int stepIndex);
};

#endif // PERIPHERAL_STEPPER_UNI_H
