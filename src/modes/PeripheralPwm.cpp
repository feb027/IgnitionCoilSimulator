#include "PeripheralPwm.h"
#include "config/Pins.h"
#include <esp_arduino_version.h>

static hw_timer_t * pwm_timer = NULL;
static volatile bool isPwmOn = false;
static volatile uint32_t pwm_dwellTicks = 0;
static volatile uint32_t pwm_periodTicks = 0;
static volatile uint32_t pwm_pulsesRemaining = 0;
static volatile bool pwm_autoStopped = false;

static void IRAM_ATTR onPwmTimer() {
    if (isPwmOn) {
        // Fast direct register write for GPIO 32 (PIN_SOLENOID)
        GPIO.out1_w1tc.val = (1 << (PIN_SOLENOID - 32));
        isPwmOn = false;
        
        if (pwm_pulsesRemaining > 0) {
            pwm_pulsesRemaining--;
            if (pwm_pulsesRemaining == 0) {
                pwm_autoStopped = true;
                timerAlarmDisable(pwm_timer);
                return; // Do not re-arm the timer
            }
        }
        
        if (pwm_periodTicks > pwm_dwellTicks) {
            timerAlarmWrite(pwm_timer, pwm_periodTicks - pwm_dwellTicks, true);
        } else {
            timerAlarmWrite(pwm_timer, 1000, true); 
        }
    } else {
        // Fast direct register write for GPIO 32 (PIN_SOLENOID)
        GPIO.out1_w1ts.val = (1 << (PIN_SOLENOID - 32));
        isPwmOn = true;
        timerAlarmWrite(pwm_timer, pwm_dwellTicks, true);
    }
}

PeripheralPwm::PeripheralPwm(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController) {}

void PeripheralPwm::begin() {
    pinMode(PIN_SOLENOID, OUTPUT);
    digitalWrite(PIN_SOLENOID, LOW);
    
    // Timer 0
    if (pwm_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        pwm_timer = timerBegin(1000000); // 1MHz frequency API (ESP-IDF 5)
#else
        pwm_timer = timerBegin(1, 80, true); // Timer 1 for PWM (prevents conflict with Coil on Timer 0)
#endif
        timerAttachInterrupt(pwm_timer, &onPwmTimer, true);
    }
}

void PeripheralPwm::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (pwm_autoStopped) {
        pwm_autoStopped = false;
        stop(); // Cleanly shutdown hardware and update state
    }
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralPwm::syncHardware() {
    updateTimerConfig();
}

void PeripheralPwm::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    int activeRpm = (s.mode == MODE_SWEEP && s.isRunning) ? s.currentRpm : s.rpm;
    
    if (activeRpm > 12000) activeRpm = 12000;
    if (activeRpm < 0) activeRpm = 0; 
    
    if (activeRpm == 0) {
        pwm_periodTicks = 1000000;
        if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
        if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
        pwm_dwellTicks = (uint32_t)(pwm_periodTicks * (s.dutyCycle / 100.0f));
        
        if (pwm_dwellTicks > pwm_periodTicks) {
            pwm_dwellTicks = pwm_periodTicks;
        }
        if (pwm_dwellTicks < 10) pwm_dwellTicks = 10;
        
        s.dwellMs = (float)pwm_dwellTicks / 1000.0f;
        return;
    }
    
    pwm_periodTicks = 60000000 / activeRpm;
    
    if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
    if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
    
    pwm_dwellTicks = (uint32_t)(pwm_periodTicks * (s.dutyCycle / 100.0f));
    
    if (pwm_dwellTicks > pwm_periodTicks) {
        pwm_dwellTicks = pwm_periodTicks;
    }
    if (pwm_dwellTicks < 10) pwm_dwellTicks = 10;
    
    // Calculate display dwell for UI
    s.dwellMs = (float)pwm_dwellTicks / 1000.0f;
}

