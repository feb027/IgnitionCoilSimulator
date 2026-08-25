#include "PeripheralCoilActive4P.h"
#include "config/Pins.h"
#include "../core/CoilLeakSensor.h"
#include <esp_arduino_version.h>

static hw_timer_t * coil_active4p_timer = NULL;
static volatile bool isActive4pCoilOn = false;
static volatile uint32_t coil_act4p_dwellTicks = 0;
static volatile uint32_t coil_act4p_periodTicks = 0;
static volatile uint32_t coil_act4p_pulsesRemaining = 0;
static volatile bool coil_act4p_autoStopped = false;

// Diagnostic Telemetry ISR Counters
static volatile uint32_t isr_act4p_firedCount = 0;
static volatile uint32_t isr_act4p_igfCount = 0;

static void IRAM_ATTR onActive4pCoilTimer() {
    if (isActive4pCoilOn) {
        // Turn IGT Pin 25 LOW (Spark Fired)
        GPIO.out_w1tc = (1 << PIN_COIL_ACTIVE_IGT);
        isActive4pCoilOn = false;
        
        // Count spark generation
        isr_act4p_firedCount++;
        
        if (coil_act4p_pulsesRemaining > 0) {
            coil_act4p_pulsesRemaining--;
            if (coil_act4p_pulsesRemaining == 0) {
                timerAlarmDisable(coil_active4p_timer);
                timerStop(coil_active4p_timer);
                coil_act4p_autoStopped = true;
                return;
            }
        }
        
        uint32_t offTicks = (coil_act4p_periodTicks > coil_act4p_dwellTicks) 
                            ? (coil_act4p_periodTicks - coil_act4p_dwellTicks) 
                            : 1000;
        timerWrite(coil_active4p_timer, 0);
        timerAlarmWrite(coil_active4p_timer, offTicks, true);
        timerAlarmEnable(coil_active4p_timer);
    } else {
        // Turn IGT Pin 25 HIGH (Start Dwell charging)
        GPIO.out_w1ts = (1 << PIN_COIL_ACTIVE_IGT);
        isActive4pCoilOn = true;
        
        uint32_t onTicks = (coil_act4p_dwellTicks > 0) ? coil_act4p_dwellTicks : 1000;
        timerWrite(coil_active4p_timer, 0);
        timerAlarmWrite(coil_active4p_timer, onTicks, true);
        timerAlarmEnable(coil_active4p_timer);
    }
}

// Hardware Interrupt for IGF confirmation pulses from 4-Pin Smart Coil (GPIO 34)
static void IRAM_ATTR onActive4pIgfInterrupt() {
    isr_act4p_igfCount++;
}

PeripheralCoilActive4P::PeripheralCoilActive4P(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController), _diagStartTime(0), _lastCurrentSampleTime(0), _lastAutoPingTime(0) {}

void PeripheralCoilActive4P::begin() {
    pinMode(PIN_COIL_ACTIVE_IGT, OUTPUT);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    
    // IGF Input Pin (GPIO 34) with Hardware Interrupt
    pinMode(PIN_COIL_ACTIVE_IGF, INPUT);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_ACTIVE_IGF), onActive4pIgfInterrupt, FALLING);
    
    // Current Sense ADC Pin (GPIO 35)
    pinMode(PIN_COIL_ISENSE, INPUT);
    
    if (coil_active4p_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        coil_active4p_timer = timerBegin(1000000);
#else
        coil_active4p_timer = timerBegin(2, 80, true);
#endif
        timerAttachInterrupt(coil_active4p_timer, &onActive4pCoilTimer, true);
    }
}

