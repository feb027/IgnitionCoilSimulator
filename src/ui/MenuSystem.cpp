#include "MenuSystem.h"
#include "config/Pins.h"
#include "../core/PeripheralManager.h"

#include "pages/MenuPageType.h"
#include "pages/MenuPagePulse.h"
#include "pages/MenuPageTachoPpr.h"
#include "pages/MenuPageSweepTime.h"
#include "pages/MenuPageRpmStep.h"
#include "pages/MenuPageSpeedoRpmStep.h"
#include "pages/MenuPageSpeedoKmhStep.h"
#include "pages/MenuPageSpeedoTempStep.h"
#include "pages/MenuPageSpeedoFuelStep.h"
#include "pages/MenuPageExit.h"

#define DEBOUNCE_DELAY_MS 50
#define LONG_PRESS_MS 1000

static MenuPageType pageType;
static MenuPagePulse pagePulse;
static MenuPageTachoPpr pageTachoPpr;
static MenuPageSweepTime pageSweepTime;
static MenuPageRpmStep pageRpmStep;
static MenuPageSpeedoRpmStep pageSpdRpmStep;
static MenuPageSpeedoKmhStep pageSpdKmhStep;
static MenuPageSpeedoTempStep pageSpdTempStep;
static MenuPageSpeedoFuelStep pageSpdFuelStep;
static MenuPageExit pageExit;

MenuSystem::MenuSystem(SettingsManager& settingsMgr, PeripheralManager& manager)
    : _settingsMgr(settingsMgr), _manager(manager), 
      _inMenu(false), _dashboardEditMode(false), _dashboardFocusIndex(0), 
      _selectedIndex(0), _lastSelectedIndex(0), _isEditing(false), 
      _dashboardEditor(settingsMgr, manager),
      _rawButtonState(HIGH), _stableButtonState(HIGH), 
      _lastDebounceTime(0), _buttonPressTime(0), _buttonLongPressed(false),
      _lastClickTime(0), _clickCount(0),
      _scrollOffset(0.0f), _lastActivityMs(0) {
    _pages[0] = &pageType;
    _pages[1] = &pagePulse;
    _pages[2] = &pageTachoPpr;
    _pages[3] = &pageSweepTime;
    _pages[4] = &pageRpmStep;
    _pages[5] = &pageSpdRpmStep;
    _pages[6] = &pageSpdKmhStep;
    _pages[7] = &pageSpdTempStep;
    _pages[8] = &pageSpdFuelStep;
    _pages[9] = &pageExit;
    _numPages = NUM_PAGES;
}

void MenuSystem::begin() {
    pinMode(PIN_ENC_SW, INPUT_PULLUP);
    
    ESP32Encoder::useInternalWeakPullResistors = UP;
    _encoder.attachHalfQuad(PIN_ENC_DT, PIN_ENC_CLK);
    _encoder.setCount(0);
    _lastEncoderCount = 0;
    _lastActivityMs = millis();
}

void MenuSystem::update(float dt) {
    handleButton();
    handleEncoder();
    
    uint32_t now = millis();
    
    // Decay scroll offset smoothly towards 0 for animation (framerate independent)
    if (abs(_scrollOffset) > 1.0f) {
        _scrollOffset -= (_scrollOffset * 20.0f * dt);
    } else {
        _scrollOffset = 0.0f;
    }
    
    // Handle Multi-Click Dispatch
    if (_clickCount > 0 && (now - _lastClickTime > 300)) {
        if (_stableButtonState == HIGH) { // Ensure button is released
            int clicks = _clickCount;
            _clickCount = 0;
            if (clicks == 1) {
                executeSingleClick();
            } else if (clicks == 2) {
                executeDoubleClick();
            } else if (clicks >= 3) {
                executeTripleClick();
            }
        }
    }
}

void MenuSystem::handleButton() {
    bool reading = digitalRead(PIN_ENC_SW);
    uint32_t now = millis();

    // Reset debounce timer if state changed
    if (reading != _rawButtonState) {
        _lastDebounceTime = now;
        _rawButtonState = reading;
        _lastActivityMs = now;
    }

    // Check if state has been stable for longer than debounce delay
    if ((now - _lastDebounceTime) > DEBOUNCE_DELAY_MS) {
        if (reading != _stableButtonState) {
            _stableButtonState = reading;

            if (_stableButtonState == LOW) {
                // Button Pressed (Falling edge)
                _buttonPressTime = now;
                _buttonLongPressed = false;
            } else {
                // Button Released (Rising edge)
                if (!_buttonLongPressed) {
                    _clickCount++;
                    _lastClickTime = now;
                }
            }
        }
    }

    // Handle Long Press (Holding the button)
    if (_stableButtonState == LOW && !_buttonLongPressed) {
        if ((now - _buttonPressTime) > LONG_PRESS_MS) {
            _buttonLongPressed = true; // Mark as handled
            _clickCount = 0; // Cancel multi-click

            if (!_inMenu) {
                // Toggle RUN / STOP on dashboard
                AppSettings& s = _settingsMgr.getSettings();
                if (s.isRunning) {
                    _manager.stop();
                } else {
                    _manager.start();
                }
            } else {
                // Quick Exit from Menu on long press
                _inMenu = false;
                _isEditing = false;
                _settingsMgr.save();
            }
        }
    }
}

