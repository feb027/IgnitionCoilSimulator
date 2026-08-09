#ifndef MENU_PAGE_SPEEDO_RPM_H
#define MENU_PAGE_SPEEDO_RPM_H

#include "MenuPage.h"
#include "../../core/CoilDriver.h" // For MAX_RPM

class MenuPageSpeedoRpm : public MenuPage {
public:
    const char* getTitle() const override { return "SPEEDO RPM"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.speedoRpm);
        int w = u8g2.getStrWidth(String(s.speedoRpm).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("RPM");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.speedoRpm / 12000.0f; // Max 12000 RPM for speedo
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.speedoRpm += (diff * 100); 
        if (s.speedoRpm < 0) s.speedoRpm = 0;
        if (s.speedoRpm > 12000) s.speedoRpm = 12000;
    }
};

#endif
