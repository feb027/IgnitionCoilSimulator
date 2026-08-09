#include "MenuSystem.h"
#include "config/Pins.h"
#include "../core/CoilDriver.h"

#include "pages/MenuPageFreq.h"
#include "pages/MenuPageDwell.h"
#include "pages/MenuPageMode.h"
#include "pages/MenuPageExit.h"

#define DEBOUNCE_DELAY_MS 50
#define LONG_PRESS_MS 1000

MenuSystem::MenuSystem(SettingsManager& settingsMgr, CoilDriver& driver)
    : _settingsMgr(settingsMgr), _driver(driver), 
      _inMenu(false), _selectedIndex(0), _lastSelectedIndex(0), _isEditing(false), 
      _rawButtonState(HIGH), _stableButtonState(HIGH), 
      _lastDebounceTime(0), _buttonPressTime(0), _buttonLongPressed(false),
      _scrollOffset(0.0f), _lastActivityMs(0) {
      
    _pages[0] = new MenuPageFreq();
    _pages[1] = new MenuPageDwell();
    _pages[2] = new MenuPageMode();
    _pages[3] = new MenuPageExit();
    _numPages = 4;
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
                    // Short Press Action
                    if (!_inMenu) {
                        // Enter Menu
                        _inMenu = true;
                        _selectedIndex = 0;
                        _isEditing = false;
                        _encoder.setCount(0);
                        _lastEncoderCount = 0;
                        _driver.stop(); // Stop firing for safety
                    } else {
                        if (_selectedIndex == 3) { // 3 = EXIT
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
            
            // Scroll pages (0=FREQ, 1=DWELL, 2=MODE, 3=EXIT) with wrap-around
            _selectedIndex = (_selectedIndex + diff) % 4;
            if (_selectedIndex < 0) _selectedIndex += 4;
            
            // Animation
            if (diff > 0) _scrollOffset = 128.0f;
            else _scrollOffset = -128.0f;
        } else {
            // Edit the value for the selected page using polymorphism
            _pages[_selectedIndex]->onEdit(diff, s);
        }
    } else {
        // Optional: fine tune frequency directly from Dashboard
        if (s.isRunning && s.mode == MODE_CONTINUOUS) {
            s.frequencyHz += diff;
            if (s.frequencyHz < 1) s.frequencyHz = 1;
            if (s.frequencyHz > MAX_FREQ_HZ) s.frequencyHz = MAX_FREQ_HZ;
            // Restart driver safely to apply new limits immediately
            _driver.stop();
            _driver.start();
        }
    }
}
