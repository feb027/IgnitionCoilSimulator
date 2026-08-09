#ifndef MENU_PAGE_SWEEP_TIME_H
#define MENU_PAGE_SWEEP_TIME_H

#include "MenuPage.h"

class MenuPageSweepTime : public MenuPage {
public:
    const char* getTitle() const override { return "SWEEP TIME"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.sweepTimeSec);
        int w = u8g2.getStrWidth(String(s.sweepTimeSec).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("SEC");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.sweepTimeSec / 60.0f; // Max 60 seconds
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.sweepTimeSec += diff; 
        if (s.sweepTimeSec < 1) s.sweepTimeSec = 1;
        if (s.sweepTimeSec > 60) s.sweepTimeSec = 60;
    }
};

#endif
