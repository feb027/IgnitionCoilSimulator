#include "DisplayManager.h"
#include "MenuSystem.h"
#include "pages/MenuPage.h"
#include "../core/PeripheralManager.h"
#include "config/Pins.h"
#include <Wire.h>

DisplayManager::DisplayManager(SettingsManager& settingsMgr, PeripheralManager& periphMgr) 
    : _settingsMgr(settingsMgr), 
      _periphMgr(periphMgr),
      _u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE, PIN_OLED_SCL, PIN_OLED_SDA) {
}

void DisplayManager::begin() {
    _u8g2.setBusClock(400000); // 400kHz Fast I2C for higher FPS
    _u8g2.begin();
    _u8g2.setContrast(255);
}

void DisplayManager::update(MenuSystem& menu) {
    _u8g2.clearBuffer();
    
    AppSettings& s = _settingsMgr.getSettings();
    if (!s.isRunning && millis() - menu.getLastActivityMs() > 180000) { // 3 minutes
        drawScreenSaver();
    } else {
        if (menu.isInMenu()) {
            drawMenu(menu);
        } else {
            drawDashboard(menu);
        }
    }
    
    _u8g2.sendBuffer();
}

void DisplayManager::drawDashboard(MenuSystem& menu) {
    AppSettings& s = _settingsMgr.getSettings();

    // ZONE 1: Header (Status & Mode)
    _u8g2.setFont(u8g2_font_helvB08_tr); 
    
    bool isFiring = s.isRunning || (millis() - s.lastFiredMs < 1000);
    if (isFiring) {
        // Feature 5: Graphic Icon (Lightning Bolt)
        _u8g2.drawLine(5, 2, 2, 8);
        _u8g2.drawLine(2, 8, 8, 8);
        _u8g2.drawLine(8, 8, 4, 14);
        _u8g2.setCursor(12, 10);
        _u8g2.print("ON | ");
    } else {
        _u8g2.setCursor(0, 10);
        _u8g2.print("OFF | ");
    }

    bool editMode = menu.isDashboardEditMode();
    int focusIdx = menu.getDashboardFocusIndex();
    
    const char* modeStr = _periphMgr.getActive()->getModeString();
    
    int modeWidth = _u8g2.getStrWidth(modeStr);
    int modeX = 128 - modeWidth; // Right align

    // Highlight MODE if it's the current focus and mode has selectable run modes
    bool hasRunModes = (s.pulseMode != PULSE_ISC3PIN && s.pulseMode != PULSE_STEPPER);
    if (editMode && focusIdx == 0 && hasRunModes) {
        _u8g2.setDrawColor(1);
        _u8g2.drawBox(modeX - 2, 0, modeWidth + 4, 14); // Box around mode text area
        _u8g2.setDrawColor(0);
    } else {
        _u8g2.setDrawColor(1);
    }
    
    _u8g2.setCursor(modeX, 10);
    _u8g2.print(modeStr);
    
    _u8g2.setDrawColor(1); // Restore default color

    
    _u8g2.drawLine(0, 15, 128, 15);
    
    // Delegate the rest of the layout to the active peripheral
    _periphMgr.getActive()->drawDashboard(_u8g2, focusIdx, editMode);
    
    _u8g2.setDrawColor(1);
}

void DisplayManager::drawMenu(MenuSystem& menu) {
    bool editing = menu.isEditing();
    int offX = (int)menu.getScrollOffset(); // Feature 2: Smooth Scrolling

    _u8g2.setFontMode(1); // Transparent background for text

    if (offX != 0 && menu.getPreviousSelectedIndex() != menu.getSelectedIndex()) {
        // Scrolling in progress, draw both pages
        drawMenuPage(menu.getCurrentPage(), offX, false); // New page sliding in
        int oldOffX = offX > 0 ? offX - 128 : offX + 128;
        drawMenuPage(menu.getPreviousPage(), oldOffX, false); // Old page sliding out
    } else {
        // Not scrolling, draw normally
        drawMenuPage(menu.getCurrentPage(), 0, editing);
    }
}

void DisplayManager::drawMenuPage(MenuPage* page, int offX, bool editing) {
    if (!page) return;
    AppSettings& s = _settingsMgr.getSettings();
    
    // 1. Draw Title
    _u8g2.setFont(u8g2_font_helvB10_tr);
    _u8g2.setCursor(offX, 15);
    _u8g2.print(page->getTitle());

    // 2. Edit indicator / Inverse Setup
    int boxY = 28;
    int boxH = 26;
    if (editing) {
        _u8g2.setDrawColor(1);
        _u8g2.drawBox(offX, boxY, 128, boxH);
        _u8g2.setDrawColor(0); // Text will be drawn black (inverse)
    } else {
        _u8g2.setDrawColor(1); // Normal white text
    }

    // 3. Draw Values
    _u8g2.setFont(u8g2_font_helvB18_tr); 
    _u8g2.setCursor(5 + offX, 48); // Baseline for custom draw operations
    
    page->drawValue(_u8g2, offX, s);

    // Reset draw color back to white for progress bar and next frame
    _u8g2.setDrawColor(1);
    
    // 4. Draw Progress Bar (Bottom)
    float progress = page->getProgress(s);
    if (progress >= 0.0f) {
        _u8g2.drawFrame(offX, 58, 128, 6);
        if (progress > 1.0f) progress = 1.0f;
        if (progress < 0.0f) progress = 0.0f;
        int barW = (int)(progress * 124.0f);
        if (barW > 0) {
            _u8g2.drawBox(2 + offX, 60, barW, 2);
        }
    }
}

// Feature 4: Screen Saver
void DisplayManager::drawScreenSaver() {
    static int x = 0;
    static int y = 30;
    static int dx = 2;
    static int dy = 2;
    
    x += dx;
    y += dy;
    
    if (x <= 0 || x >= 70) dx = -dx;
    if (y <= 10 || y >= 64) dy = -dy;
    
    _u8g2.setFont(u8g2_font_helvB08_tr);
    _u8g2.setCursor(x, y);
    _u8g2.print("ESP32 IDLE");
}
