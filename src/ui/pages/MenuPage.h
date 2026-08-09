#ifndef MENU_PAGE_H
#define MENU_PAGE_H

#include <U8g2lib.h>
#include "../../core/SettingsManager.h"
#include <Arduino.h>

class MenuPage {
public:
    virtual ~MenuPage() {}
    
    // Returns the header title for this page (e.g., "SET FREQ")
    virtual const char* getTitle() const = 0;
    
    // Renders the specific value in the center of the screen
    virtual void drawValue(U8G2& u8g2, int offX, const AppSettings& s) const = 0;
    
    // Returns 0.0 to 1.0 for the progress bar (or -1.0 if no progress bar needed)
    virtual float getProgress(const AppSettings& s) const = 0;
    
    // Handles the encoder rotation during edit mode
    virtual void onEdit(int diff, AppSettings& s) = 0;
};

#endif // MENU_PAGE_H
