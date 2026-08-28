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
static volatile uint32_t isr_act4p_sparkCount = 0;
static volatile uint32_t isr_act4p_missedCount = 0;
static volatile uint16_t coil_act4p_peakRawAdc = 0;
static volatile bool coil_act4p_hasNewAdc = false;

static volatile uint32_t isr_act4p_lastFireUs = 0;
static volatile uint32_t isr_act4p_lastSparkUs = 0;
static volatile uint32_t isr_act4p_debounceUs = 1500;
static volatile uint32_t isr_act4p_windowUs = 3500;
static volatile uint32_t isr_act4p_lastIgfUs = 0;
static volatile uint32_t isr_act4p_igfDebounceUs = 50;

static void IRAM_ATTR onActive4pCoilTimer() {
    if (isActive4pCoilOn) {
        // Turn IGT Pin 25 LOW (Spark Fired)
        GPIO.out_w1tc = ((uint32_t)1 << PIN_COIL_ACTIVE_IGT);
        isActive4pCoilOn = false;
        isr_act4p_lastFireUs = micros();
        
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
        if (offTicks < 400) offTicks = 400;
        timerWrite(coil_active4p_timer, 0);
        timerAlarmWrite(coil_active4p_timer, offTicks, true);
        timerAlarmEnable(coil_active4p_timer);
    } else {
        // Turn IGT Pin 25 HIGH (Start Dwell charging)
        GPIO.out_w1ts = ((uint32_t)1 << PIN_COIL_ACTIVE_IGT);
        isActive4pCoilOn = true;
        
        uint32_t onTicks = (coil_act4p_dwellTicks > 0) ? coil_act4p_dwellTicks : 1000;
        if (onTicks < 100) onTicks = 100;
        timerWrite(coil_active4p_timer, 0);
        timerAlarmWrite(coil_active4p_timer, onTicks, true);
        timerAlarmEnable(coil_active4p_timer);
    }
}

// Hardware Interrupt for Internal IGF confirmation pulses from 4-Pin Smart Coil (GPIO 34)
static void IRAM_ATTR onActive4pIgfInterrupt() {
    uint32_t nowUs = micros();
    if (nowUs - isr_act4p_lastIgfUs < isr_act4p_igfDebounceUs) return;
    isr_act4p_lastIgfUs = nowUs;
    isr_act4p_igfCount++;
}

// Hardware Interrupt for External Spark Gap Return Sensor (GPIO 26 / GPIO 39)
static void IRAM_ATTR onActive4pSparkInterrupt() {
    uint32_t nowUs = micros();
    if (nowUs - isr_act4p_lastSparkUs < isr_act4p_debounceUs) return; // Anti-ringing dead-time filter
    isr_act4p_lastSparkUs = nowUs;
    isr_act4p_sparkCount++;
}

PeripheralCoilActive4P::PeripheralCoilActive4P(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController), _diagStartTime(0), _lastCurrentSampleTime(0), _zeroCurrentVoltage(1.85f),
      _sumPeakAmps(0.0f), _sampleCountAmps(0), _sumSparkmA(0.0f), _sampleCountSpark(0) {}

void PeripheralCoilActive4P::begin() {
    pinMode(PIN_COIL_ACTIVE_IGT, OUTPUT);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    
    // Internal IGF Input Pin (GPIO 34) with Hardware Interrupt (Falling Edge for 1:1 pulse)
    pinMode(PIN_COIL_ACTIVE_IGF, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_ACTIVE_IGF), onActive4pIgfInterrupt, FALLING);
    
    // Dedicated External Spark Pulse Interrupt (4N35 Optocoupler on GPIO 26 - Falling Edge for 1:1 pulse)
    pinMode(PIN_COIL_SPARK_PULSE, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_SPARK_PULSE), onActive4pSparkInterrupt, FALLING);
    
    // External Spark Energy Analog Input (GPIO 39)
    pinMode(PIN_COIL_SPARK_SENSE, INPUT);
    
    // Current Sense ADC Pin (GPIO 35)
    pinMode(PIN_COIL_ISENSE, INPUT);
    
    if (coil_active4p_timer == NULL) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
        coil_active4p_timer = timerBegin(1000000);
