#ifndef MENU_PAGE_SPEEDO_TEMP_H
#define MENU_PAGE_SPEEDO_TEMP_H

#include "MenuPage.h"

class MenuPageSpeedoTemp : public MenuPage {
public:
    const char* getTitle() const override { return "SET TEMP"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.speedoTempPercent);
        int w = u8g2.getStrWidth(String(s.speedoTempPercent).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("%");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.speedoTempPercent / 100.0f; 
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.speedoTempPercent += diff; 
        if (s.speedoTempPercent < 0) s.speedoTempPercent = 0;
        if (s.speedoTempPercent > 100) s.speedoTempPercent = 100;
    }
};

#endif
