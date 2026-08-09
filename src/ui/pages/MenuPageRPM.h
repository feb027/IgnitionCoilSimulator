#ifndef MENU_PAGE_RPM_H
#define MENU_PAGE_RPM_H

#include "MenuPage.h"
#include "../../core/CoilDriver.h" // For MAX_RPM

class MenuPageRPM : public MenuPage {
public:
    const char* getTitle() const override { return "SET RPM"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.rpm);
        int w = u8g2.getStrWidth(String(s.rpm).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("RPM");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.rpm / (float)MAX_RPM;
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.rpm += (diff * 10); // 10 RPM per click
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > MAX_RPM) s.rpm = MAX_RPM;
    }
};

#endif
