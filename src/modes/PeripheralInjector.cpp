#include "PeripheralInjector.h"
#include "config/Pins.h"
#include <esp_arduino_version.h>

static hw_timer_t * inj_timer = NULL;
static volatile bool isInjOn = false;
static volatile uint32_t inj_pulseTicks = 0;
static volatile uint32_t inj_periodTicks = 0;
static volatile uint32_t inj_pulsesRemaining = 0;
static volatile bool inj_autoStopped = false;

static void IRAM_ATTR onInjTimer() {
    if (isInjOn) {
        // Turn Injector MOSFET OFF (GPIO 32 LOW)
        GPIO.out1_w1tc.val = (1 << (PIN_INJECTOR - 32));
        isInjOn = false;
        
        if (inj_pulsesRemaining > 0) {
            inj_pulsesRemaining--;
            if (inj_pulsesRemaining == 0) {
                timerAlarmDisable(inj_timer);
                timerStop(inj_timer);
                inj_autoStopped = true;
                return;
            }
        }
        
        uint32_t offTicks = (inj_periodTicks > inj_pulseTicks) 
                            ? (inj_periodTicks - inj_pulseTicks) 
                            : 1000;
        timerWrite(inj_timer, 0);
        timerAlarmWrite(inj_timer, offTicks, true);
        timerAlarmEnable(inj_timer);
    } else {
        // Turn Injector MOSFET ON (GPIO 32 HIGH)
        GPIO.out1_w1ts.val = (1 << (PIN_INJECTOR - 32));
        isInjOn = true;
        
        uint32_t onTicks = (inj_pulseTicks > 0) ? inj_pulseTicks : 1000;
        timerWrite(inj_timer, 0);
        timerAlarmWrite(inj_timer, onTicks, true);
        timerAlarmEnable(inj_timer);
    }
}

PeripheralInjector::PeripheralInjector(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController),
      _lastCurrentSampleTime(0), _diagStartTime(0) {}

void PeripheralInjector::begin() {
    pinMode(PIN_INJECTOR, OUTPUT);
    digitalWrite(PIN_INJECTOR, LOW);
    
    if (inj_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        inj_timer = timerBegin(1000000);
#else
        inj_timer = timerBegin(3, 80, true);
#endif
        timerAttachInterrupt(inj_timer, &onInjTimer, true);
    }
}

void PeripheralInjector::samplePrimaryCurrent() {
    uint32_t now = millis();
    if (now - _lastCurrentSampleTime > 100) {
        AppSettings& s = _settingsMgr.getSettings();
        if (s.isRunning) {
            int rawAdc = analogRead(PIN_COIL_ISENSE);
            float voltage = ((float)rawAdc / 4095.0f) * 3.3f;
            float deltaV = fabs(voltage - 2.50f);
            float amps = deltaV / 0.066f;
            if (amps > 15.0f) amps = 15.0f;
            s.injectorPeakCurrentA = (s.injectorPeakCurrentA * 0.7f) + (amps * 0.3f);
            
            if (s.injectorPeakCurrentA > 0.05f) {
                s.injectorResistanceOhm = 13.8f / s.injectorPeakCurrentA;
            } else {
                s.injectorResistanceOhm = 0.0f;
            }
            s.realCurrentA = s.injectorPeakCurrentA * ((float)s.dutyCycle / 100.0f);
        } else {
            s.injectorPeakCurrentA = 0.0f;
            s.injectorResistanceOhm = 0.0f;
            s.realCurrentA = 0.0f;
        }
        _lastCurrentSampleTime = now;
    }
}

void PeripheralInjector::startAutoDiag() {
    AppSettings& s = _settingsMgr.getSettings();
    s.injectorAutoDiagRunning = true;
    s.injectorDiagPhase = 1;
    s.injectorDiagProgress = 0;
    strncpy(s.injectorDiagVerdict, "TESTING...", sizeof(s.injectorDiagVerdict));
    _diagStartTime = millis();
    
    // Stage 1: Low-Pulse Margin Opening Test (1.2ms @ 1200 RPM)
    s.injectorRpm = 1200;
    s.injectorMs = 1.2f;
    start();
}

void PeripheralInjector::stopAutoDiag() {
    AppSettings& s = _settingsMgr.getSettings();
    s.injectorAutoDiagRunning = false;
    s.injectorDiagPhase = 0;
    strncpy(s.injectorDiagVerdict, "ABORTED", sizeof(s.injectorDiagVerdict));
    stop();
}

