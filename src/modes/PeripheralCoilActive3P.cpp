#include "PeripheralCoilActive3P.h"
#include "config/Pins.h"
#include "../core/CoilLeakSensor.h"
#include <esp_arduino_version.h>

static hw_timer_t * coil_active3p_timer = NULL;
static volatile bool isActive3pCoilOn = false;
static volatile uint32_t coil_act3p_dwellTicks = 0;
static volatile uint32_t coil_act3p_periodTicks = 0;
static volatile uint32_t coil_act3p_pulsesRemaining = 0;
static volatile bool coil_act3p_autoStopped = false;

static void IRAM_ATTR onActive3pCoilTimer() {
    if (isActive3pCoilOn) {
        // Turn IGT Pin 25 LOW (Direct register write)
        GPIO.out_w1tc = (1 << PIN_COIL_ACTIVE_IGT);
        isActive3pCoilOn = false;
        
        if (coil_act3p_pulsesRemaining > 0) {
            coil_act3p_pulsesRemaining--;
            if (coil_act3p_pulsesRemaining == 0) {
                timerAlarmDisable(coil_active3p_timer);
                timerStop(coil_active3p_timer);
                coil_act3p_autoStopped = true;
                return;
            }
        }
        
        uint32_t offTicks = (coil_act3p_periodTicks > coil_act3p_dwellTicks) 
                            ? (coil_act3p_periodTicks - coil_act3p_dwellTicks) 
                            : 1000;
        timerWrite(coil_active3p_timer, 0);
        timerAlarmWrite(coil_active3p_timer, offTicks, true);
        timerAlarmEnable(coil_active3p_timer);
    } else {
        // Turn IGT Pin 25 HIGH (Direct register write)
        GPIO.out_w1ts = (1 << PIN_COIL_ACTIVE_IGT);
        isActive3pCoilOn = true;
        
        uint32_t onTicks = (coil_act3p_dwellTicks > 0) ? coil_act3p_dwellTicks : 1000;
        timerWrite(coil_active3p_timer, 0);
        timerAlarmWrite(coil_active3p_timer, onTicks, true);
        timerAlarmEnable(coil_active3p_timer);
    }
}

PeripheralCoilActive3P::PeripheralCoilActive3P(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController), _lastCurrentSampleTime(0), _lastAutoPingTime(0) {}

void PeripheralCoilActive3P::begin() {
    pinMode(PIN_COIL_ACTIVE_IGT, OUTPUT);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    
    pinMode(PIN_COIL_ISENSE, INPUT);
    
    if (coil_active3p_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        coil_active3p_timer = timerBegin(1000000);
#else
        coil_active3p_timer = timerBegin(1, 80, true);
#endif
        timerAttachInterrupt(coil_active3p_timer, &onActive3pCoilTimer, true);
    }
}

