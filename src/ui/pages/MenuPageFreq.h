#ifndef MENU_PAGE_FREQ_H
#define MENU_PAGE_FREQ_H

#include "MenuPage.h"
#include "../../core/CoilDriver.h" // For MAX_FREQ_HZ

class MenuPageFreq : public MenuPage {
public:
    const char* getTitle() const override { return "SET FREQ"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.frequencyHz);
        int w = u8g2.getStrWidth(String(s.frequencyHz).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("Hz");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)(s.frequencyHz - 1) / (float)(MAX_FREQ_HZ - 1);
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.frequencyHz += (diff * 10);
        if (s.frequencyHz < 1) s.frequencyHz = 1;
        if (s.frequencyHz > MAX_FREQ_HZ) s.frequencyHz = MAX_FREQ_HZ;
    }
};

#endif
