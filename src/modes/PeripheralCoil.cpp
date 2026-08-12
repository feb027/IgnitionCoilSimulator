#include "PeripheralCoil.h"
#include "config/Pins.h"
#include <esp_arduino_version.h>

static hw_timer_t * coil_timer = NULL;
static volatile bool isCoilOn = false;
static volatile uint32_t coil_dwellTicks = 0;
static volatile uint32_t coil_periodTicks = 0;
static volatile uint32_t coil_pulsesRemaining = 0;
static volatile bool coil_autoStopped = false;

static void IRAM_ATTR onCoilTimer() {
    if (isCoilOn) {
        // Fast direct register write for GPIO 32 & 33 (1 CPU cycle)
        GPIO.out1_w1tc.val = (1 << (PIN_COIL_OUT - 32)) | (1 << (PIN_SOLENOID - 32));
        isCoilOn = false;
        
        if (coil_pulsesRemaining > 0) {
            coil_pulsesRemaining--;
            if (coil_pulsesRemaining == 0) {
                timerAlarmDisable(coil_timer);
                coil_autoStopped = true;
                return;
            }
        }
        
        if (coil_periodTicks > coil_dwellTicks) {
            timerAlarmWrite(coil_timer, coil_periodTicks - coil_dwellTicks, true);
        } else {
            timerAlarmWrite(coil_timer, 1000, true); 
        }
    } else {
        // Fast direct register write for GPIO 32 & 33 (1 CPU cycle)
        GPIO.out1_w1ts.val = (1 << (PIN_COIL_OUT - 32)) | (1 << (PIN_SOLENOID - 32));
        isCoilOn = true;
        timerAlarmWrite(coil_timer, coil_dwellTicks, true);
    }
}

PeripheralCoil::PeripheralCoil(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController) {}

void PeripheralCoil::begin() {
    pinMode(PIN_COIL_OUT, OUTPUT);
    digitalWrite(PIN_COIL_OUT, LOW);
    pinMode(PIN_SOLENOID, OUTPUT);
    digitalWrite(PIN_SOLENOID, LOW);
    
    // Timer 0 for Coil
    if (coil_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        coil_timer = timerBegin(1000000); // 1MHz frequency API (ESP-IDF 5)
#else
        coil_timer = timerBegin(0, 80, true); // 80 prescaler API (ESP-IDF 4)
#endif
        timerAttachInterrupt(coil_timer, &onCoilTimer, true);
    }
}

void PeripheralCoil::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (coil_autoStopped) {
        coil_autoStopped = false;
        s.isRunning = false;
    }
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralCoil::syncHardware() {
    updateTimerConfig();
}

void PeripheralCoil::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.rpm > 12000) s.rpm = 12000;
    if (s.rpm < 0) s.rpm = 0; 
    
    if (s.rpm == 0) {
        coil_periodTicks = 1000000;
        coil_dwellTicks = 0;
        s.dwellMs = 0.0f;
        return;
    }
    
    coil_periodTicks = 60000000 / s.rpm;
    
    if (s.dwellMs > 5.0f) s.dwellMs = 5.0f;
    coil_dwellTicks = (uint32_t)(s.dwellMs * 1000.0f);
    
    // Duty cycle protection for coil: Dwell cannot exceed 80% of period
    if (coil_dwellTicks > (coil_periodTicks * 0.8f)) {
        coil_dwellTicks = (uint32_t)(coil_periodTicks * 0.8f);
        s.dwellMs = (float)coil_dwellTicks / 1000.0f;
    }
    
    // Calculate display duty for UI
    s.dutyCycle = ((float)coil_dwellTicks / (float)coil_periodTicks) * 100.0f;
}

