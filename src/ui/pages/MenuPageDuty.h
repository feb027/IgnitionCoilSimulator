#ifndef MENU_PAGE_DUTY_H
#define MENU_PAGE_DUTY_H

#include "MenuPage.h"

class MenuPageDuty : public MenuPage {
public:
    const char* getTitle() const override { return "SET DUTY"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.dutyCycle, 1);
        int w = u8g2.getStrWidth(String(s.dutyCycle, 1).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("%");
    }
    
    float getProgress(const AppSettings& s) const override {
        return s.dutyCycle / 100.0f;
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.dutyCycle += (diff * 1.0f); // 1% per click
        if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
        if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
    }
};

#endif
