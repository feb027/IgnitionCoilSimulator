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
            u8g2.print("PWM (SOLENOID)");
        } else if (s.pulseMode == PULSE_SPEEDO) {
            u8g2.print("SPEEDOMETER");
        } else {
            u8g2.print("STEP MOTOR");
        }
    }
    
    float getProgress(const AppSettings& s) const override {
        if (s.pulseMode == PULSE_DWELL) return 0.0f;
        if (s.pulseMode == PULSE_DUTY) return 0.33f;
        if (s.pulseMode == PULSE_SPEEDO) return 0.66f;
        return 1.0f;
    }
    
    void onEdit(int diff, AppSettings& s) override {
        // Toggle if changed
        int m = ((int)s.pulseMode + diff) % 4;
        if (m < 0) m += 4;
        s.pulseMode = (PulseMode)m;
        
        // Enforce valid modes
        if (s.pulseMode == PULSE_SPEEDO) {
            // Automatically set to SWEEP mode because users expect the speedometer to sweep!
            s.mode = MODE_SWEEP;
        } else {
            // Restore to CONTINUOUS if coming from speedo
            if (s.mode == MODE_SWEEP) {
                s.mode = MODE_CONTINUOUS;
            }
        }
    }
};

#endif