void PeripheralCoil::start() {
    AppSettings& s = _settingsMgr.getSettings();
    _sweepController.beginSweep();
    updateTimerConfig();
    s.isRunning = true;
    s.lastFiredMs = millis();
    coil_autoStopped = false;
    
    if (s.mode == MODE_SINGLE) coil_pulsesRemaining = 1;
    else if (s.mode == MODE_BURST) coil_pulsesRemaining = 5;
    else coil_pulsesRemaining = 0; 
    
    digitalWrite(PIN_COIL_OUT, HIGH);
    digitalWrite(PIN_SOLENOID, HIGH);
    isCoilOn = true;
    timerAlarmWrite(coil_timer, coil_dwellTicks, true);
    timerAlarmEnable(coil_timer);
}

void PeripheralCoil::stop() {
    if (coil_timer != NULL) timerAlarmDisable(coil_timer);
    digitalWrite(PIN_COIL_OUT, LOW);
    digitalWrite(PIN_SOLENOID, LOW);
    isCoilOn = false;
    
    AppSettings& s = _settingsMgr.getSettings();
    bool wasRunning = s.isRunning;
    s.isRunning = false;
    if (wasRunning && s.mode == MODE_SWEEP) {
        _sweepController.reset();
        updateTimerConfig();
    }
}

void PeripheralCoil::trigger() {
    start();
}

void PeripheralCoil::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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
    
    drawHighlight(1, 0, 16, 128, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 25);
    u8g2.print("RPM");
    u8g2.setFont(u8g2_font_helvB18_tr);
    String rpmStr = String(s.rpm);
    int rpmWidth = u8g2.getStrWidth(rpmStr.c_str());
    u8g2.setCursor((128 - rpmWidth) / 2, 36);
    u8g2.print(rpmStr);
    
    drawHighlight(2, 0, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 49);
    u8g2.print("DWELL");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 61);
    u8g2.print(s.dwellMs, 1);
    u8g2.print("ms");
    
    u8g2.setDrawColor(1);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(68, 49);
    u8g2.print("DUTY");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 61);
    u8g2.print(s.dutyCycle, 1);
    u8g2.print("%");
    
    // Visual Overheat Warning
    if (s.dutyCycle > 60.0f && (millis() / 250) % 2 == 0) {
        u8g2.setDrawColor(1);
        u8g2.drawBox(108, 42, 18, 8); 
        u8g2.setDrawColor(0);
        u8g2.setFont(u8g2_font_5x7_tr);
        u8g2.setCursor(110, 49);
        u8g2.print("HOT");
    }
    u8g2.setDrawColor(1);
}

void PeripheralCoil::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // RPM
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 12000) s.rpm = 12000;
    } else if (focusIndex == 2) { // DWELL
        s.dwellMs += (diff * 0.1f);
        if (s.dwellMs < 0.1f) s.dwellMs = 0.1f;
        if (s.dwellMs > 5.0f) s.dwellMs = 5.0f;
    }
    
    if (s.isRunning && focusIndex > 0) {
        trigger();
    } else if (!s.isRunning && focusIndex > 0) {
        updateTimerConfig();
    }
}

int PeripheralCoil::getMaxFocusIndex() const {
    return 2;
}

bool PeripheralCoil::shouldShowMenuItem(int menuIndex) {
    // Skip speedo specific pages (Pulse Per Km)
    if (menuIndex == 1) return false;
    // Skip Speedo Steps
    if (menuIndex >= 4 && menuIndex <= 7) return false;
    return true;
}

const char* PeripheralCoil::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralCoil::cycleRunMode(AppSettings& s, int direction) {
    int nextMode = (s.mode + direction) % 4;
    if (nextMode < 0) nextMode += 4;
    s.mode = (CoilMode)nextMode;
}

void PeripheralCoil::handleDashboardEncoder(int diff, AppSettings& s) {
    // Only RPM can be changed from dashboard if not in edit mode
    s.rpm += (diff * s.rpmStep);
    if (s.rpm < 0) s.rpm = 0;
    if (s.rpm > 12000) s.rpm = 12000;
    if (s.isRunning) {
        trigger();
    } else {
        updateTimerConfig();
    }
}
