#ifndef MENU_PAGE_SPEEDO_KMH_STEP_H
#define MENU_PAGE_SPEEDO_KMH_STEP_H

#include "MenuPage.h"

class MenuPageSpeedoKmhStep : public MenuPage {
public:
    const char* getTitle() const override { return "Spd KMH Step"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        u8g2.setCursor(5 + offX, 48);
        u8g2.print(s.speedoKmhStep);
    }
    
    void onEdit(int encoderDiff, AppSettings& s) override {
        const int steps[] = {1, 5, 10, 50};
        const int numSteps = 4;
        int currentIndex = 0;
        for (int i = 0; i < numSteps; i++) {
            if (s.speedoKmhStep <= steps[i]) {
                currentIndex = i;
                break;
            }
        }
        currentIndex += encoderDiff;
        if (currentIndex < 0) currentIndex = 0;
        if (currentIndex >= numSteps) currentIndex = numSteps - 1;
        s.speedoKmhStep = steps[currentIndex];
    }
    
    float getProgress(const AppSettings& s) const override {
        if (s.speedoKmhStep <= 1) return 0.0f;
        if (s.speedoKmhStep <= 5) return 0.33f;
        if (s.speedoKmhStep <= 10) return 0.66f;
        return 1.0f;
    }
};

#endif // MENU_PAGE_SPEEDO_KMH_STEP_H
