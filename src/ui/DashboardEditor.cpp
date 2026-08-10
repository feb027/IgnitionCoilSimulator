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
        for (int i = 0; i < abs(diff); i++) {
            if (s.pulseMode == PULSE_SPEEDO) {
                if (s.mode == MODE_CONTINUOUS) s.mode = MODE_SWEEP;
                else s.mode = MODE_CONTINUOUS;
            } else {
                int dir = (diff > 0) ? 1 : -1;
                int nextMode = (s.mode + dir) % 4;
                if (nextMode < 0) nextMode += 4;
                s.mode = (CoilMode)nextMode;
            }
            modeChanged = true;
        }
        
        if (modeChanged && s.isRunning) _manager.stop();
    } else {
        // Delegate to active peripheral
        _manager.getActive()->handleEncoder(diff, focusIndex);
    }
}