#else
        coil_active4p_timer = timerBegin(2, 80, true);
#endif
        timerAttachInterrupt(coil_active4p_timer, &onActive4pCoilTimer, false);
    }
}

void PeripheralCoilActive4P::update() {
    if (coil_act4p_autoStopped) {
        coil_act4p_autoStopped = false;
        stop();
    }
    
    AppSettings& s = _settingsMgr.getSettings();
    isr_act4p_debounceUs = (uint32_t)(s.calCadenceDebounceMs * 1000.0f);
    if (isr_act4p_debounceUs < 200) isr_act4p_debounceUs = 200;
    isr_act4p_windowUs = (uint32_t)(s.calCadenceWindowMs * 1000.0f);
    if (isr_act4p_windowUs < 500) isr_act4p_windowUs = 500;
    
    // Sample primary current & secondary spark intensity
    samplePrimaryCurrent();
    CoilLeakSensor::update(s);
    
    uint32_t fired = isr_act4p_firedCount;
    uint32_t igf = isr_act4p_igfCount;
    uint32_t spark = isr_act4p_sparkCount;
    uint32_t confirmed = (spark > 0) ? spark : igf;
    
    s.coilFiredCount = fired;
    s.coilIgfCount = igf;
    s.coilSparkReturnCount = confirmed;
    s.coilMissedCount = (s.coilFiredCount > confirmed) ? (s.coilFiredCount - confirmed) : 0;
    s.coilHealthPercent = (s.coilFiredCount > 0) ? ((float)confirmed * 100.0f / (float)s.coilFiredCount) : 100.0f;
    
    // Auto Diagnostic Routine State Machine
    if (s.coilAutoDiagRunning) {
        updateAutoDiag();
    } else if ((s.mode == MODE_SWEEP || s.mode == MODE_RANDOM) && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
    
    // Hardware Timer Glitch Auto-Recovery Watchdog
    if (s.isRunning && !s.coilAutoDiagRunning) {
        uint32_t nowUs = micros();
        uint32_t expectedPeriodUs = (coil_act4p_periodTicks > 0) ? coil_act4p_periodTicks : 20000;
        uint32_t maxStallAllowedUs = (expectedPeriodUs * 3) + 20000;
        if (nowUs - isr_act4p_lastFireUs > maxStallAllowedUs) {
            GPIO.out_w1tc = ((uint32_t)1 << PIN_COIL_ACTIVE_IGT);
            isActive4pCoilOn = false;
            isr_act4p_lastFireUs = nowUs;
            if (coil_active4p_timer != NULL) {
                timerAlarmDisable(coil_active4p_timer);
                timerWrite(coil_active4p_timer, 0);
                uint32_t onTicks = (coil_act4p_dwellTicks > 0) ? coil_act4p_dwellTicks : 1000;
                timerAlarmWrite(coil_active4p_timer, onTicks, true);
                timerAlarmEnable(coil_active4p_timer);
                timerStart(coil_active4p_timer);
            }
        }
    }
}

void PeripheralCoilActive4P::probeCoil() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.isRunning || s.coilAutoDiagRunning) return;
    
    uint32_t prevIgf = isr_act4p_igfCount;
    uint32_t prevSpark = isr_act4p_sparkCount;
    
    // Stage 1: 500us Safe Micro-Ping (Short-circuit check)
    digitalWrite(PIN_COIL_ACTIVE_IGT, HIGH);
    delayMicroseconds(500);
    int raw1 = analogRead(PIN_COIL_ISENSE);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    isr_act4p_lastFireUs = micros();
    
    float v1 = ((float)raw1 / 4095.0f) * 3.3f;
    float dV1 = (v1 > _zeroCurrentVoltage) ? (v1 - _zeroCurrentVoltage) : 0.0f;
    float amps1 = (dV1 / 0.066f) * 3.2f;
    
    if (amps1 > 12.0f) {
        s.coilPeakCurrentA = amps1;
        s.coilConnected = false;
        strncpy(s.coilCurrentStatus, "❌ SHORT CIRCUIT (>12A)", sizeof(s.coilCurrentStatus));
        s.lastFiredMs = millis();
        return;
    }
    
    delay(20);
    
    int numPulses = s.checkCoilPulseCount;
    if (numPulses < 1) numPulses = 1;
    if (numPulses > 10) numPulses = 10;
    
    uint32_t activeDwellUs = (uint32_t)(s.dwellMs * 1000.0f);
    if (activeDwellUs < 500) activeDwellUs = 500;
    if (activeDwellUs > 5000) activeDwellUs = 5000;
    
    float maxPeakAmps = 0.0f;
    
    for (int p = 0; p < numPulses; p++) {
        digitalWrite(PIN_COIL_ACTIVE_IGT, HIGH);
        delayMicroseconds(activeDwellUs);
        int raw2 = analogRead(PIN_COIL_ISENSE);
        digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
        isr_act4p_lastFireUs = micros();
        
        float v2 = ((float)raw2 / 4095.0f) * 3.3f;
        float dV2 = (v2 > _zeroCurrentVoltage) ? (v2 - _zeroCurrentVoltage) : 0.0f;
        float peakAmps = (dV2 / 0.066f) * 3.2f;
        if (peakAmps > 25.0f) peakAmps = 25.0f;
        if (peakAmps > maxPeakAmps) maxPeakAmps = peakAmps;
        
        int rawSpark = analogRead(PIN_COIL_SPARK_SENSE);
        float sparkV = ((float)rawSpark / 4095.0f) * 3.3f;
        float sparkmA = sparkV * 25.0f * s.calSparkGain;
        if (sparkmA > 100.0f) sparkmA = 100.0f;
        if (sparkmA > s.coilSparkCurrentmA) s.coilSparkCurrentmA = sparkmA;
        
        isr_act4p_firedCount++;
        if (p < numPulses - 1) {
            delay(50); // 50ms off-time between pulses
        }
    }
    
    delay(10);
    bool gotIgf = (isr_act4p_igfCount > prevIgf);
    bool gotSpark = (isr_act4p_sparkCount > prevSpark);
    s.coilPeakCurrentA = maxPeakAmps;
    s.coilFiredCount = isr_act4p_firedCount;
    s.coilIgfCount = isr_act4p_igfCount;
    s.coilSparkReturnCount = (isr_act4p_sparkCount > 0) ? isr_act4p_sparkCount : isr_act4p_igfCount;
    s.coilMissedCount = (s.coilFiredCount > s.coilSparkReturnCount) ? (s.coilFiredCount - s.coilSparkReturnCount) : 0;
    
    float peakAmps = maxPeakAmps;
    
    // Dynamic Health Criteria based on Dwell Setting
    float minHealthyAmps = (s.dwellMs <= 0.8f) ? 2.5f : ((s.dwellMs <= 1.5f) ? 4.0f : 5.0f);
    
    if (peakAmps >= minHealthyAmps && peakAmps <= 11.0f) {
        s.coilConnected = true;
        if (gotIgf && gotSpark) {
            snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "✅ PERFECT (IGF+SPARK %.1fA)", peakAmps);
        } else if (!gotIgf && gotSpark) {
            snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "⚠️ IGF FAULT (SPARK OK %.1fA)", peakAmps);
        } else if (gotIgf && !gotSpark) {
            snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "❌ NO SPARK (IGF OK - BOCOR)", peakAmps);
        } else {
            snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "❌ NO SPARK & NO IGF (%.1fA)", peakAmps);
        }
    } else if (peakAmps > 0.8f && peakAmps < minHealthyAmps) {
        s.coilConnected = true;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "⚠️ WEAK COIL (%.1fA)", peakAmps);
    } else if (peakAmps > 11.0f) {
        s.coilConnected = false;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "❌ OVERCURRENT (%.1fA)", peakAmps);
    } else {
        s.coilConnected = false;
        s.coilPeakCurrentA = 0.0f;
        strncpy(s.coilCurrentStatus, "❌ DISCONNECTED (0A)", sizeof(s.coilCurrentStatus));
    }
    s.lastFiredMs = millis();
}