void PeripheralInjector::updateAutoDiag() {
    AppSettings& s = _settingsMgr.getSettings();
    uint32_t elapsed = millis() - _diagStartTime;
    
    if (elapsed < 20000) {
        s.injectorDiagProgress = (elapsed * 100) / 20000;
        
        if (elapsed < 7000) {
            // Phase 1 (0-7s): Low Pulse Margin Opening (1.2ms -> 2.0ms)
            s.injectorDiagPhase = 1;
            s.injectorRpm = 1200;
            s.injectorMs = 1.2f + ((float)elapsed / 7000.0f) * 0.8f;
            updateTimerConfig();
        } else if (elapsed < 14000) {
            // Phase 2 (7-14s): High-RPM Dynamic Burst (1200 -> 6500 RPM)
            s.injectorDiagPhase = 2;
            s.injectorMs = 3.2f;
            float p2Ratio = (float)(elapsed - 7000) / 7000.0f;
            s.injectorRpm = 1200 + (int)(p2Ratio * 5300);
            updateTimerConfig();
        } else {
            // Phase 3 (14-20s): High Thermal Duty Saturation (7.5ms @ 3500 RPM)
            s.injectorDiagPhase = 3;
            s.injectorRpm = 3500;
            s.injectorMs = 7.5f;
            updateTimerConfig();
        }
    } else {
        // Diagnostics Complete (20s) -> Evaluate Verdict
        s.injectorAutoDiagRunning = false;
        s.injectorDiagProgress = 100;
        stop();
        
        float cur = s.injectorPeakCurrentA;
        if (cur >= 0.70f && cur <= 1.40f) {
            strncpy(s.injectorDiagVerdict, "HEALTHY (NORMAL COIL)", sizeof(s.injectorDiagVerdict));
        } else if (cur > 1.50f) {
            strncpy(s.injectorDiagVerdict, "FAIL: COIL SHORTED (<8 Ohm)", sizeof(s.injectorDiagVerdict));
        } else if (cur >= 0.15f && cur < 0.70f) {
            strncpy(s.injectorDiagVerdict, "DEGRADED: WEAK/HIGH-R", sizeof(s.injectorDiagVerdict));
        } else {
            strncpy(s.injectorDiagVerdict, "FAIL: OPEN CIRCUIT (0A)", sizeof(s.injectorDiagVerdict));
        }
        _settingsMgr.save();
    }
}

void PeripheralInjector::update() {
    AppSettings& s = _settingsMgr.getSettings();
    
    // Sample live primary current
    samplePrimaryCurrent();
    
    if (s.injectorAutoDiagRunning) {
        updateAutoDiag();
    } else if (inj_autoStopped) {
        inj_autoStopped = false;
        stop();
    } else if (s.injectorFlowRunning) {
        s.injectorPulsesLeft = inj_pulsesRemaining;
    } else if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralInjector::syncHardware() {
    updateTimerConfig();
}

void PeripheralInjector::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    int activeRpm = (s.mode == MODE_SWEEP && s.isRunning) ? s.currentRpm : s.injectorRpm;
    if (activeRpm > 8000) activeRpm = 8000;
    if (activeRpm < 500) activeRpm = 500; 
    
    inj_periodTicks = 60000000 / activeRpm;
    
    float ms = s.injectorMs;
    if (ms > 25.0f) ms = 25.0f;
    if (ms < 0.5f) ms = 0.5f;
    inj_pulseTicks = (uint32_t)(ms * 1000.0f);
    
    // Duty cycle safety limit: pulse width cannot exceed 85% of period
    if (inj_pulseTicks > (inj_periodTicks * 0.85f)) {
        inj_pulseTicks = (uint32_t)(inj_periodTicks * 0.85f);
    }
    
    s.dutyCycle = ((float)inj_pulseTicks / (float)inj_periodTicks) * 100.0f;
}

void PeripheralInjector::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    
    if (s.injectorFlowRunning && s.injectorFlowPulses > 0) {
        inj_pulsesRemaining = s.injectorFlowPulses;
    } else if (s.mode == MODE_SINGLE) {
        inj_pulsesRemaining = 1;
    } else if (s.mode == MODE_BURST) {
        inj_pulsesRemaining = 10;
    } else if (s.mode == MODE_SWEEP) {
        _sweepController.beginSweep();
        inj_pulsesRemaining = 0;
    } else {
        inj_pulsesRemaining = 0;
    }
    
    uint32_t onTicks = (inj_pulseTicks > 0) ? inj_pulseTicks : 1000;
    GPIO.out1_w1ts.val = (1 << (PIN_INJECTOR - 32));
    isInjOn = true;
    timerWrite(inj_timer, 0);
    timerAlarmWrite(inj_timer, onTicks, true);
    timerAlarmEnable(inj_timer);
    timerStart(inj_timer);
    s.isRunning = true;
    s.lastFiredMs = millis();
}

