#ifndef MENU_SYSTEM_H
#define MENU_SYSTEM_H

#include <ESP32Encoder.h>
#include "../core/SettingsManager.h"

class CoilDriver;

class MenuSystem {
public:
    MenuSystem(SettingsManager& settingsMgr, CoilDriver& driver);
    
    void begin();
    void update();
    
    bool isInMenu() const { return _inMenu; }
    int getSelectedIndex() const { return _selectedIndex; }
    bool isEditing() const { return _isEditing; }

private:
    SettingsManager& _settingsMgr;
    CoilDriver& _driver;
    
    ESP32Encoder _encoder;
    
    // Non-blocking Debounce state
    bool _rawButtonState;
    bool _stableButtonState;
    uint32_t _lastDebounceTime;
    uint32_t _buttonPressTime;
    bool _buttonLongPressed;

    // Menu state
    bool _inMenu;
    int _selectedIndex; // 0=Freq, 1=Dwell, 2=Mode, 3=Exit
    bool _isEditing;
    int32_t _lastEncoderCount;
    
    void handleButton();
    void handleEncoder();
};

#endif // MENU_SYSTEM_H
