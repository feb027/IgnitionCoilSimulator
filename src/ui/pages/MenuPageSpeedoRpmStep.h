#ifndef MENU_PAGE_SPEEDO_RPM_STEP_H
#define MENU_PAGE_SPEEDO_RPM_STEP_H

#include "MenuPage.h"

class MenuPageSpeedoRpmStep : public MenuPage {
public:
    const char* getTitle() const override { return "Spd RPM Step"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.setCursor(5 + offX, 48);
        u8g2.print(s.speedoRpmStep);
    }
    
    void onEdit(int encoderDiff, AppSettings& s) override {
        const int steps[] = {10, 50, 100, 500, 1000};
        const int numSteps = 5;
        int currentIndex = 0;
        for (int i = 0; i < numSteps; i++) {
            if (s.speedoRpmStep <= steps[i]) {
                currentIndex = i;
                break;
            }
        }
        currentIndex += encoderDiff;
        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex >= numSteps) currentIndex = numSteps - 1;
        s.speedoRpmStep = steps[currentIndex];
    }
    
    float getProgress(const AppSettings& s) const override {
        if (s.speedoRpmStep <= 10) return 0.0f;
        if (s.speedoRpmStep <= 50) return 0.25f;
        if (s.speedoRpmStep <= 100) return 0.5f;
        if (s.speedoRpmStep <= 500) return 0.75f;
        return 1.0f;
    }
};

#endif // MENU_PAGE_SPEEDO_RPM_STEP_H