void PeripheralInjector::stop() {
    if (inj_timer != NULL) {
        timerAlarmDisable(inj_timer);
        timerStop(inj_timer);
    }
    GPIO.out1_w1tc.val = (1 << (PIN_INJECTOR - 32));
    isInjOn = false;
    inj_pulsesRemaining = 0;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    s.injectorFlowRunning = false;
    s.injectorPulsesLeft = 0;
    
    if (s.mode == MODE_SWEEP) {
        _sweepController.reset();
        s.currentRpm = s.injectorRpm;
    }
}

void PeripheralInjector::trigger() {
    start();
}

void PeripheralInjector::startFlowTest(int numPulses) {
    AppSettings& s = _settingsMgr.getSettings();
    s.injectorFlowPulses = numPulses;
    s.injectorPulsesLeft = numPulses;
    s.injectorFlowRunning = true;
    start();
}

void PeripheralInjector::stopFlowTest() {
    stop();
}

void PeripheralInjector::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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
    u8g2.print("INJ SPEED (RPM)");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(3, 44);
    u8g2.print(s.injectorRpm);

    // Right Box: Pulse Width (Focus 2)
    drawHighlight(2, 65, 16, 63, 32);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(68, 25);
    u8g2.print("PULSE WIDTH");
    
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 44);
    u8g2.print(s.injectorMs, 1);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.print(" ms");
    
    // Bottom Status Line: Live Current & Resistance
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    u8g2.print("I:");
    u8g2.print(s.injectorPeakCurrentA, 2);
    u8g2.print("A (");
    if (s.injectorResistanceOhm > 0) {
        u8g2.print(s.injectorResistanceOhm, 0);
        u8g2.print("R)");
    } else {
        u8g2.print("--R)");
    }
    
    u8g2.setCursor(80, 60);
    if (s.injectorAutoDiagRunning) {
        u8g2.print("P");
        u8g2.print(s.injectorDiagPhase);
        u8g2.print(":");
        u8g2.print(s.injectorDiagProgress);
        u8g2.print("%");
    } else if (s.injectorFlowRunning) {
        u8g2.print("FLW:");
        u8g2.print(s.injectorPulsesLeft);
    } else {
        u8g2.print(s.isRunning ? "[SPRAY]" : "[IDLE]");
    }
}

void PeripheralInjector::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) { // RPM
        s.injectorRpm += (diff * 100);
        if (s.injectorRpm < 500) s.injectorRpm = 500;
        if (s.injectorRpm > 8000) s.injectorRpm = 8000;
    } else if (focusIndex == 2) { // Pulse Width (ms)
        s.injectorMs += (diff * 0.1f);
        if (s.injectorMs < 0.5f) s.injectorMs = 0.5f;
        if (s.injectorMs > 25.0f) s.injectorMs = 25.0f;
    }
    
    _settingsMgr.save();
    
    if (s.isRunning && focusIndex > 0) {
        trigger();
    } else if (!s.isRunning && focusIndex > 0) {
        updateTimerConfig();
    }
}

int PeripheralInjector::getMaxFocusIndex() const {
    return 2;
}

bool PeripheralInjector::shouldShowMenuItem(int menuIndex) {
    if (menuIndex == 0 || menuIndex == 9) return true;
    return false;
}

const char* PeripheralInjector::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST 10x";
        case MODE_SINGLE: return "SINGLE SHOT";
        case MODE_SWEEP: return "CLEAN SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralInjector::cycleRunMode(AppSettings& s, int direction) {
    int next = (int)s.mode + direction;
    if (next > 3) next = 0;
    if (next < 0) next = 3;
    s.mode = (CoilMode)next;
}

void PeripheralInjector::handleDashboardEncoder(int diff, AppSettings& s) {
    s.injectorRpm += (diff * 100);
    if (s.injectorRpm < 500) s.injectorRpm = 500;
    if (s.injectorRpm > 8000) s.injectorRpm = 8000;
    _settingsMgr.save();
    if (s.isRunning) trigger();
    else updateTimerConfig();
}