void PeripheralCoilActive3P::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (coil_act3p_autoStopped) {
        coil_act3p_autoStopped = false;
        s.isRunning = false;
    }
    
    samplePrimaryCurrent();
    CoilLeakSensor::update(s);
    
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralCoilActive3P::samplePrimaryCurrent() {
    uint32_t now = millis();
    if (now - _lastCurrentSampleTime > 50) {
        AppSettings& s = _settingsMgr.getSettings();
        if (s.isRunning) {
            int rawAdc = analogRead(PIN_COIL_ISENSE);
            float voltage = ((float)rawAdc / 4095.0f) * 3.3f;
            float amps = 0.0f;
            if (voltage > 2.20f) {
                // ACS712-30A (66mV/A) with peak-hold detector
                amps = (voltage - 2.20f) / 0.066f;
            } else if (voltage > 0.05f) {
                // Direct current shunt or scaled divider
                amps = voltage * 4.5f;
            }
            if (amps > 30.0f) amps = 30.0f;
            s.coilPeakCurrentA = (s.coilPeakCurrentA * 0.6f) + (amps * 0.4f);
            s.coilConnected = (s.coilPeakCurrentA > 0.5f);
            
            // Real-time Current Saturation Status
            if (s.coilPeakCurrentA >= 5.5f && s.coilPeakCurrentA <= 10.5f) {
                strncpy(s.coilCurrentStatus, "OPTIMAL (6-10A)", sizeof(s.coilCurrentStatus));
            } else if (s.coilPeakCurrentA > 0.5f && s.coilPeakCurrentA < 5.5f) {
                strncpy(s.coilCurrentStatus, "WEAK (<5A)", sizeof(s.coilCurrentStatus));
            } else if (s.coilPeakCurrentA > 10.5f) {
                strncpy(s.coilCurrentStatus, "OVERCURRENT (>11A)", sizeof(s.coilCurrentStatus));
            } else {
                strncpy(s.coilCurrentStatus, "NO CURRENT", sizeof(s.coilCurrentStatus));
            }
        } else {
            s.coilPeakCurrentA = 0.0f;
            
            // Standby Auto-Ping Probe (Ping every 1500ms with a safe 0.8ms pulse)
            if (now - _lastAutoPingTime >= 1500) {
                _lastAutoPingTime = now;
                
                digitalWrite(PIN_COIL_ACTIVE_IGT, HIGH);
                delayMicroseconds(800);
                int rawAdc = analogRead(PIN_COIL_ISENSE);
                digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
                
                float voltage = ((float)rawAdc / 4095.0f) * 3.3f;
                float pingAmps = 0.0f;
                if (voltage > 2.20f) {
                    pingAmps = (voltage - 2.20f) / 0.066f;
                } else if (voltage > 0.05f) {
                    pingAmps = voltage * 4.5f;
                }
                
                if (pingAmps > 0.8f) {
                    s.coilConnected = true;
                    strncpy(s.coilCurrentStatus, "COIL DETECTED (READY)", sizeof(s.coilCurrentStatus));
                } else {
                    s.coilConnected = false;
                    strncpy(s.coilCurrentStatus, "DISCONNECTED", sizeof(s.coilCurrentStatus));
                }
            }
        }
        _lastCurrentSampleTime = now;
    }
}

void PeripheralCoilActive3P::syncHardware() {
    updateTimerConfig();
}

void PeripheralCoilActive3P::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.rpm > 16000) s.rpm = 16000;
    if (s.rpm < 0) s.rpm = 0; 
    
    if (s.rpm == 0) {
        coil_act3p_periodTicks = 1000000;
        coil_act3p_dwellTicks = 0;
        s.dwellMs = 0.0f;
        return;
    }
    
    coil_act3p_periodTicks = 60000000 / s.rpm;
    
    if (s.dwellMs > 5.0f) s.dwellMs = 5.0f;
    coil_act3p_dwellTicks = (uint32_t)(s.dwellMs * 1000.0f);
    
    if (coil_act3p_dwellTicks > (coil_act3p_periodTicks * 0.8f)) {
        coil_act3p_dwellTicks = (uint32_t)(coil_act3p_periodTicks * 0.8f);
        s.dwellMs = (float)coil_act3p_dwellTicks / 1000.0f;
    }
    
    s.dutyCycle = ((float)coil_act3p_dwellTicks / (float)coil_act3p_periodTicks) * 100.0f;
}

void PeripheralCoilActive3P::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    
    if (s.mode == MODE_SINGLE) {
        coil_act3p_pulsesRemaining = 1;
    } else if (s.mode == MODE_BURST) {
        coil_act3p_pulsesRemaining = 10;
    } else if (s.mode == MODE_SWEEP) {
        _sweepController.beginSweep();
        coil_act3p_pulsesRemaining = 0;
    } else {
        coil_act3p_pulsesRemaining = 0;
    }
    
    uint32_t onTicks = (coil_act3p_dwellTicks > 0) ? coil_act3p_dwellTicks : 1000;
    GPIO.out_w1ts = (1 << PIN_COIL_ACTIVE_IGT);
    isActive3pCoilOn = true;
    timerWrite(coil_active3p_timer, 0);
    timerAlarmWrite(coil_active3p_timer, onTicks, true);
    timerAlarmEnable(coil_active3p_timer);
    timerStart(coil_active3p_timer);
    s.isRunning = true;
    s.lastFiredMs = millis();
}

