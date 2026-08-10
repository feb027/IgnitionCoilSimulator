#ifndef DASHBOARD_EDITOR_H
#define DASHBOARD_EDITOR_H

#include "../core/SettingsManager.h"
#include "../core/PeripheralManager.h"

class DashboardEditor {
public:
    DashboardEditor(SettingsManager& settingsMgr, PeripheralManager& manager);
    
    // Process encoder turns
    void handleEncoder(int diff, int focusIndex);
    
    // Returns max focus index based on pulse mode
    int getMaxFocusIndex() const;

private:
    SettingsManager& _settingsMgr;
    PeripheralManager& _manager;
};

#endif // DASHBOARD_EDITOR_H
