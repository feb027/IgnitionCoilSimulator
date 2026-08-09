#ifndef MENU_PAGE_SPEEDO_FUEL_H
#define MENU_PAGE_SPEEDO_FUEL_H

#include "MenuPage.h"

class MenuPageSpeedoFuel : public MenuPage {
public:
    const char* getTitle() const override { return "SET FUEL"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.speedoFuelPercent);
        int w = u8g2.getStrWidth(String(s.speedoFuelPercent).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("%");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.speedoFuelPercent / 100.0f; 
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.speedoFuelPercent += diff; 
        if (s.speedoFuelPercent < 0) s.speedoFuelPercent = 0;
        if (s.speedoFuelPercent > 100) s.speedoFuelPercent = 100;
    }
};

#endif
