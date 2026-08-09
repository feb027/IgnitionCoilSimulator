#include "MenuSystem.h"
#include "config/Pins.h"
#include "../core/CoilDriver.h"

#include "pages/MenuPageType.h"
#include "pages/MenuPageRPM.h"
#include "pages/MenuPageDwell.h"
#include "pages/MenuPageDuty.h"
#include "pages/MenuPageSpeedoKmh.h"
#include "pages/MenuPageSpeedoRpm.h"
#include "pages/MenuPageSpeedoTemp.h"
#include "pages/MenuPageSpeedoFuel.h"
#include "pages/MenuPagePulse.h"
#include "pages/MenuPageMode.h"
#include "pages/MenuPageSweepTime.h"
#include "pages/MenuPageExit.h"

#define DEBOUNCE_DELAY_MS 50
#define LONG_PRESS_MS 1000

// Instantiate pages statically
static MenuPageType pageType;
static MenuPageRPM pageRPM;
static MenuPageDwell pageDwell;
static MenuPageDuty pageDuty;
static MenuPageSpeedoKmh pageSpeedoKmh;
static MenuPageSpeedoRpm pageSpeedoRpm;
static MenuPageSpeedoTemp pageSpeedoTemp;
static MenuPageSpeedoFuel pageSpeedoFuel;
static MenuPagePulse pagePulse;
static MenuPageMode pageMode;
static MenuPageSweepTime pageSweepTime;
static MenuPageExit pageExit;

MenuSystem::MenuSystem(SettingsManager& settingsMgr, CoilDriver& driver)
    : _settingsMgr(settingsMgr), _driver(driver), 
      _inMenu(false), _dashboardEditMode(false), _dashboardFocusIndex(0), 
      _selectedIndex(0), _lastSelectedIndex(0), _isEditing(false), 
      _rawButtonState(HIGH), _stableButtonState(HIGH), 
      _lastDebounceTime(0), _buttonPressTime(0), _buttonLongPressed(false),
      _lastClickTime(0), _awaitingDoubleClick(false),
      _scrollOffset(0.0f), _lastActivityMs(0) {
      
    _pages[0] = &pageType;
    _pages[1] = &pageRPM;
    _pages[2] = &pageDwell;
    _pages[3] = &pageDuty;
    _pages[4] = &pageSpeedoKmh;
    _pages[5] = &pageSpeedoRpm;
    _pages[6] = &pageSpeedoTemp;
    _pages[7] = &pageSpeedoFuel;
    _pages[8] = &pagePulse;
    _pages[9] = &pageMode;
    _pages[10] = &pageSweepTime;
    _pages[11] = &pageExit;
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
                        if (!_inMenu && s.pulseMode == PULSE_SPEEDO) {
                            if (_dashboardEditMode) {
                                // Double click to exit Edit Mode
                                _dashboardEditMode = false;
                                _settingsMgr.save();
                            } else {
                                // Toggle Dashboard Edit Mode
                                _dashboardEditMode = true;
                                _dashboardFocusIndex = 0; // Reset focus to MODE
                            }
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
                    _driver.stop();
                } else {
                    _driver.start();
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
    
    AppSettings& s = _settingsMgr.getSettings();

    if (_inMenu) {
        if (!_isEditing) {
            _lastSelectedIndex = _selectedIndex; // Store before changing
            
            // Scroll pages with wrap-around and dynamic skipping
            int nextIndex = _selectedIndex;
            int steps = abs(diff);
            int dir = (diff > 0) ? 1 : -1;
            
            // Loop for each step of the encoder
            for (int i = 0; i < steps; i++) {
                while (true) {
                    nextIndex = (nextIndex + dir) % NUM_PAGES;
                    if (nextIndex < 0) nextIndex += NUM_PAGES;
                    
                    // Skip rules
                    if (s.pulseMode == PULSE_SPEEDO) {
                        // Skip coil/pwm specific pages
                        if (nextIndex >= 1 && nextIndex <= 3) continue;
                        
                        // Always hide Speedometer edit pages from main menu (we edit them on dashboard)
                        if (nextIndex >= 4 && nextIndex <= 7) continue;
                        
                        // Hide Mode page from main menu (edited on dashboard)
                        if (nextIndex == 9) continue;
                    } else {
                        // Skip speedo specific pages
                        if (nextIndex >= 4 && nextIndex <= 8) continue;
                        // Skip Dwell/Duty based on mode
                        if (nextIndex == 2 && s.pulseMode != PULSE_DWELL) continue;
                        if (nextIndex == 3 && s.pulseMode != PULSE_DUTY) continue;
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
                _driver.trigger();
            }
        }
    } else {
        if (_dashboardEditMode) {
            if (_dashboardFocusIndex == 0) { // MODE
                if (diff != 0) {
                    bool modeChanged = false;
                    for (int i = 0; i < abs(diff); i++) {
                        if (s.mode == MODE_CONTINUOUS) s.mode = MODE_SWEEP;
                        else s.mode = MODE_CONTINUOUS;
                        modeChanged = true;
                    }
                    
                    // Stop running when mode changes for safety
                    if (modeChanged && s.isRunning) _driver.stop();
                }
            } else if (_dashboardFocusIndex == 1) { // KMH
                s.speedoKmh += (diff * 10);
                if (s.speedoKmh < 0) s.speedoKmh = 0;
                if (s.speedoKmh > 300) s.speedoKmh = 300;
            } else if (_dashboardFocusIndex == 2) { // RPM
                s.speedoRpm += (diff * 500);
                if (s.speedoRpm < 0) s.speedoRpm = 0;
                if (s.speedoRpm > 15000) s.speedoRpm = 15000;
            } else if (_dashboardFocusIndex == 3) { // TEMP
                s.speedoTempPercent += (diff * 5);
                if (s.speedoTempPercent < 0) s.speedoTempPercent = 0;
                if (s.speedoTempPercent > 100) s.speedoTempPercent = 100;
            } else if (_dashboardFocusIndex == 4) { // FUEL
                s.speedoFuelPercent += (diff * 5);
                if (s.speedoFuelPercent < 0) s.speedoFuelPercent = 0;
                if (s.speedoFuelPercent > 100) s.speedoFuelPercent = 100;
            }
            if (s.isRunning && _dashboardFocusIndex > 0) {
                _driver.trigger();
            }
        } else {
            // Optional: fine tune RPM directly from Dashboard (for Coil mode)
            if (s.isRunning && s.mode == MODE_CONTINUOUS && s.pulseMode != PULSE_SPEEDO) {
                s.rpm += (diff * 10);
                if (s.rpm < 0) s.rpm = 0;
                if (s.rpm > MAX_RPM) s.rpm = MAX_RPM;
                // Restart driver safely to apply new limits immediately
                _driver.stop();
                _driver.start();
            }
        }
    }
}

void MenuSystem::executeSingleClick() {
    if (!_inMenu) {
        if (_dashboardEditMode) {
            // Cycle through Dashboard fields infinitely
            _dashboardFocusIndex++;
            if (_dashboardFocusIndex > 4) {
                _dashboardFocusIndex = 0; // Wrap around
            }
        } else {
            // Enter Menu
            _inMenu = true;
            _selectedIndex = 0; // Always start at TYPE
            _isEditing = false;
            _encoder.setCount(0);
            _lastEncoderCount = 0;
            AppSettings& s = _settingsMgr.getSettings();
            if (s.pulseMode != PULSE_SPEEDO) {
                _driver.stop(); // Stop firing for safety
            }
        }
    } else {
        if (_selectedIndex == 11) { // 11 = EXIT
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
