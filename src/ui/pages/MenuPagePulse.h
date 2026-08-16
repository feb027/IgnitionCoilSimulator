#ifndef MENU_PAGE_PULSE_H
#define MENU_PAGE_PULSE_H

#include "MenuPage.h"

class MenuPagePulse : public MenuPage {
public:
    const char* getTitle() const override { return "PULSES / KM"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.pulsePerKm);
        int w = u8g2.getStrWidth(String(s.pulsePerKm).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("PPK");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)(s.pulsePerKm - 1000) / 19000.0f; // Range 1000 to 20000
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.pulsePerKm += (diff * 100); 
        if (s.pulsePerKm < 1000) s.pulsePerKm = 1000;
        if (s.pulsePerKm > 20000) s.pulsePerKm = 20000;
    }
};

#endif
