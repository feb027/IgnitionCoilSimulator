#include "DashboardEditor.h"

DashboardEditor::DashboardEditor(SettingsManager& settingsMgr, PeripheralManager& manager)
    : _settingsMgr(settingsMgr), _manager(manager) {}

int DashboardEditor::getMaxFocusIndex() const {
    return _manager.getActive()->getMaxFocusIndex();
}

void DashboardEditor::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();

    if (focusIndex == 0) { // MODE
        bool modeChanged = false;
        int dir = (diff > 0) ? 1 : -1;
        for (int i = 0; i < abs(diff); i++) {
            _manager.getActive()->cycleRunMode(s, dir);
            modeChanged = true;
        }
        
        if (modeChanged && s.isRunning) _manager.stop();
    } else {
        // Delegate to active peripheral
        _manager.getActive()->handleEncoder(diff, focusIndex);
    }
}
