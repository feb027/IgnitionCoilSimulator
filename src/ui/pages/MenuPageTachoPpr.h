#ifndef MENU_PAGE_TACHO_PPR_H
#define MENU_PAGE_TACHO_PPR_H

#include "MenuPage.h"

class MenuPageTachoPpr : public MenuPage {
public:
    const char* getTitle() const override { return "TACHO PPR"; }
    
    void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const override {
        float ppr = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
        
        char buf[16];
        if (ppr == (int)ppr) {
            snprintf(buf, sizeof(buf), "%d.0", (int)ppr);
        } else {
            snprintf(buf, sizeof(buf), "%.1f", ppr);
        }
        
        u8g2.print(buf);
        int w = u8g2.getStrWidth(buf);
        
        u8g2.setFont(u8g2_font_helvB10_tr);
        u8g2.setCursor(w + 10 + offX, 48);
        if (ppr == 2.0f) u8g2.print("PPR (4-CYL)");
        else if (ppr == 1.0f) u8g2.print("PPR (1-CYL)");
        else if (ppr == 3.0f) u8g2.print("PPR (6-CYL)");
        else if (ppr == 4.0f) u8g2.print("PPR (8-CYL)");
        else u8g2.print("PPR");
    }
    
    float getProgress(const AppSettings& s) const override {
        float ppr = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
        return (ppr - 0.5f) / 3.5f; // 0.5 to 4.0
    }
    
    void onEdit(int diff, AppSettings& s) override {
        const float validPpr[] = { 0.5f, 1.0f, 2.0f, 3.0f, 4.0f };
        const int numPpr = 5;
        
        float cur = (s.speedoTachoPpr > 0.1f) ? s.speedoTachoPpr : 2.0f;
        int currentIdx = 2; // Default 2.0f
        for (int i = 0; i < numPpr; i++) {
            if (abs(cur - validPpr[i]) < 0.1f) {
                currentIdx = i;
                break;
            }
        }
        
        currentIdx += (diff > 0 ? 1 : -1);
        if (currentIdx < 0) currentIdx = 0;
        if (currentIdx >= numPpr) currentIdx = numPpr - 1;
        
        s.speedoTachoPpr = validPpr[currentIdx];
    }
};

#endif // MENU_PAGE_TACHO_PPR_H