void PeripheralCoilActive4P::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (coil_act4p_autoStopped) {
        coil_act4p_autoStopped = false;
        s.isRunning = false;
    }
    
    // Sync ISR counters to settings struct
    s.coilFiredCount = isr_act4p_firedCount;
    s.coilIgfCount = isr_act4p_igfCount;
    
    if (s.coilFiredCount > 0) {
        if (s.coilIgfCount > s.coilFiredCount) {
            s.coilIgfCount = s.coilFiredCount;
        }
        s.coilMissedCount = s.coilFiredCount - s.coilIgfCount;
        s.coilHealthPercent = ((float)s.coilIgfCount / (float)s.coilFiredCount) * 100.0f;
    } else {
        s.coilMissedCount = 0;
        s.coilHealthPercent = 100.0f;
    }
    
    // Sample primary current
    samplePrimaryCurrent();
    CoilLeakSensor::update(s);
    
    // Auto Diagnostic Routine State Machine
    if (s.coilAutoDiagRunning) {
        updateAutoDiag();
    } else if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralCoilActive4P::samplePrimaryCurrent() {
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
            s.coilConnected = (s.coilPeakCurrentA > 0.5f || s.coilFiredCount > 0);
            
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
            if (!s.coilAutoDiagRunning && (now - _lastAutoPingTime >= 1500)) {
                _lastAutoPingTime = now;
                uint32_t prevIgf = isr_act4p_igfCount;
                
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
                
                bool gotIgf = (isr_act4p_igfCount > prevIgf);
                if (pingAmps > 0.8f || gotIgf) {
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

void PeripheralCoilActive4P::startAutoDiag() {
    AppSettings& s = _settingsMgr.getSettings();
    resetCounters();
    CoilLeakSensor::reset(s);
    s.coilAutoDiagRunning = true;
    s.coilDiagPhase = 1;
    s.coilDiagProgress = 0;
    strncpy(s.coilDiagVerdict, "TESTING...", sizeof(s.coilDiagVerdict));
    _diagStartTime = millis();
    
    // Stage 1 initial parameters: Low Dwell Margin Test
    s.rpm = 1200;
    s.dwellMs = 1.2f;
    start();
}

void PeripheralCoilActive4P::stopAutoDiag() {
    AppSettings& s = _settingsMgr.getSettings();
    s.coilAutoDiagRunning = false;
    s.coilDiagPhase = 0;
    s.coilDiagProgress = 100;
    stop();
}

void PeripheralCoilActive4P::resetCounters() {
    AppSettings& s = _settingsMgr.getSettings();
    isr_act4p_firedCount = 0;
    isr_act4p_igfCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    s.coilMissedCount = 0;
    s.coilHealthPercent = 100.0f;
    s.coilPeakCurrentA = 0.0f;
    strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
    CoilLeakSensor::reset(s);
}

void PeripheralCoilActive4P::updateAutoDiag() {
    AppSettings& s = _settingsMgr.getSettings();
    uint32_t elapsedMs = millis() - _diagStartTime;
    const uint32_t TOTAL_DIAG_MS = 20000; // 20-second test
    
    if (elapsedMs >= TOTAL_DIAG_MS) {
        // Multi-parameter Diagnostic Health Calculation
        s.coilAutoDiagRunning = false;
        s.coilDiagPhase = 4;
        s.coilDiagProgress = 100;
        stop();
        
        // Comprehensive Verdict Logic
        if (s.coilFiredCount < 50) {
            strncpy(s.coilDiagVerdict, "NO SIGNAL / ABORTED", sizeof(s.coilDiagVerdict));
        } else if (s.coilLeakCount > 20) {
            strncpy(s.coilDiagVerdict, "FAIL (INSULATION LEAK)", sizeof(s.coilDiagVerdict));
            s.coilHealthPercent = 35.0f;
        } else if (s.coilPeakCurrentA > 11.5f) {
            strncpy(s.coilDiagVerdict, "FAIL (PRIMARY SHORT)", sizeof(s.coilDiagVerdict));
            s.coilHealthPercent = 40.0f;
        } else if (s.coilHealthPercent < 85.0f) {
            strncpy(s.coilDiagVerdict, "FAIL (IGNITER MISFIRE)", sizeof(s.coilDiagVerdict));
        } else if (s.coilHealthPercent >= 98.0f && s.coilLeakCount == 0 && s.coilPeakCurrentA >= 5.5f) {
            strncpy(s.coilDiagVerdict, "EXCELLENT (100% HEALTHY)", sizeof(s.coilDiagVerdict));
        } else if (s.coilHealthPercent >= 90.0f) {
            strncpy(s.coilDiagVerdict, "GOOD (PASSED)", sizeof(s.coilDiagVerdict));
        } else {
            strncpy(s.coilDiagVerdict, "DEGRADED (MARGINAL)", sizeof(s.coilDiagVerdict));
        }
        _settingsMgr.save();
        return;
    }
    
    s.coilDiagProgress = (elapsedMs * 100) / TOTAL_DIAG_MS;
    
    if (elapsedMs < 6000) {
        // Stage 1 (0-6s): Dwell Margin Tolerance Sweep (1.2ms -> 3.5ms @ 1200 RPM)
        s.coilDiagPhase = 1;
        s.rpm = 1200;
        float progressStage1 = (float)elapsedMs / 6000.0f;
        s.dwellMs = 1.2f + (progressStage1 * 2.3f); // 1.2ms to 3.5ms
        updateTimerConfig();
    } else if (elapsedMs < 12000) {
        // Stage 2 (6-12s): Transient Throttle Tip-In Acceleration (800 -> 6500 RPM)
        s.coilDiagPhase = 2;
        float progressStage2 = (float)(elapsedMs - 6000) / 6000.0f;
        s.rpm = 800 + (int)(progressStage2 * 5700.0f); // 800 to 6500 RPM
        s.dwellMs = 2.5f;
        updateTimerConfig();
    } else {
        // Stage 3 (12-20s): High-RPM Thermal Stress (7000 RPM @ 3.2ms Dwell)
        s.coilDiagPhase = 3;
        s.rpm = 7000;
        s.dwellMs = 3.2f;
        updateTimerConfig();
    }
}

void PeripheralCoilActive4P::syncHardware() {
    updateTimerConfig();
}

void PeripheralCoilActive4P::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.rpm > 16000) s.rpm = 16000;
    if (s.rpm < 0) s.rpm = 0; 
    
    if (s.rpm == 0) {
        coil_act4p_periodTicks = 1000000;
        coil_act4p_dwellTicks = 0;
        s.dwellMs = 0.0f;
        return;
    }
    
    coil_act4p_periodTicks = 60000000 / s.rpm;
    
    if (s.dwellMs > 5.0f) s.dwellMs = 5.0f;
    coil_act4p_dwellTicks = (uint32_t)(s.dwellMs * 1000.0f);
    
    if (coil_act4p_dwellTicks > (coil_act4p_periodTicks * 0.8f)) {
        coil_act4p_dwellTicks = (uint32_t)(coil_act4p_periodTicks * 0.8f);
        s.dwellMs = (float)coil_act4p_dwellTicks / 1000.0f;
    }
    
    s.dutyCycle = ((float)coil_act4p_dwellTicks / (float)coil_act4p_periodTicks) * 100.0f;
}

void PeripheralCoilActive4P::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    
    if (s.mode == MODE_SINGLE) {
        coil_act4p_pulsesRemaining = 1;
    } else if (s.mode == MODE_BURST) {
        coil_act4p_pulsesRemaining = 10;
    } else if (s.mode == MODE_SWEEP) {
        _sweepController.beginSweep();
        coil_act4p_pulsesRemaining = 0;
    } else {
        coil_act4p_pulsesRemaining = 0;
    }
    
    uint32_t onTicks = (coil_act4p_dwellTicks > 0) ? coil_act4p_dwellTicks : 1000;
    GPIO.out_w1ts = (1 << PIN_COIL_ACTIVE_IGT);
    isActive4pCoilOn = true;
    timerWrite(coil_active4p_timer, 0);
    timerAlarmWrite(coil_active4p_timer, onTicks, true);
    timerAlarmEnable(coil_active4p_timer);
    timerStart(coil_active4p_timer);
    s.isRunning = true;
    s.lastFiredMs = millis();
}

