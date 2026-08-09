#ifndef MENU_PAGE_TYPE_H
#define MENU_PAGE_TYPE_H

#include "MenuPage.h"

class MenuPageType : public MenuPage {
public:
    const char* getTitle() const override { return "SET TYPE"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.setFont(u8g2_font_helvB12_tr); // Slightly smaller font to fit
        u8g2.setCursor(5 + offX, 48); // We need to handle cursor manually here since we bypass the standard draw string
        if (s.pulseMode == PULSE_DWELL) {
            u8g2.print("IGNITION COIL");
        } else {
            u8g2.print("PWM / STEPPER");
        }
    }
    
    float getProgress(const AppSettings& s) const override {
        return (s.pulseMode == PULSE_DWELL) ? 0.0f : 1.0f;
    }
    
    void onEdit(int diff, AppSettings& s) override {
        // Toggle if changed
        if (diff > 0) {
            s.pulseMode = PULSE_DUTY;
        } else if (diff < 0) {
            s.pulseMode = PULSE_DWELL;
        }
    }
};

#endif
