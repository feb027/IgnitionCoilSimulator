#ifndef MENU_PAGE_SPEEDO_KMH_H
#define MENU_PAGE_SPEEDO_KMH_H

#include "MenuPage.h"

class MenuPageSpeedoKmh : public MenuPage {
public:
    const char* getTitle() const override { return "SET KM/H"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.speedoKmh);
        int w = u8g2.getStrWidth(String(s.speedoKmh).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("KM/H");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.speedoKmh / 300.0f; // Max 300 km/h
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.speedoKmh += (diff * 10); 
        if (s.speedoKmh < 0) s.speedoKmh = 0;
        if (s.speedoKmh > 300) s.speedoKmh = 300;
    }
};

#endif