void PeripheralCoilActive4P::stop() {
    if (coil_active4p_timer != NULL) {
        timerAlarmDisable(coil_active4p_timer);
        timerStop(coil_active4p_timer);
    }
    GPIO.out_w1tc = (1 << PIN_COIL_ACTIVE_IGT);
    isActive4pCoilOn = false;
    coil_act4p_pulsesRemaining = 0;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    
    if (s.mode == MODE_SWEEP) {
        _sweepController.reset();
        s.currentRpm = s.rpm;
    }
}

void PeripheralCoilActive4P::trigger() {
    start();
}

void PeripheralCoilActive4P::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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
    
    if (s.coilAutoDiagRunning) {
        // Auto Diagnostic Scan Live Screen
        u8g2.setFont(u8g2_font_helvB08_tr);
        u8g2.setCursor(0, 24);
        u8g2.print("AUTO HEALTH SCAN");
        
        u8g2.setCursor(95, 24);
        u8g2.print(s.coilDiagProgress);
        u8g2.print("%");
        
        // Progress Bar
        u8g2.drawFrame(0, 27, 128, 7);
        int barW = (s.coilDiagProgress * 124) / 100;
        if (barW > 0) u8g2.drawBox(2, 29, barW, 3);
        
        u8g2.setCursor(0, 44);
        if (s.coilDiagPhase == 1) u8g2.print("PHASE 1: DWELL SWEEP");
        else if (s.coilDiagPhase == 2) u8g2.print("PHASE 2: ACCEL BURST");
        else if (s.coilDiagPhase == 3) u8g2.print("PHASE 3: THERMAL STRESS");
        
        u8g2.setCursor(0, 54);
        u8g2.print("RPM:"); u8g2.print(s.rpm);
        u8g2.setCursor(65, 54);
        u8g2.print("DWL:"); u8g2.print(s.dwellMs, 1); u8g2.print("ms");
        
        u8g2.setCursor(0, 64);
        u8g2.print("IGF:"); u8g2.print(s.coilHealthPercent, 1); u8g2.print("%");
        u8g2.setCursor(65, 64);
        u8g2.print("MISSED:"); u8g2.print(s.coilMissedCount);
        return;
    }

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
    
    // Bottom Status Line: Live IGF Health % & Missed Count & Current
    u8g2.setDrawColor(1);
    u8g2.drawLine(0, 50, 128, 50);
    
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(2, 60);
    if (s.coilFiredCount == 0) {
        u8g2.print("IGF Pin34: READY");
    } else {
        u8g2.print("IGF:");
        u8g2.print(s.coilHealthPercent, 0);
        u8g2.print("% (");
        u8g2.print(s.coilMissedCount);
        u8g2.print("M)");
    }
    
    u8g2.setCursor(85, 60);
    u8g2.print("I:");
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

