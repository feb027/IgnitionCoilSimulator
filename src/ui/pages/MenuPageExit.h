#ifndef MENU_PAGE_EXIT_H
#define MENU_PAGE_EXIT_H

#include "MenuPage.h"

class MenuPageExit : public MenuPage {
public:
    const char* getTitle() const override { return "EXIT MENU"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.setFont(u8g2_font_helvB12_tr); 
        u8g2.print("Click to exit");
    }
    
    float getProgress(const AppSettings& s) const override {
        return -1.0f; // No progress bar for exit
    }
    
    void onEdit(int diff, AppSettings& s) override {
        // Does nothing on rotation
    }
};

#endif
