#ifndef MENU_PAGE_SWEEP_TIME_H
#define MENU_PAGE_SWEEP_TIME_H

#include "MenuPage.h"

class MenuPageSweepTime : public MenuPage {
public:
    const char* getTitle() const override { return "SWEEP TIME"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        if (s.sweepTimeSec < 0.1f) {
            u8g2.printf("%.2f", s.sweepTimeSec);
        } else if (s.sweepTimeSec < 1.0f) {
            u8g2.printf("%.1f", s.sweepTimeSec);
        } else {
            u8g2.print((int)s.sweepTimeSec);
        }
        int w = (s.sweepTimeSec < 1.0f) ? 38 : u8g2.getStrWidth(String((int)s.sweepTimeSec).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("SEC");
    }
    
    float getProgress(const AppSettings& s) const override {
        return s.sweepTimeSec / 60.0f; // Max 60 seconds
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.sweepTimeSec += (float)diff; 
        if (s.sweepTimeSec < 0.01f) s.sweepTimeSec = 0.01f;
        if (s.sweepTimeSec > 60.0f) s.sweepTimeSec = 60.0f;
    }
};

#endif