void PeripheralCoilActive3P::stop() {
    if (coil_active3p_timer != NULL) {
        timerAlarmDisable(coil_active3p_timer);
        timerStop(coil_active3p_timer);
    }
    GPIO.out_w1tc = (1 << PIN_COIL_ACTIVE_IGT);
    isActive3pCoilOn = false;
    coil_act3p_pulsesRemaining = 0;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    
    if (s.mode == MODE_SWEEP) {
        _sweepController.reset();
        s.currentRpm = s.rpm;
    }
}

void PeripheralCoilActive3P::trigger() {
    start();
}

void PeripheralCoilActive3P::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
        if (isEditMode && focusIndex == idx) {
            u8g2.setDrawColor(1);
            u8g2.drawBox(x, y, w, h);
            u8g2.setDrawColor(0);
        } else {
            u8g2.setDrawColor(1);
            if (focusIndex == idx) {
                u8g2.drawFrame(x, y, w, h);
            }
        }
    };

    // Left Box: RPM (Focus 1)
    drawHighlight(1, 0, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(3, 25);
    u8g2.print("SPEED (RPM)");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(3, 44);
    int dispRpm = (s.isRunning && s.mode == MODE_SWEEP && !(isEditMode && focusIndex == 1)) ? s.currentRpm : s.rpm;
    u8g2.print(dispRpm);

    // Right Box: Dwell (Focus 2)
    drawHighlight(2, 65, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(68, 25);
    u8g2.print("DWELL TIME");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 44);
    u8g2.print(s.dwellMs, 1);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.print(" ms");
    
    // Bottom Status Line: Pin 25 IGT + Current Sense
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    u8g2.print("IGT Pin25");
    
    u8g2.setCursor(75, 60);
    u8g2.print("I-PK: ");
    u8g2.print(s.coilPeakCurrentA, 1);
    u8g2.print("A");
    
    if (s.coilLeakDetected) {
        u8g2.setDrawColor(1);
        u8g2.drawBox(40, 0, 48, 12);
        u8g2.setDrawColor(0);
        u8g2.setFont(u8g2_font_5x7_tr);
        u8g2.setCursor(43, 9);
        u8g2.print("! LEAK !");
        u8g2.setDrawColor(1);
    }
}

void PeripheralCoilActive3P::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // RPM
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 16000) s.rpm = 16000;
        if (s.mode != MODE_SWEEP || !s.isRunning) s.currentRpm = s.rpm;
    } else if (focusIndex == 2) { // DWELL
        s.dwellMs += (diff * 0.1f);
        if (s.dwellMs < 0.1f) s.dwellMs = 0.1f;
        if (s.dwellMs > 5.0f) s.dwellMs = 5.0f;
    }
    
    _settingsMgr.save();
    
    if (s.isRunning && focusIndex > 0) {
        trigger();
    } else if (!s.isRunning && focusIndex > 0) {
        updateTimerConfig();
    }
}

int PeripheralCoilActive3P::getMaxFocusIndex() const {
    return 2;
}

bool PeripheralCoilActive3P::shouldShowMenuItem(int menuIndex) {
    // Hide Speedo specific pages
    if (menuIndex == 1 || menuIndex == 2) return false;
    if (menuIndex >= 5 && menuIndex <= 8) return false;
    return true;
}

const char* PeripheralCoilActive3P::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralCoilActive3P::cycleRunMode(AppSettings& s, int direction) {
    int next = (int)s.mode + direction;
    if (next > 3) next = 0;
    if (next < 0) next = 3;
    s.mode = (CoilMode)next;
}

void PeripheralCoilActive3P::handleDashboardEncoder(int diff, AppSettings& s) {
    s.rpm += (diff * s.rpmStep);
    if (s.rpm < 0) s.rpm = 0;
    if (s.rpm > 16000) s.rpm = 16000;
    if (s.mode != MODE_SWEEP || !s.isRunning) s.currentRpm = s.rpm;
    _settingsMgr.save();
    if (s.isRunning) trigger();
    else updateTimerConfig();
}
