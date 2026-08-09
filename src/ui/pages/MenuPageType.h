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
        } else if (s.pulseMode == PULSE_DUTY) {
            u8g2.print("PWM / STEPPER");
        } else {
            u8g2.print("SPEEDOMETER");
        }
    }
    
    float getProgress(const AppSettings& s) const override {
        if (s.pulseMode == PULSE_DWELL) return 0.0f;
        if (s.pulseMode == PULSE_DUTY) return 0.5f;
        return 1.0f;
    }
    
    void onEdit(int diff, AppSettings& s) override {
        // Toggle if changed
        int m = ((int)s.pulseMode + diff) % 3;
        if (m < 0) m += 3;
        s.pulseMode = (PulseMode)m;
    }
};

#endif