void PeripheralPwm::start() {
    AppSettings& s = _settingsMgr.getSettings();
    _sweepController.beginSweep();
    updateTimerConfig();
    s.isRunning = true;
    s.lastFiredMs = millis();
    pwm_autoStopped = false;
    
    if (s.mode == MODE_SINGLE) pwm_pulsesRemaining = 1;
    else if (s.mode == MODE_BURST) pwm_pulsesRemaining = 5;
    else pwm_pulsesRemaining = 0; 
    
    digitalWrite(PIN_SOLENOID, HIGH);
    isPwmOn = true;
    timerWrite(pwm_timer, 0); // Reset timer counter
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    timerRestart(pwm_timer);
    timerAlarm(pwm_timer, pwm_dwellTicks, true, 0);
#else
    timerAlarmWrite(pwm_timer, pwm_dwellTicks, true); // Autoreload TRUE!
#endif
    timerAttachInterrupt(pwm_timer, &onPwmTimer, true);
    timerAlarmEnable(pwm_timer); // CRITICAL: Re-enable interrupt!
    timerStart(pwm_timer); // Explicitly start the timer
}

void PeripheralPwm::stop() {
    if (pwm_timer != NULL) timerAlarmDisable(pwm_timer);
    digitalWrite(PIN_SOLENOID, LOW);
    isPwmOn = false;
    
    AppSettings& s = _settingsMgr.getSettings();
    bool wasRunning = s.isRunning;
    s.isRunning = false;
    
    if (wasRunning && s.mode == MODE_SWEEP) {
        _sweepController.reset();
        updateTimerConfig();
    }
}

void PeripheralPwm::trigger() {
    start();
}

void PeripheralPwm::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
        if (isEditMode && focusIndex == idx) {
            u8g2.setDrawColor(1);
            u8g2.drawBox(x, y, w, h);
            u8g2.setDrawColor(0);
        } else {
            u8g2.setDrawColor(1);
        }
    };
    
    u8g2.drawLine(0, 39, 128, 39);
    u8g2.drawLine(64, 39, 64, 64);
    
    // RPM
    drawHighlight(1, 0, 16, 128, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 25);
    u8g2.print("RPM");
    u8g2.setFont(u8g2_font_helvB18_tr);
    int activeRpm = (s.mode == MODE_SWEEP && s.isRunning) ? s.currentRpm : s.rpm;
    String rpmStr = String(activeRpm);
    int rpmWidth = u8g2.getStrWidth(rpmStr.c_str());
    u8g2.setCursor((128 - rpmWidth) / 2, 36);
    u8g2.print(rpmStr);
    
    // DWELL
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 49);
    u8g2.print("DWELL");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 61);
    u8g2.print(s.dwellMs, 1);
    u8g2.print("ms");
    
    // DUTY (Highlight here for PWM mode)
    drawHighlight(2, 65, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(68, 49);
    u8g2.print("DUTY");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 61);
    u8g2.print(s.dutyCycle, 1);
    u8g2.print("%");
    u8g2.setDrawColor(1);
}

void PeripheralPwm::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // RPM
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 12000) s.rpm = 12000;
    } else if (focusIndex == 2) { // DUTY
        s.dutyCycle += (diff * 1.0f);
        if (s.dutyCycle < 0.0f) s.dutyCycle = 0.0f;
        if (s.dutyCycle > 100.0f) s.dutyCycle = 100.0f;
    }
    
    if (s.isRunning && focusIndex > 0) {
        trigger();
    } else if (!s.isRunning && focusIndex > 0) {
        updateTimerConfig();
    }
}

bool PeripheralPwm::shouldShowMenuItem(int menuIndex) {
    // Hide Speedo specific pages (PPK: 1, Tacho PPR: 2, Speedo Steps: 5-8)
    if (menuIndex == 1 || menuIndex == 2) return false;
    if (menuIndex >= 5 && menuIndex <= 8) return false;
    return true;
}

const char* PeripheralPwm::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralPwm::cycleRunMode(AppSettings& s, int direction) {
    int nextMode = (s.mode + direction) % 4;
    if (nextMode < 0) nextMode += 4;
    s.mode = (CoilMode)nextMode;
}

void PeripheralPwm::handleDashboardEncoder(int diff, AppSettings& s) {
    if (s.isRunning && s.mode == MODE_CONTINUOUS) {
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 12000) s.rpm = 12000;
        stop();
        start();
    }
}

int PeripheralPwm::getMaxFocusIndex() const {
    return 2;
}