void PeripheralCoilActive4P::samplePrimaryCurrent() {
    uint32_t now = millis();
    AppSettings& s = _settingsMgr.getSettings();
    
    if (s.isRunning) {
        if (now - _lastCurrentSampleTime >= 40) {
            _lastCurrentSampleTime = now;
            
            // Sample hardware peak detector (1N4148 + 100nF hold cap) with 4-sample burst
            int rawAdc = 0;
            for (int i = 0; i < 4; i++) {
                int v = analogRead(PIN_COIL_ISENSE);
                if (v > rawAdc) rawAdc = v;
            }
            
            float voltage = ((float)rawAdc / 4095.0f) * 3.3f;
            
            // ACS712-30A with 1N4148 Peak Detector (Gain factor: 3.2x)
            float deltaV = (voltage > _zeroCurrentVoltage) ? (voltage - _zeroCurrentVoltage) : 0.0f;
            float amps = (deltaV / 0.066f) * 3.2f;
            if (amps > 25.0f) amps = 25.0f;
            
            // Track TRUE PEAK current (Hold peak voltage cleanly across cycles)
            if (amps >= 2.0f) {
                if (amps > s.coilPeakCurrentA) {
                    s.coilPeakCurrentA = (s.coilPeakCurrentA * 0.15f) + (amps * 0.85f);
                } else {
                    s.coilPeakCurrentA = (s.coilPeakCurrentA * 0.98f) + (amps * 0.02f);
                }
                _sumPeakAmps += s.coilPeakCurrentA;
                _sampleCountAmps++;
            } else if (s.coilFiredCount > 0 && s.coilPeakCurrentA < 0.5f) {
                s.coilPeakCurrentA = amps;
            }
            s.coilConnected = (s.coilPeakCurrentA > 0.5f || s.coilFiredCount > 0);
            
            // Sample Secondary Spark Intensity via LM358 ADC Pin 39
            int rawSparkAdc = analogRead(PIN_COIL_SPARK_SENSE);
            float sparkV = ((float)rawSparkAdc / 4095.0f) * 3.3f;
            float sparkmA = sparkV * 25.0f * s.calSparkGain;
            if (sparkmA > 100.0f) sparkmA = 100.0f;
            
            if (sparkmA >= 3.0f) {
                if (sparkmA > s.coilSparkCurrentmA) {
                    s.coilSparkCurrentmA = (s.coilSparkCurrentmA * 0.2f) + (sparkmA * 0.8f);
                } else {
                    s.coilSparkCurrentmA = (s.coilSparkCurrentmA * 0.97f) + (sparkmA * 0.03f);
                }
                _sumSparkmA += s.coilSparkCurrentmA;
                _sampleCountSpark++;
            } else if (s.coilFiredCount > 0 && s.coilSparkCurrentmA < 1.0f) {
                s.coilSparkCurrentmA = sparkmA;
            }
            
            // Real-time Dual Confirmation Status for 4-Pin
            if (s.coilFiredCount >= 10) {
                float igfRatio = (s.coilFiredCount > 0) ? ((float)s.coilIgfCount / (float)s.coilFiredCount) * 100.0f : 0.0f;
                float sparkRatio = (s.coilFiredCount > 0) ? ((float)s.coilSparkReturnCount / (float)s.coilFiredCount) * 100.0f : 0.0f;
                
                if (s.coilSparkReturnCount == 0 && s.coilPeakCurrentA >= 4.5f) {
                    strncpy(s.coilCurrentStatus, "❌ NO SPARK (MISFIRE 100%)", sizeof(s.coilCurrentStatus));
                } else if (s.coilIgfCount == 0 && sparkRatio >= 75.0f) {
                    strncpy(s.coilCurrentStatus, "⚠️ IGF FAULT (SPARK OK)", sizeof(s.coilCurrentStatus));
                } else if (sparkRatio < 75.0f || igfRatio < 75.0f) {
                    snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "⚠️ MISFIRE (%.0f%% SPARK)", sparkRatio);
                } else if (s.coilPeakCurrentA >= 5.0f && s.coilPeakCurrentA <= 10.5f) {
                    strncpy(s.coilCurrentStatus, "OPTIMAL (IGF+SPARK OK)", sizeof(s.coilCurrentStatus));
                } else if (s.coilPeakCurrentA > 0.5f && s.coilPeakCurrentA < 5.0f) {
                    strncpy(s.coilCurrentStatus, "WEAK (<5A)", sizeof(s.coilCurrentStatus));
                } else if (s.coilPeakCurrentA > 10.5f) {
                    strncpy(s.coilCurrentStatus, "OVERCURRENT (>11A)", sizeof(s.coilCurrentStatus));
                } else {
                    strncpy(s.coilCurrentStatus, "NO CURRENT (0A)", sizeof(s.coilCurrentStatus));
                }
            } else {
                if (s.coilPeakCurrentA >= 5.0f && s.coilPeakCurrentA <= 10.5f) {
                    strncpy(s.coilCurrentStatus, "OPTIMAL (5-10A)", sizeof(s.coilCurrentStatus));
                } else if (s.coilPeakCurrentA > 0.5f && s.coilPeakCurrentA < 5.0f) {
                    strncpy(s.coilCurrentStatus, "WEAK (<5A)", sizeof(s.coilCurrentStatus));
                } else if (s.coilPeakCurrentA > 10.5f) {
                    strncpy(s.coilCurrentStatus, "OVERCURRENT (>11A)", sizeof(s.coilCurrentStatus));
                } else {
                    strncpy(s.coilCurrentStatus, "NO CURRENT (0A)", sizeof(s.coilCurrentStatus));
                }
            }
            // Compute real-time Average DC Current Consumption (Arus DC)
            float peak = (s.coilPeakCurrentA > 0.5f) ? s.coilPeakCurrentA : amps;
            if (peak < 0.2f) peak = 0.0f;
            float baseDc = (peak * s.dwellMs * (float)s.rpm) / 120000.0f;
            float dcAmps = (baseDc * s.calDcCurrentGain) + s.calDcCurrentOffset;
            if (dcAmps < 0.0f) dcAmps = 0.0f;
            s.realCurrentA = (s.realCurrentA * 0.7f) + (dcAmps * 0.3f);
        }
    } else {
        float standbyDc = s.calDcCurrentOffset;
        if (standbyDc < 0.0f) standbyDc = 0.0f;
        s.realCurrentA = standbyDc;
        // When OFF: Auto-zero calibrate ACS712 quiescent offset without erasing last test results
        if (s.coilFiredCount == 0) {
            s.coilPeakCurrentA = 0.0f;
            strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
        }
        
        if (now - _lastCurrentSampleTime >= 50) {
            _lastCurrentSampleTime = now;
            int rawAdc = analogRead(PIN_COIL_ISENSE);
            float v = ((float)rawAdc / 4095.0f) * 3.3f;
            if (v > 0.1f) {
                _zeroCurrentVoltage = (_zeroCurrentVoltage * 0.9f) + (v * 0.1f);
            }
        }
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
    isr_act4p_sparkCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    s.coilSparkReturnCount = 0;
    s.coilMissedCount = 0;
    s.coilHealthPercent = 100.0f;
    s.coilPeakCurrentA = 0.0f;
    strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
    _sumPeakAmps = 0.0f;
    _sampleCountAmps = 0;
    _sumSparkmA = 0.0f;
    _sampleCountSpark = 0;
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
    int activeRpm = ((s.mode == MODE_SWEEP || s.mode == MODE_RANDOM) && s.isRunning) ? s.currentRpm : s.rpm;
    if (activeRpm > 16000) activeRpm = 16000;
    if (activeRpm < 200) activeRpm = 200; 
    
    coil_act4p_periodTicks = 60000000 / activeRpm;
    if (coil_act4p_periodTicks < 3750) coil_act4p_periodTicks = 3750;
    
    float dwell = ((s.mode == MODE_SWEEP || s.mode == MODE_RANDOM) && s.isRunning) ? s.currentDwellMs : s.dwellMs;
    if (dwell > 5.0f) dwell = 5.0f;
    if (dwell < 0.2f) dwell = 0.2f;
    
    uint32_t desiredDwellTicks = (uint32_t)(dwell * 1000.0f);
    uint32_t maxDwellTicks = (coil_act4p_periodTicks > 500) ? (coil_act4p_periodTicks - 400) : 100;
    if (desiredDwellTicks > maxDwellTicks) {
        desiredDwellTicks = maxDwellTicks;
    }
    coil_act4p_dwellTicks = desiredDwellTicks;
    
    s.dutyCycle = ((float)coil_act4p_dwellTicks / (float)coil_act4p_periodTicks) * 100.0f;
    
    isr_act4p_debounceUs = (uint32_t)(s.calCadenceDebounceMs * 1000.0f);
    isr_act4p_windowUs = (uint32_t)(s.calCadenceWindowMs * 1000.0f);
    isr_act4p_igfDebounceUs = (s.calIgfDebounceUs >= 5.0f) ? (uint32_t)s.calIgfDebounceUs : 50;
}

