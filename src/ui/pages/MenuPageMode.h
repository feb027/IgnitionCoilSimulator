#ifndef MENU_PAGE_MODE_H
#define MENU_PAGE_MODE_H

#include "MenuPage.h"

class MenuPageMode : public MenuPage {
public:
    const char* getTitle() const override { return "SET MODE"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.setFont(u8g2_font_helvB14_tr); 
        if (s.mode == MODE_CONTINUOUS) u8g2.print("CONTINUOUS");
        else if (s.mode == MODE_BURST) u8g2.print("BURST");
        else if (s.mode == MODE_SINGLE) u8g2.print("SINGLE");
        else if (s.mode == MODE_SWEEP) u8g2.print("SWEEP");
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.mode / 3.0f;
    }
    
    void onEdit(int diff, AppSettings& s) override {
        int m = ((int)s.mode + diff) % 4;
        if (m < 0) m += 4;
        s.mode = (CoilMode)m;
    }
};

#endif
