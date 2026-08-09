#ifndef MENU_PAGE_DWELL_H
#define MENU_PAGE_DWELL_H

#include "MenuPage.h"
#include "../../core/CoilDriver.h" // For MAX_DWELL_MS

class MenuPageDwell : public MenuPage {
public:
    const char* getTitle() const override { return "SET DWELL"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.print(s.dwellMs, 1);
        int w = u8g2.getStrWidth(String(s.dwellMs, 1).c_str());
        u8g2.setFont(u8g2_font_helvB14_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        u8g2.print("ms");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (s.dwellMs - 0.1f) / (MAX_DWELL_MS - 0.1f);
    }
    
    void onEdit(int diff, AppSettings& s) override {
        s.dwellMs += (diff * 0.1f);
        if (s.dwellMs < 0.1f) s.dwellMs = 0.1f;
        if (s.dwellMs > MAX_DWELL_MS) s.dwellMs = MAX_DWELL_MS;
    }
};

#endif