void PeripheralCoilActive4P::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    
    isr_act4p_firedCount = 0;
    isr_act4p_igfCount = 0;
    isr_act4p_sparkCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    s.coilSparkReturnCount = 0;
    s.coilMissedCount = 0;
    
    _sumPeakAmps = 0.0f;
    _sampleCountAmps = 0;
    _sumSparkmA = 0.0f;
    _sampleCountSpark = 0;
    
    if (s.mode == MODE_SINGLE) {
        coil_act4p_pulsesRemaining = 1;
    } else if (s.mode == MODE_BURST) {
        coil_act4p_pulsesRemaining = 10;
    } else if (s.mode == MODE_SWEEP) {
        _sweepController.beginSweep();
        coil_act4p_pulsesRemaining = 0;
    } else if (s.mode == MODE_RANDOM) {
        _sweepController.beginRandom();
        coil_act4p_pulsesRemaining = 0;
    } else {
        coil_act4p_pulsesRemaining = 0;
    }
    
    uint32_t onTicks = (coil_act4p_dwellTicks > 0) ? coil_act4p_dwellTicks : 1000;
    pinMode(PIN_COIL_ACTIVE_IGT, OUTPUT);
    GPIO.out_w1ts = ((uint32_t)1 << PIN_COIL_ACTIVE_IGT);
    isActive4pCoilOn = true;
    timerAlarmWrite(coil_active4p_timer, onTicks, false);
    timerWrite(coil_active4p_timer, 0);
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
    GPIO.out_w1tc = ((uint32_t)1 << PIN_COIL_ACTIVE_IGT);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    isActive4pCoilOn = false;
    coil_act4p_pulsesRemaining = 0;
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    s.realCurrentA = 0.0f;
    
    // Latch the true test session mathematical average on STOP
    if (_sampleCountAmps > 0) {
        s.coilPeakCurrentA = _sumPeakAmps / (float)_sampleCountAmps;
    }
    if (_sampleCountSpark > 0) {
        s.coilSparkCurrentmA = _sumSparkmA / (float)_sampleCountSpark;
    }
    
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
        if (s.dwellMs < 0.0f) s.dwellMs = 0.0f;
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
        case MODE_RANDOM: return "RANDOM";
        default: return "UNKNOWN";
    }
}

void PeripheralCoilActive4P::cycleRunMode(AppSettings& s, int direction) {
    int next = (int)s.mode + direction;
    if (next > 4) next = 0;
    if (next < 0) next = 4;
    s.mode = (CoilMode)next;
}

void PeripheralCoilActive4P::handleDashboardEncoder(int diff, AppSettings& s) {
    s.rpm += (diff * s.rpmStep);
    if (s.rpm < 0) s.rpm = 0;
    if (s.rpm > 16000) s.rpm = 16000;
    if ((s.mode != MODE_SWEEP && s.mode != MODE_RANDOM) || !s.isRunning) s.currentRpm = s.rpm;
    _settingsMgr.save();
    if (s.isRunning) trigger();
    else updateTimerConfig();
}
