#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <U8g2lib.h>
#include "../core/SettingsManager.h"

// Forward declaration of MenuSystem to avoid circular dependency
class MenuSystem; 
class MenuPage;
class PeripheralManager;

class DisplayManager {
public:
    DisplayManager(SettingsManager& settingsMgr, PeripheralManager& periphMgr);
    
    void begin();
    
    // Call frequently to update the display
    void update(MenuSystem& menu);

private:
    SettingsManager& _settingsMgr;
    PeripheralManager& _periphMgr;
    
    // We use HW I2C, U8G2_R0 (no rotation)
    // You can change SSD1306_128X64_NONAME to your specific OLED type if needed
    U8G2_SSD1306_128X64_NONAME_F_HW_I2C _u8g2;

    void drawDashboard(MenuSystem& menu);
    void drawMenu(MenuSystem& menu);
    void drawMenuPage(MenuPage* page, int offX, bool editing);
    void drawScreenSaver();
};

#endif // DISPLAY_MANAGER_H
