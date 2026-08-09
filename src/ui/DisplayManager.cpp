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

    if (menu.isInMenu()) {
        drawMenu(menu);
    } else {
        drawDashboard();
    }

    _u8g2.sendBuffer();
}

void DisplayManager::drawDashboard() {
    AppSettings& s = _settingsMgr.getSettings();

    // ZONE 1: Header (Status & Mode)
    _u8g2.setFont(u8g2_font_helvB08_tr); 
    _u8g2.setCursor(0, 10);
    
    // Feature B: Visual feedback for Single/Burst
    bool isFiring = s.isRunning || (millis() - s.lastFiredMs < 1000);
    if (isFiring) {
        _u8g2.print("[FIRING] | ");
    } else {
        _u8g2.print("[STOP] | ");
    }

    switch(s.mode) {
        case MODE_CONTINUOUS: _u8g2.print("CONTINUOUS"); break;
        case MODE_BURST: _u8g2.print("BURST"); break;
        case MODE_SINGLE: _u8g2.print("SINGLE"); break;
    }
    
    // Separator Line
    _u8g2.drawLine(0, 14, 128, 14);

    // ZONE 2: Middle (Giant Frequency)
    _u8g2.setFont(u8g2_font_inb21_mr); // Very large number font
    String freqStr = String(s.frequencyHz);
    int freqWidth = _u8g2.getStrWidth(freqStr.c_str());
    
    _u8g2.setCursor(15, 45);
    _u8g2.print(freqStr);
    
    _u8g2.setFont(u8g2_font_helvB12_tr);
    _u8g2.setCursor(15 + freqWidth + 5, 45);
    _u8g2.print("Hz");

    // ZONE 3: Bottom (Dwell and Duty Cycle)
    // Dwell (Left aligned)
    _u8g2.setFont(u8g2_font_helvB12_tr); 
    _u8g2.setCursor(0, 64);
    String dwellStr = String(s.dwellMs, 1);
    _u8g2.print(dwellStr);
    
    int dwellWidth = _u8g2.getStrWidth(dwellStr.c_str());
    _u8g2.setFont(u8g2_font_helvB08_tr);
    _u8g2.setCursor(dwellWidth + 2, 64);
    _u8g2.print("ms");
    
    // Duty Cycle (Right aligned)
    float periodMs = 1000.0f / s.frequencyHz;
    int duty = (int)((s.dwellMs / periodMs) * 100.0f);
    
    _u8g2.setFont(u8g2_font_helvB08_tr);
    String dutyStr = String(duty) + "% DC";
    int dutyW = _u8g2.getStrWidth(dutyStr.c_str());
    _u8g2.setCursor(128 - dutyW, 64);
    _u8g2.print(dutyStr);
}

void DisplayManager::drawMenu(MenuSystem& menu) {
    AppSettings& s = _settingsMgr.getSettings();
    int selected = menu.getSelectedIndex();
    bool editing = menu.isEditing();

    _u8g2.setFontMode(1); // Transparent background for text

    // 1. Draw Title
    _u8g2.setFont(u8g2_font_helvB10_tr);
    _u8g2.setCursor(0, 15);
    if (selected == 0) _u8g2.print("SET FREQ");
    else if (selected == 1) _u8g2.print("SET DWELL");
    else if (selected == 2) _u8g2.print("SET MODE");
    else if (selected == 3) _u8g2.print("EXIT MENU");

    // 2. Edit indicator / Inverse Setup
    int boxY = 28;
    int boxH = 26;
    if (editing) {
        // Draw inverse highlight box
        _u8g2.setDrawColor(1);
        _u8g2.drawBox(0, boxY, 128, boxH);
        _u8g2.setDrawColor(0); // Text will be drawn black (inverse)
    } else {
        _u8g2.setDrawColor(1); // Normal white text
    }

    // 3. Draw Values
    _u8g2.setFont(u8g2_font_helvB18_tr); 
    _u8g2.setCursor(5, 48); // Offset 5px inside the box

    float progress = 0.0f;

    if (selected == 0) {
        _u8g2.print(s.frequencyHz);
        int w = _u8g2.getStrWidth(String(s.frequencyHz).c_str());
        _u8g2.setFont(u8g2_font_helvB14_tr);
        _u8g2.setCursor(w + 10, 48);
        _u8g2.print("Hz");
        progress = (float)(s.frequencyHz - 1) / (float)(MAX_FREQ_HZ - 1);
    } else if (selected == 1) {
        _u8g2.print(s.dwellMs, 1);
        int w = _u8g2.getStrWidth(String(s.dwellMs, 1).c_str());
        _u8g2.setFont(u8g2_font_helvB14_tr);
        _u8g2.setCursor(w + 10, 48);
        _u8g2.print("ms");
        progress = (s.dwellMs - 0.1f) / (MAX_DWELL_MS - 0.1f);
    } else if (selected == 2) {
        _u8g2.setFont(u8g2_font_helvB14_tr); 
        if (s.mode == MODE_CONTINUOUS) _u8g2.print("CONTINUOUS");
        else if (s.mode == MODE_BURST) _u8g2.print("BURST");
        else if (s.mode == MODE_SINGLE) _u8g2.print("SINGLE");
        else if (s.mode == MODE_SWEEP) _u8g2.print("SWEEP");
        progress = (float)s.mode / 3.0f;
    } else if (selected == 3) {
        _u8g2.setFont(u8g2_font_helvB12_tr); 
        _u8g2.print("Click to exit");
    }

    // Reset draw color back to white for progress bar and next frame
    _u8g2.setDrawColor(1);
    
    // 4. Draw Progress Bar (Bottom)
    if (selected != 3) {
        _u8g2.drawFrame(0, 58, 128, 6);
        if (progress > 1.0f) progress = 1.0f;
        if (progress < 0.0f) progress = 0.0f;
        int barW = (int)(progress * 124.0f);
        if (barW > 0) {
            _u8g2.drawBox(2, 60, barW, 2);
        }
    }
}
