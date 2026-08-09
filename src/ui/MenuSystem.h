#ifndef MENU_SYSTEM_H
#define MENU_SYSTEM_H

#include <ESP32Encoder.h>
#include "../core/SettingsManager.h"

#include "pages/MenuPage.h"

class CoilDriver;

class MenuSystem {
public:
    MenuSystem(SettingsManager& settingsMgr, CoilDriver& driver);
    
    void begin();
    void update();
    
    bool isInMenu() const { return _inMenu; }
    int getSelectedIndex() const { return _selectedIndex; }
    int getPreviousSelectedIndex() const { return _lastSelectedIndex; }
    bool isEditing() const { return _isEditing; }
    float getScrollOffset() const { return _scrollOffset; }
    uint32_t getLastActivityMs() const { return _lastActivityMs; }

    MenuPage* getCurrentPage() const { return _pages[_selectedIndex]; }
    MenuPage* getPreviousPage() const { return _pages[_lastSelectedIndex]; }

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
    int _selectedIndex; 
    int _lastSelectedIndex;
    bool _isEditing;
    int32_t _lastEncoderCount;
    
    MenuPage* _pages[4];
    int _numPages;
    
    float _scrollOffset;
    uint32_t _lastActivityMs;
    
    void handleButton();
    void handleEncoder();
};

#endif // MENU_SYSTEM_H
