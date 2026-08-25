#include "PeripheralCoilPassive.h"
#include "config/Pins.h"
#include "../core/CoilLeakSensor.h"
#include <esp_arduino_version.h>

static hw_timer_t * coil_passive_timer = NULL;
static volatile bool isPassiveCoilOn = false;
static volatile uint32_t coil_pass_dwellTicks = 0;
static volatile uint32_t coil_pass_periodTicks = 0;
static volatile uint32_t coil_pass_pulsesRemaining = 0;
static volatile bool coil_pass_autoStopped = false;

static volatile uint16_t coil_pass_peakRawAdc = 0;
static volatile bool coil_pass_hasNewAdc = false;

static void IRAM_ATTR onPassiveCoilTimer() {
    if (isPassiveCoilOn) {
        // Sample peak primary charging current right at the end of Dwell ramp
        coil_pass_peakRawAdc = analogRead(PIN_COIL_ISENSE);
        coil_pass_hasNewAdc = true;

        // Turn IGBT Gate OFF (GPIO 33 LOW)
        GPIO.out1_w1tc.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
        isPassiveCoilOn = false;
        
        if (coil_pass_pulsesRemaining > 0) {
            coil_pass_pulsesRemaining--;
            if (coil_pass_pulsesRemaining == 0) {
                timerAlarmDisable(coil_passive_timer);
                timerStop(coil_passive_timer);
                coil_pass_autoStopped = true;
                return;
            }
        }
        
        uint32_t offTicks = (coil_pass_periodTicks > coil_pass_dwellTicks) 
                            ? (coil_pass_periodTicks - coil_pass_dwellTicks) 
                            : 1000;
        timerWrite(coil_passive_timer, 0);
        timerAlarmWrite(coil_passive_timer, offTicks, true);
        timerAlarmEnable(coil_passive_timer);
    } else {
        // Turn IGBT Gate ON (GPIO 33 HIGH)
        GPIO.out1_w1ts.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
        isPassiveCoilOn = true;
        
        uint32_t onTicks = (coil_pass_dwellTicks > 0) ? coil_pass_dwellTicks : 1000;
        timerWrite(coil_passive_timer, 0);
        timerAlarmWrite(coil_passive_timer, onTicks, true);
        timerAlarmEnable(coil_passive_timer);
    }
}

PeripheralCoilPassive::PeripheralCoilPassive(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController), _lastCurrentSampleTime(0), _zeroCurrentVoltage(2.50f) {}

void PeripheralCoilPassive::begin() {
    pinMode(PIN_COIL_PASSIVE_IGBT, OUTPUT);
    digitalWrite(PIN_COIL_PASSIVE_IGBT, LOW);
    
    pinMode(PIN_COIL_ISENSE, INPUT);
    
    if (coil_passive_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        coil_passive_timer = timerBegin(1000000);
#else
        coil_passive_timer = timerBegin(0, 80, true);
#endif
        timerAttachInterrupt(coil_passive_timer, &onPassiveCoilTimer, true);
    }
}

