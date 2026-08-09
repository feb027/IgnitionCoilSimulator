#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include <U8g2lib.h>
#include "../core/SettingsManager.h"

// Forward declaration of MenuSystem to avoid circular dependency
class MenuSystem; 

class DisplayManager {
public:
    DisplayManager(SettingsManager& settingsMgr);
    
    void begin();
    
    // Call frequently to update the display
    void update(MenuSystem& menu);

private:
    SettingsManager& _settingsMgr;
    
    // We use HW I2C, U8G2_R0 (no rotation)
    // You can change SSD1306_128X64_NONAME to your specific OLED type if needed
    U8G2_SSD1306_128X64_NONAME_F_HW_I2C _u8g2;

    void drawDashboard();
    void drawMenu(MenuSystem& menu);
};

#endif // DISPLAY_MANAGER_H
