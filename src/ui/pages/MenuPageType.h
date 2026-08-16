#ifndef MENU_PAGE_TYPE_H
#define MENU_PAGE_TYPE_H

#include "MenuPage.h"

class MenuPageType : public MenuPage {
public:
    const char* getTitle() const override { return "SET TYPE"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.setFont(u8g2_font_helvB10_tr);
        u8g2.setCursor(5 + offX, 48);
        switch (s.pulseMode) {
            case PULSE_COIL_PASSIVE:
                u8g2.print("COIL 2P (PASIF)");
                break;
            case PULSE_COIL_ACTIVE_3P:
                u8g2.print("COIL 3P (AKTIF)");
                break;
            case PULSE_COIL_ACTIVE_4P:
                u8g2.print("COIL 4P (AKTIF)");
                break;
            case PULSE_INJECTOR:
                u8g2.print("INJEKTOR BENSIN");
                break;
            case PULSE_DUTY:
                u8g2.print("SOLENOID (2-P)");
                break;
            case PULSE_ISC3PIN:
                u8g2.print("ISC (3-PIN)");
                break;
            case PULSE_SPEEDO:
                u8g2.print("SPEEDOMETER");
                break;
            case PULSE_STEPPER_IACV:
                u8g2.print("STEPPER IACV");
                break;
            case PULSE_STEPPER_UNI:
                u8g2.print("STEPPER KONTINU");
                break;
            case PULSE_HALL_DAC:
                u8g2.print("HALL / VADJ DAC");
                break;
            default:
                u8g2.print("UNKNOWN");
                break;
        }
    }
    
    float getProgress(const AppSettings& s) const override {
        return (float)s.pulseMode / (float)(NUM_PULSE_MODES - 1);
    }
    
    void onEdit(int diff, AppSettings& s) override {
        int m = ((int)s.pulseMode + diff) % NUM_PULSE_MODES;
        if (m < 0) m += NUM_PULSE_MODES;
        s.pulseMode = (PulseMode)m;
        
        // Enforce valid modes
        if (s.pulseMode == PULSE_SPEEDO) {
            s.mode = MODE_SWEEP;
        } else {
            if (s.mode == MODE_SWEEP && s.pulseMode != PULSE_COIL_PASSIVE && s.pulseMode != PULSE_COIL_ACTIVE_3P && s.pulseMode != PULSE_COIL_ACTIVE_4P && s.pulseMode != PULSE_INJECTOR && s.pulseMode != PULSE_DUTY) {
                s.mode = MODE_CONTINUOUS;
            }
        }
    }
};

#endif
