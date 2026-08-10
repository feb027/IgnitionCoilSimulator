#include "MenuSystem.h"
#include "config/Pins.h"
#include "../core/PeripheralManager.h"

#include "pages/MenuPageType.h"
#include "pages/MenuPagePulse.h"
#include "pages/MenuPageSweepTime.h"
#include "pages/MenuPageRpmStep.h"
#include "pages/MenuPageExit.h"

#define DEBOUNCE_DELAY_MS 50
#define LONG_PRESS_MS 1000

static MenuPageType pageType;
static MenuPagePulse pagePulse;
static MenuPageSweepTime pageSweepTime;
static MenuPageRpmStep pageRpmStep;
static MenuPageExit pageExit;

MenuSystem::MenuSystem(SettingsManager& settingsMgr, PeripheralManager& manager)
    : _settingsMgr(settingsMgr), _manager(manager), 
      _inMenu(false), _dashboardEditMode(false), _dashboardFocusIndex(0), 
      _selectedIndex(0), _lastSelectedIndex(0), _isEditing(false), 
      _dashboardEditor(settingsMgr, manager),
      _rawButtonState(HIGH), _stableButtonState(HIGH), 
      _lastDebounceTime(0), _buttonPressTime(0), _buttonLongPressed(false),
      _lastClickTime(0), _awaitingDoubleClick(false),
      _scrollOffset(0.0f), _lastActivityMs(0) {
    _pages[0] = &pageType;
    _pages[1] = &pagePulse;
    _pages[2] = &pageSweepTime;
    _pages[3] = &pageRpmStep;
    _pages[4] = &pageExit;
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

void MenuSystem::update() {
    handleButton();
    handleEncoder();
    
    static uint32_t lastAnimTime = 0;
    uint32_t now = millis();
    
    // Decay scroll offset smoothly towards 0 for animation (only every 16ms, ~60FPS)
    if (now - lastAnimTime > 16) {
        lastAnimTime = now;
        if (abs(_scrollOffset) > 1.0f) {
            _scrollOffset *= 0.7f; // Adjust 0.7 for speed (lower is faster)
        } else {
            _scrollOffset = 0.0f;
        }
    }
    
    // Handle Double Click Timeout
    if (_awaitingDoubleClick && (now - _lastClickTime > 350)) {
        if (_stableButtonState == HIGH) { // Ensure button is not currently held down
            _awaitingDoubleClick = false;
            executeSingleClick();
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
                    if (_awaitingDoubleClick) {
                        // Double Click detected!
                        _awaitingDoubleClick = false;
                        AppSettings& s = _settingsMgr.getSettings();
                        if (!_inMenu) {
                            if (_dashboardEditMode) {
                                // Double click to exit Edit Mode
                                _dashboardEditMode = false;
                                _settingsMgr.save();
                            } else {
                                // Toggle Dashboard Edit Mode
                                _dashboardEditMode = true;
                                _dashboardFocusIndex = 0; // Reset focus to MODE
                            }
                        } else {
                            // Double click to exit Menu from anywhere
                            _inMenu = false;
                            _isEditing = false;
                            _settingsMgr.save();
                        }
                    } else {
                        // First click detected, wait for potential second click
                        _awaitingDoubleClick = true;
                        _lastClickTime = now;
                    }
                }
            }
        }
    }

    // Handle Long Press (Holding the button)
    if (_stableButtonState == LOW && !_buttonLongPressed) {
        if ((now - _buttonPressTime) > LONG_PRESS_MS) {
            _buttonLongPressed = true; // Mark as handled

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
                        nextIndex = (nextIndex + dir) % 5;
                        if (nextIndex < 0) nextIndex += 5;
                        
                        // Skip rules
                        if (s.pulseMode == PULSE_SPEEDO) {
                            // Hide RpmStep from main menu (not applicable)
                            if (nextIndex == 3) continue;
                        } else {
                            // Skip speedo specific pages (Pulse Per Km)
                            if (nextIndex == 1) continue;
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
                if (s.pulseMode == PULSE_STEPPER) {
                    // Forward directly to Stepper for physical jogging when on dashboard
                    _manager.getActive()->handleEncoder(diff, 0);
                } else if (s.isRunning && s.mode == MODE_CONTINUOUS && s.pulseMode != PULSE_SPEEDO) {
                    s.rpm += (diff * s.rpmStep);
                    if (s.rpm < 0) s.rpm = 0;
                    if (s.rpm > 12000) s.rpm = 12000;
                    // Restart driver safely to apply new limits immediately
                    _manager.stop();
                    _manager.start();
                }
            }
        }
    }
}

void MenuSystem::executeSingleClick() {
    _lastActivityMs = millis();
    AppSettings& s = _settingsMgr.getSettings();
    if (!_inMenu) {
        if (_dashboardEditMode) {
            // Cycle through Dashboard fields infinitely
            _dashboardFocusIndex++;
            int maxIdx = _dashboardEditor.getMaxFocusIndex();
            if (_dashboardFocusIndex > maxIdx) {
                _dashboardFocusIndex = 0; // Wrap around
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
        if (_selectedIndex == 4) { // 4 = EXIT
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