void PeripheralCoilActive4P::handleEncoder(int diff, int focusIndex) {
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

int PeripheralCoilActive4P::getMaxFocusIndex() const {
    return 2;
}

bool PeripheralCoilActive4P::shouldShowMenuItem(int menuIndex) {
    // Hide Speedo specific pages
    if (menuIndex == 1 || menuIndex == 2) return false;
    if (menuIndex >= 5 && menuIndex <= 8) return false;
    return true;
}

const char* PeripheralCoilActive4P::getModeString() {
    switch(_settingsMgr.getSettings().mode) {
        case MODE_CONTINUOUS: return "CONTINUOUS";
        case MODE_BURST: return "BURST";
        case MODE_SINGLE: return "SINGLE";
        case MODE_SWEEP: return "SWEEP";
        default: return "UNKNOWN";
    }
}

void PeripheralCoilActive4P::cycleRunMode(AppSettings& s, int direction) {
    int next = (int)s.mode + direction;
    if (next > 3) next = 0;
    if (next < 0) next = 3;
    s.mode = (CoilMode)next;
}

void PeripheralCoilActive4P::handleDashboardEncoder(int diff, AppSettings& s) {
    s.rpm += (diff * s.rpmStep);
    if (s.rpm < 0) s.rpm = 0;
    if (s.rpm > 16000) s.rpm = 16000;
    if (s.mode != MODE_SWEEP || !s.isRunning) s.currentRpm = s.rpm;
    _settingsMgr.save();
    if (s.isRunning) trigger();
    else updateTimerConfig();
}