void PeripheralCoilPassive::update() {
    if (coil_pass_autoStopped) {
        coil_pass_autoStopped = false;
        stop();
    }
    
    AppSettings& s = _settingsMgr.getSettings();
    
    samplePrimaryCurrent();
    CoilLeakSensor::update(s);
    
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralCoilPassive::samplePrimaryCurrent() {
    uint32_t now = millis();
    AppSettings& s = _settingsMgr.getSettings();
    
    if (s.isRunning) {
        if (coil_pass_hasNewAdc) {
            coil_pass_hasNewAdc = false;
            int rawAdc = coil_pass_peakRawAdc;
            float voltage = ((float)rawAdc / 4095.0f) * 3.3f;
            
            // ACS712-30A: 66mV/A sensitivity around zero-current offset
            float deltaV = fabs(voltage - _zeroCurrentVoltage);
            float amps = deltaV / 0.066f;
            if (amps > 30.0f) amps = 30.0f;
            
            s.coilPeakCurrentA = (s.coilPeakCurrentA * 0.7f) + (amps * 0.3f);
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
        }
    } else {
        // When OFF: strictly 0A and auto-zero calibrate ACS712 quiescent offset
        s.coilPeakCurrentA = 0.0f;
        strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
        
        if (now - _lastCurrentSampleTime >= 100) {
            _lastCurrentSampleTime = now;
            int rawAdc = analogRead(PIN_COIL_ISENSE);
            float v = ((float)rawAdc / 4095.0f) * 3.3f;
            if (v > 0.1f) {
                _zeroCurrentVoltage = (_zeroCurrentVoltage * 0.95f) + (v * 0.05f);
            }
        }
    }
}

void PeripheralCoilPassive::syncHardware() {
    updateTimerConfig();
}

void PeripheralCoilPassive::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.rpm > 12000) s.rpm = 12000;
    if (s.rpm < 0) s.rpm = 0; 
    
    if (s.rpm == 0) {
        coil_pass_periodTicks = 1000000;
        coil_pass_dwellTicks = 0;
        s.dwellMs = 0.0f;
        return;
    }
    
    coil_pass_periodTicks = 60000000 / s.rpm;
    
    if (s.dwellMs > 5.0f) s.dwellMs = 5.0f;
    coil_pass_dwellTicks = (uint32_t)(s.dwellMs * 1000.0f);
    
    // Duty cycle protection for coil: Dwell cannot exceed 80% of period
    if (coil_pass_dwellTicks > (coil_pass_periodTicks * 0.8f)) {
        coil_pass_dwellTicks = (uint32_t)(coil_pass_periodTicks * 0.8f);
        s.dwellMs = (float)coil_pass_dwellTicks / 1000.0f;
    }
    
    s.dutyCycle = ((float)coil_pass_dwellTicks / (float)coil_pass_periodTicks) * 100.0f;
}

void PeripheralCoilPassive::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    
    if (s.mode == MODE_SINGLE) {
        coil_pass_pulsesRemaining = 1;
    } else if (s.mode == MODE_BURST) {
        coil_pass_pulsesRemaining = 10;
    } else if (s.mode == MODE_SWEEP) {
        _sweepController.beginSweep();
        coil_pass_pulsesRemaining = 0;
    } else {
        coil_pass_pulsesRemaining = 0;
    }
    
    uint32_t onTicks = (coil_pass_dwellTicks > 0) ? coil_pass_dwellTicks : 1000;
    GPIO.out1_w1ts.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
    isPassiveCoilOn = true;
    timerWrite(coil_passive_timer, 0);
    timerAlarmWrite(coil_passive_timer, onTicks, true);
    timerAlarmEnable(coil_passive_timer);
    timerStart(coil_passive_timer);
    s.isRunning = true;
    s.lastFiredMs = millis();
}

void PeripheralCoilPassive::stop() {
    if (coil_passive_timer != NULL) {
        timerAlarmDisable(coil_passive_timer);
        timerStop(coil_passive_timer);
    }
    GPIO.out1_w1tc.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
    isPassiveCoilOn = false;
    coil_pass_pulsesRemaining = 0;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    
    if (s.mode == MODE_SWEEP) {
        _sweepController.reset();
        s.currentRpm = s.rpm;
    }
}

void PeripheralCoilPassive::trigger() {
    start();
}

void PeripheralCoilPassive::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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
    
    // Bottom Status Line: IGBT Primary Current Monitor
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    u8g2.print("OUT: IGBT Pin33");
    
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

void PeripheralCoilPassive::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // RPM
        s.rpm += (diff * s.rpmStep);
        if (s.rpm < 0) s.rpm = 0;
        if (s.rpm > 12000) s.rpm = 12000;
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

int PeripheralCoilPassive::getMaxFocusIndex() const {
    return 2;
}

bool PeripheralCoilPassive::shouldShowMenuItem(int menuIndex) {
    // Hide Speedo specific pages
    if (menuIndex == 1 || menuIndex == 2) return false;
    if (menuIndex >= 5 && menuIndex <= 8) return false;
    return true;
}

const char* PeripheralCoilPassive::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralCoilPassive::cycleRunMode(AppSettings& s, int direction) {
    int next = (int)s.mode + direction;
    if (next > 3) next = 0;
    if (next < 0) next = 3;
    s.mode = (CoilMode)next;
}

void PeripheralCoilPassive::handleDashboardEncoder(int diff, AppSettings& s) {
    s.rpm += (diff * s.rpmStep);
    if (s.rpm < 0) s.rpm = 0;
    if (s.rpm > 12000) s.rpm = 12000;
    if (s.mode != MODE_SWEEP || !s.isRunning) s.currentRpm = s.rpm;
    _settingsMgr.save();
    if (s.isRunning) trigger();
    else updateTimerConfig();
}
