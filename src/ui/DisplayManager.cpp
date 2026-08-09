#include "DisplayManager.h"
#include "../core/CoilDriver.h"
#include "MenuSystem.h"
#include "config/Pins.h"
#include <Wire.h>

DisplayManager::DisplayManager(SettingsManager& settingsMgr) 
    : _settingsMgr(settingsMgr),
      _u8g2(U8G2_R0, /* reset=*/ U8X8_PIN_NONE, PIN_OLED_SCL, PIN_OLED_SDA) {
}

void DisplayManager::begin() {
    // Note: The Wemos D1 R32 pins for I2C are 22 (SCL) and 21 (SDA) by default.
    // U8g2 will use the default Wire object if not specified, but passing pins ensures correctness.
    _u8g2.begin();
}

void DisplayManager::update(MenuSystem& menu) {
    _u8g2.clearBuffer();
    
    AppSettings& s = _settingsMgr.getSettings();
    if (!s.isRunning && millis() - menu.getLastActivityMs() > 300000) { // 5 minutes
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
        _u8g2.print("FIRING | ");
    } else {
        _u8g2.setCursor(0, 10);
        _u8g2.print("[STOP] | ");
    }

    switch(s.mode) {
        case MODE_CONTINUOUS: _u8g2.print("CONTINUOUS"); break;
        case MODE_BURST: _u8g2.print("BURST"); break;
        case MODE_SINGLE: _u8g2.print("SINGLE"); break;
        case MODE_SWEEP: _u8g2.print("SWEEP"); break;
    }
    
    _u8g2.drawLine(0, 15, 128, 15);

    if (s.pulseMode == PULSE_SPEEDO) {
        // 2x2 Grid Layout
        
        bool editMode = menu.isDashboardEditMode();
        int focusIdx = menu.getDashboardFocusIndex();
        
        auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
            if (editMode && focusIdx == idx) {
                _u8g2.setDrawColor(1);
                _u8g2.drawBox(x, y, w, h);
                _u8g2.setDrawColor(0);
            } else {
                _u8g2.setDrawColor(1);
            }
        };

        // Vertical center line
        _u8g2.drawLine(64, 15, 64, 64);
        // Horizontal center line
        _u8g2.drawLine(0, 39, 128, 39);

        // Top Left: KM/H (Idx 0)
        drawHighlight(0, 0, 16, 63, 23);
        _u8g2.setFont(u8g2_font_helvB08_tr);
        _u8g2.setCursor(2, 25);
        _u8g2.print("KM/H");
        _u8g2.setFont(u8g2_font_helvB10_tr);
        _u8g2.setCursor(2, 37);
        _u8g2.print(s.speedoKmh);

        // Top Right: RPM (Idx 1)
        drawHighlight(1, 65, 16, 63, 23);
        _u8g2.setFont(u8g2_font_helvB08_tr);
        _u8g2.setCursor(68, 25);
        _u8g2.print("RPM");
        _u8g2.setFont(u8g2_font_helvB10_tr);
        _u8g2.setCursor(68, 37);
        _u8g2.print(s.speedoRpm);

        // Bottom Left: TEMP (Idx 2)
        drawHighlight(2, 0, 40, 63, 24);
        _u8g2.setFont(u8g2_font_helvB08_tr);
        _u8g2.setCursor(2, 49);
        _u8g2.print("TEMP");
        _u8g2.setFont(u8g2_font_helvB10_tr);
        _u8g2.setCursor(2, 61);
        _u8g2.print(s.speedoTempPercent);
        _u8g2.print("%");

        // Bottom Right: FUEL (Idx 3)
        drawHighlight(3, 65, 40, 63, 24);
        _u8g2.setFont(u8g2_font_helvB08_tr);
        _u8g2.setCursor(68, 49);
        _u8g2.print("FUEL");
        _u8g2.setFont(u8g2_font_helvB10_tr);
        _u8g2.setCursor(68, 61);
        _u8g2.print(s.speedoFuelPercent);
        _u8g2.print("%");
        
        _u8g2.setDrawColor(1); // Restore default draw color
        
        return;
    }

    // ZONE 2: Middle (Giant RPM)
    _u8g2.setFont(u8g2_font_inb21_mr); // Very large number font
    String rpmStr = String(s.rpm);
    int rpmWidth = _u8g2.getStrWidth(rpmStr.c_str());
    
    _u8g2.setCursor(15, 45);
    _u8g2.print(rpmStr);
    
    _u8g2.setFont(u8g2_font_helvB12_tr);
    _u8g2.setCursor(15 + rpmWidth + 5, 45);
    if (s.pulseMode == PULSE_SPEEDO) {
        _u8g2.print("km/h");
    } else {
        _u8g2.print("RPM");
    }

    // ZONE 3: Bottom (Dwell and Duty Cycle)
    _u8g2.setCursor(0, 64);
    
    String dwellStr = String(s.dwellMs, 1) + " ms";
    String dutyStr = String(s.dutyCycle, 1) + "% DC";
    
    if (s.pulseMode == PULSE_DWELL) {
        // Dwell is the master (bold, left)
        _u8g2.setFont(u8g2_font_helvB12_tr); 
        _u8g2.print(dwellStr);
        
        // Duty is secondary (small, right)
        _u8g2.setFont(u8g2_font_helvB08_tr);
        int dutyW = _u8g2.getStrWidth(dutyStr.c_str());
        
        // Feature 3: Visual Overheat Warning
        if (s.dutyCycle > 60.0f && (millis() / 250) % 2 == 0) {
            _u8g2.setDrawColor(1);
            _u8g2.drawBox(128 - dutyW - 2, 64 - 10, dutyW + 4, 12);
            _u8g2.setDrawColor(0);
            _u8g2.setFontMode(1);
        }
        _u8g2.setCursor(128 - dutyW, 64);
        _u8g2.print(dutyStr);
        _u8g2.setDrawColor(1);
    } else {
        // Duty is the master (bold, left)
        _u8g2.setFont(u8g2_font_helvB12_tr); 
        _u8g2.print(dutyStr);
        
        // Dwell is secondary (small, right)
        _u8g2.setFont(u8g2_font_helvB08_tr);
        int dwellW = _u8g2.getStrWidth(dwellStr.c_str());
        _u8g2.setCursor(128 - dwellW, 64);
        _u8g2.print(dwellStr);
    }
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