void MenuSystem::handleEncoder() {
    // Divide by 2 to reduce sensitivity (1 physical click = 2 electrical steps on most cheap encoders)
    int32_t currentCount = _encoder.getCount() / 2; 
    
    if (currentCount == _lastEncoderCount) return;
    
    _lastActivityMs = millis();
    
    int32_t diff = currentCount - _lastEncoderCount;
    _lastEncoderCount = currentCount;
    
    if (diff != 0) {
        AppSettings& s = _settingsMgr.getSettings();
        if (_inMenu) {
            if (!_isEditing) {
                _lastSelectedIndex = _selectedIndex; // Store before changing
                
                // Navigate menu using polymorphic skip rules
                int nextIndex = _selectedIndex;
                int steps = abs(diff);
                int dir = diff > 0 ? 1 : -1;
                
                // Loop for each step of the encoder
                for (int i = 0; i < steps; i++) {
                    while (true) {
                        nextIndex = (nextIndex + dir) % NUM_PAGES;
                        if (nextIndex < 0) nextIndex += NUM_PAGES;
                        
                        // Skip rules based on peripheral plugin
                        if (!_manager.getActive()->shouldShowMenuItem(nextIndex)) {
                            continue;
                        }
                        
                        break;
                    }
                }
                
                _selectedIndex = nextIndex;
                
                // Animation
                if (diff > 0) _scrollOffset = 128.0f;
                else _scrollOffset = -128.0f;
            } else {
                // Edit the value for the selected page using polymorphism
                _pages[_selectedIndex]->onEdit(diff, s);
                
                // Live update for Speedometer
                if (s.isRunning && s.pulseMode == PULSE_SPEEDO) {
                    _manager.trigger();
                }
            }
        } else {
            if (_dashboardEditMode) {
                _dashboardEditor.handleEncoder(diff, _dashboardFocusIndex);
            } else {
                _manager.getActive()->handleDashboardEncoder(diff, s);
            }
        }
    }
}

void MenuSystem::executeSingleClick() {
    _lastActivityMs = millis();
    AppSettings& s = _settingsMgr.getSettings();
    if (!_inMenu) {
        if (_dashboardEditMode) {
            // Cycle through Dashboard fields
            _dashboardFocusIndex++;
            int maxIdx = _dashboardEditor.getMaxFocusIndex();
            int minIdx = (s.pulseMode == PULSE_ISC3PIN || s.pulseMode == PULSE_STEPPER) ? 1 : 0;
            if (_dashboardFocusIndex > maxIdx || _dashboardFocusIndex < minIdx) {
                _dashboardFocusIndex = minIdx; // Wrap around
            }
        } else {
            // Enter Menu
            _inMenu = true;
            _selectedIndex = 0; // Always start at TYPE
            _isEditing = false;
            _encoder.setCount(0);
            _lastEncoderCount = 0;
            if (s.pulseMode != PULSE_SPEEDO) {
                _manager.stop(); // Stop firing for safety
            }
        }
    } else {
        if (_selectedIndex == NUM_PAGES - 1) { // EXIT
            _inMenu = false;
            _isEditing = false;
            _settingsMgr.save();
        } else {
            // Toggle Edit Mode
            _isEditing = !_isEditing;
            if (!_isEditing) {
                _settingsMgr.save(); // Save after edit
            } else {
                _encoder.setCount(0);
                _lastEncoderCount = 0;
            }
        }
    }
}

void MenuSystem::executeDoubleClick() {
    _lastActivityMs = millis();
    AppSettings& s = _settingsMgr.getSettings();
    if (!_inMenu) {
        // Toggle Dashboard Edit Mode on double click
        _dashboardEditMode = !_dashboardEditMode;
        if (_dashboardEditMode) {
            _dashboardFocusIndex = 1; // Start at first editable parameter
        } else {
            _settingsMgr.save();
        }
    } else {
        // Exit Menu from anywhere on double click
        _inMenu = false;
        _isEditing = false;
        _settingsMgr.save();
    }
}

void MenuSystem::executeTripleClick() {
    _lastActivityMs = millis();
    AppSettings& s = _settingsMgr.getSettings();
    
    // In Speedometer mode, triple-click toggles individual channels
    if (!_inMenu && s.pulseMode == PULSE_SPEEDO) {
        if (_dashboardFocusIndex == 1) {
            s.speedoEnableKmh = !s.speedoEnableKmh;
        } else if (_dashboardFocusIndex == 2) {
            s.speedoEnableRpm = !s.speedoEnableRpm;
        } else if (_dashboardFocusIndex == 3) {
            s.speedoEnableTemp = !s.speedoEnableTemp;
        } else if (_dashboardFocusIndex == 4) {
            s.speedoEnableFuel = !s.speedoEnableFuel;
        } else {
            // Focus 0 or general: Toggle ALL channels
            bool anyOn = s.speedoEnableKmh || s.speedoEnableRpm || s.speedoEnableTemp || s.speedoEnableFuel;
            s.speedoEnableKmh = !anyOn;
            s.speedoEnableRpm = !anyOn;
            s.speedoEnableTemp = !anyOn;
            s.speedoEnableFuel = !anyOn;
        }
        _settingsMgr.save();
        _manager.getActive()->syncHardware();
    }
}
