#ifndef MENU_SYSTEM_H
#define MENU_SYSTEM_H

#define NUM_PAGES 12

#include <ESP32Encoder.h>
#include "../core/SettingsManager.h"

#include "pages/MenuPage.h"

class CoilDriver;

class MenuSystem {
public:
    MenuSystem(SettingsManager& settingsMgr, CoilDriver& driver);
    
    void begin();
    void update();
    
    // Display getters
    bool isInMenu() const { return _inMenu; }
    bool isDashboardEditMode() const { return _dashboardEditMode; }
    int getDashboardFocusIndex() const { return _dashboardFocusIndex; }
    void drawMenu(U8G2& u8g2) const;
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
    
    // Double click state
    uint32_t _lastClickTime;
    bool _awaitingDoubleClick;

    // Menu state
    bool _inMenu;
    bool _dashboardEditMode;
    int _dashboardFocusIndex;
    int _selectedIndex; 
    int _lastSelectedIndex;
    bool _isEditing;
    int32_t _lastEncoderCount;
    
    MenuPage* _pages[NUM_PAGES];
    int _numPages;
    
    float _scrollOffset;
    uint32_t _lastActivityMs;
    
    void handleButton();
    void handleEncoder();
    void executeSingleClick();
};

#endif // MENU_SYSTEM_H
