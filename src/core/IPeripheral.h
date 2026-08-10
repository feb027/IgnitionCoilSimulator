#ifndef I_PERIPHERAL_H
#define I_PERIPHERAL_H

#include <U8g2lib.h>

class IPeripheral {
public:
    virtual ~IPeripheral() = default;

    // Hardware initialization
    virtual void begin() = 0;
    
    // Regular update loop
    virtual void update() = 0;
    
    // Execution control
    virtual void start() = 0;
    virtual void stop() = 0;
    virtual void trigger() = 0;

    // Dashboard UI
    // Renders the specific layout for this peripheral
    virtual void drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) = 0;
    
    // Dashboard Editor Input
    // Handles encoder turns when editing on the dashboard
    virtual void handleEncoder(int diff, int focusIndex) = 0;
    
    // Returns how many editable fields exist on this dashboard layout
    virtual int getMaxFocusIndex() const = 0;
};

#endif // I_PERIPHERAL_H
