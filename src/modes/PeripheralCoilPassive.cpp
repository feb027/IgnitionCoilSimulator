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
static volatile uint32_t isr_pass_firedCount = 0;
static volatile uint32_t isr_pass_sparkReturnCount = 0;
static volatile uint32_t isr_pass_missedCount = 0;
static volatile uint32_t isr_pass_lastSparkUs = 0;

static void IRAM_ATTR onPassiveSparkReturnInterrupt() {
    uint32_t nowUs = micros();
    if (nowUs - isr_pass_lastSparkUs < 1500) return; // 1.5ms anti-ringing dead-time filter
    isr_pass_lastSparkUs = nowUs;
    isr_pass_sparkReturnCount++;
}

static void IRAM_ATTR onPassiveCoilTimer() {
    if (isPassiveCoilOn) {
        // Turn IGBT Gate OFF (GPIO 33 LOW)
        GPIO.out1_w1tc.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
        isPassiveCoilOn = false;
        isr_pass_firedCount++;
        
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
        if (offTicks < 400) offTicks = 400;
        timerWrite(coil_passive_timer, 0);
        timerAlarmWrite(coil_passive_timer, offTicks, true);
        timerAlarmEnable(coil_passive_timer);
    } else {
        // Turn IGBT Gate ON (GPIO 33 HIGH)
        GPIO.out1_w1ts.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
        isPassiveCoilOn = true;
        
        uint32_t onTicks = (coil_pass_dwellTicks > 0) ? coil_pass_dwellTicks : 1000;
        if (onTicks < 100) onTicks = 100;
        timerWrite(coil_passive_timer, 0);
        timerAlarmWrite(coil_passive_timer, onTicks, true);
        timerAlarmEnable(coil_passive_timer);
    }
}

PeripheralCoilPassive::PeripheralCoilPassive(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController), _lastCurrentSampleTime(0), _zeroCurrentVoltage(1.85f),
      _sumPeakAmps(0.0f), _sampleCountAmps(0), _sumSparkmA(0.0f), _sampleCountSpark(0) {}

void PeripheralCoilPassive::begin() {
    pinMode(PIN_COIL_PASSIVE_IGBT, OUTPUT);
    digitalWrite(PIN_COIL_PASSIVE_IGBT, LOW);
    
    pinMode(PIN_COIL_ISENSE, INPUT);
    pinMode(PIN_COIL_SPARK_SENSE, INPUT);
    
    // Dedicated External Spark Pulse Interrupt (4N35 Optocoupler on GPIO 26)
    pinMode(PIN_COIL_SPARK_PULSE, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_SPARK_PULSE), onPassiveSparkReturnInterrupt, FALLING);
    
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
    
    // Sample primary and secondary spark sensors
    samplePrimaryCurrent();
    CoilLeakSensor::update(s);
    
    // Smart Confirmation Sync: If analog spark intensity confirms spark (>= 3mA), sync return count
    if (s.coilSparkCurrentmA >= 3.0f && isr_pass_sparkReturnCount < isr_pass_firedCount) {
        isr_pass_sparkReturnCount = isr_pass_firedCount;
    }
    
    s.coilFiredCount = isr_pass_firedCount;
    s.coilSparkReturnCount = isr_pass_sparkReturnCount;
    s.coilIgfCount = isr_pass_sparkReturnCount;
    s.coilMissedCount = (s.coilFiredCount > s.coilSparkReturnCount) ? (s.coilFiredCount - s.coilSparkReturnCount) : 0;
    s.coilHealthPercent = (s.coilFiredCount > 0) ? ((float)s.coilSparkReturnCount * 100.0f / (float)s.coilFiredCount) : 100.0f;
    
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralCoilPassive::probeCoil() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.isRunning) return;
    
    uint32_t prevSpark = isr_pass_sparkReturnCount;
    
    // Stage 1: 500us Safe Micro-Ping on IGBT Gate (Short-circuit check)
    GPIO.out1_w1ts.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
    delayMicroseconds(500);
    int raw1 = analogRead(PIN_COIL_ISENSE);
    GPIO.out1_w1tc.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
    
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
    float maxSparkmA = 0.0f;
    
    for (int p = 0; p < numPulses; p++) {
        GPIO.out1_w1ts.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
        delayMicroseconds(activeDwellUs);
        int raw2 = analogRead(PIN_COIL_ISENSE);
        GPIO.out1_w1tc.val = (1 << (PIN_COIL_PASSIVE_IGBT - 32));
        
        float v2 = ((float)raw2 / 4095.0f) * 3.3f;
        float dV2 = (v2 > _zeroCurrentVoltage) ? (v2 - _zeroCurrentVoltage) : 0.0f;
        float peakAmps = (dV2 / 0.066f) * 3.2f;
        if (peakAmps > 25.0f) peakAmps = 25.0f;
        if (peakAmps > maxPeakAmps) maxPeakAmps = peakAmps;
        
        delay(12); // Allow full secondary discharge & peak detector capacitor hold
        int rawSpark = analogRead(PIN_COIL_SPARK_SENSE);
        float sparkV = ((float)rawSpark / 4095.0f) * 3.3f;
        float sparkmA = sparkV * 25.0f;
        if (sparkmA > 100.0f) sparkmA = 100.0f;
        if (sparkmA > maxSparkmA) maxSparkmA = sparkmA;
        
        // Register test pulse in counters
        isr_pass_firedCount++;
        if (sparkmA >= 3.0f || isr_pass_sparkReturnCount < isr_pass_firedCount) {
            isr_pass_sparkReturnCount = isr_pass_firedCount;
        }
        
        if (p < numPulses - 1) {
            delay(50); // 50ms off-time between pulses (equivalent to ~1200 RPM firing speed)
        }
    }
    
    s.coilSparkCurrentmA = maxSparkmA;
    s.coilPeakCurrentA = maxPeakAmps;
    s.coilFiredCount = isr_pass_firedCount;
    s.coilSparkReturnCount = isr_pass_sparkReturnCount;
    s.coilIgfCount = isr_pass_sparkReturnCount;
    s.coilMissedCount = (s.coilFiredCount > s.coilSparkReturnCount) ? (s.coilFiredCount - s.coilSparkReturnCount) : 0;
    
    // Dynamic 5-Tier Health Criteria based on Spark Intensity (mA) + Dwell
    float minHealthyAmps = (s.dwellMs <= 0.8f) ? 2.5f : ((s.dwellMs <= 1.5f) ? 4.0f : 5.0f);
    float peakAmps = maxPeakAmps;
    float sparkmA = maxSparkmA;
    
    if (peakAmps > 11.5f) {
        s.coilConnected = false;
        s.coilSparkHealthScore = 0.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "❌ OVERCURRENT (%.1fA)", peakAmps);
    } else if (sparkmA >= 45.0f && peakAmps >= minHealthyAmps) {
        s.coilConnected = true;
        s.coilSparkHealthScore = 100.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟢 100%% PRIMA (%.0fmA / %.1fA)", sparkmA, peakAmps);
    } else if (sparkmA >= 30.0f && peakAmps >= 3.5f) {
        s.coilConnected = true;
        s.coilSparkHealthScore = 75.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟡 75%% BAIK (%.0fmA / %.1fA)", sparkmA, peakAmps);
    } else if (sparkmA >= 15.0f) {
        s.coilConnected = true;
        s.coilSparkHealthScore = 50.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟠 50%% MARGINAL (%.0fmA - DROP)", sparkmA);
    } else if (sparkmA >= 3.0f || peakAmps > 1.5f) {
        s.coilConnected = true;
        s.coilSparkHealthScore = 25.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🔴 25%% SEKARAT (%.0fmA - BOCOR)", sparkmA);
    } else {
        s.coilConnected = false;
        s.coilSparkHealthScore = 0.0f;
        s.coilPeakCurrentA = 0.0f;
        strncpy(s.coilCurrentStatus, "❌ 0% MATI (0mA - MISFIRE)", sizeof(s.coilCurrentStatus));
    }
    s.lastFiredMs = millis();
}

void PeripheralCoilPassive::resetCounters() {
    AppSettings& s = _settingsMgr.getSettings();
    isr_pass_firedCount = 0;
    isr_pass_sparkReturnCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    s.coilSparkReturnCount = 0;
    s.coilMissedCount = 0;
    s.coilHealthPercent = 100.0f;
    s.coilPeakCurrentA = 0.0f;
    s.coilSparkCurrentmA = 0.0f;
    s.coilSparkHealthScore = 100.0f;
    strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
    _sumPeakAmps = 0.0f;
    _sampleCountAmps = 0;
    _sumSparkmA = 0.0f;
    _sampleCountSpark = 0;
    CoilLeakSensor::reset(s);
}

void PeripheralCoilPassive::samplePrimaryCurrent() {
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
            float sparkmA = sparkV * 25.0f;
            if (sparkmA > 100.0f) sparkmA = 100.0f;
            
            if (sparkmA >= 5.0f) {
                if (sparkmA > s.coilSparkCurrentmA) {
                    s.coilSparkCurrentmA = (s.coilSparkCurrentmA * 0.2f) + (sparkmA * 0.8f);
                } else {
                    s.coilSparkCurrentmA = (s.coilSparkCurrentmA * 0.97f) + (sparkmA * 0.03f);
                }
                _sumSparkmA += s.coilSparkCurrentmA;
                _sampleCountSpark++;
            }
            
            // Smart Spark Confirmation: If analog voltage confirms spark (>= 3mA), sync return count
            if (s.coilSparkCurrentmA >= 3.0f && isr_pass_sparkReturnCount < isr_pass_firedCount) {
                isr_pass_sparkReturnCount = isr_pass_firedCount;
            }
            
            // Continuous 5-Tier Health Evaluation (Supports both 4N35 Digital Cadence & Analog mA)
            float deliveryPct = (s.coilFiredCount > 0) ? ((float)s.coilSparkReturnCount * 100.0f / (float)s.coilFiredCount) : 100.0f;
            
            if (s.coilPeakCurrentA > 11.5f) {
                s.coilSparkHealthScore = 0.0f;
                strncpy(s.coilCurrentStatus, "❌ OVERCURRENT (>11A)", sizeof(s.coilCurrentStatus));
            } else if ((s.coilSparkCurrentmA >= 45.0f || (s.coilSparkReturnCount > 0 && deliveryPct >= 95.0f)) && s.coilPeakCurrentA >= 3.5f) {
                s.coilSparkHealthScore = 100.0f;
                snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟢 100%% PRIMA (SPARK OK / %.1fA)", s.coilPeakCurrentA);
            } else if ((s.coilSparkCurrentmA >= 30.0f || (s.coilSparkReturnCount > 0 && deliveryPct >= 80.0f)) && s.coilPeakCurrentA >= 3.0f) {
                s.coilSparkHealthScore = 75.0f;
                snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟡 75%% BAIK (%.0f%% SINKRON)", deliveryPct);
            } else if (s.coilSparkCurrentmA >= 15.0f || (s.coilSparkReturnCount > 0 && deliveryPct >= 50.0f)) {
                s.coilSparkHealthScore = 50.0f;
                snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟠 50%% DROP BEBAN (ARITMIA)", deliveryPct);
            } else if (s.coilSparkCurrentmA >= 3.0f || s.coilSparkReturnCount > 0 || s.coilPeakCurrentA > 2.0f) {
                s.coilSparkHealthScore = 25.0f;
                strncpy(s.coilCurrentStatus, "🔴 25% SEKARAT (MISFIRE)", sizeof(s.coilCurrentStatus));
            } else {
                s.coilSparkHealthScore = 0.0f;
                strncpy(s.coilCurrentStatus, "❌ 0% MATI / NO SPARK", sizeof(s.coilCurrentStatus));
            }
            // Compute real-time Average DC Current Consumption (Arus DC)
            float peak = (s.coilPeakCurrentA > 0.5f) ? s.coilPeakCurrentA : amps;
            if (peak < 0.2f) peak = 0.0f;
            float dcAmps = (peak * s.dwellMs * (float)s.rpm) / 120000.0f;
            s.realCurrentA = (s.realCurrentA * 0.7f) + (dcAmps * 0.3f);
        }
    } else {
        s.realCurrentA = 0.0f;
        // When OFF: Auto-zero calibrate ACS712 quiescent offset without erasing last test results
        if (s.coilFiredCount == 0) {
            s.coilPeakCurrentA = 0.0f;
            s.coilSparkCurrentmA = 0.0f;
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

void PeripheralCoilPassive::syncHardware() {
    updateTimerConfig();
}

void PeripheralCoilPassive::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    int activeRpm = (s.mode == MODE_SWEEP && s.isRunning) ? s.currentRpm : s.rpm;
    if (activeRpm > 12000) activeRpm = 12000;
    if (activeRpm < 200) activeRpm = 200; 
    
    coil_pass_periodTicks = 60000000 / activeRpm;
    if (coil_pass_periodTicks < 5000) coil_pass_periodTicks = 5000;
    
    float dwell = s.dwellMs;
    if (dwell > 5.0f) dwell = 5.0f;
    if (dwell < 0.2f) dwell = 0.2f;
    
    uint32_t desiredDwellTicks = (uint32_t)(dwell * 1000.0f);
    uint32_t maxDwellTicks = (coil_pass_periodTicks > 600) ? (coil_pass_periodTicks - 500) : 100;
    if (desiredDwellTicks > maxDwellTicks) {
        desiredDwellTicks = maxDwellTicks;
    }
    coil_pass_dwellTicks = desiredDwellTicks;
    
    s.dutyCycle = ((float)coil_pass_dwellTicks / (float)coil_pass_periodTicks) * 100.0f;
}

void PeripheralCoilPassive::start() {
    AppSettings& s = _settingsMgr.getSettings();
    updateTimerConfig();
    
    isr_pass_firedCount = 0;
    isr_pass_sparkReturnCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    s.coilSparkReturnCount = 0;
    s.coilMissedCount = 0;
    
    _sumPeakAmps = 0.0f;
    _sampleCountAmps = 0;
    _sumSparkmA = 0.0f;
    _sampleCountSpark = 0;
    
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
    s.realCurrentA = 0.0f;
    
    // Latch the true test session mathematical average on STOP
    if (_sampleCountAmps > 0) {
        s.coilPeakCurrentA = _sumPeakAmps / (float)_sampleCountAmps;
    }
    if (_sampleCountSpark > 0) {
        s.coilSparkCurrentmA = _sumSparkmA / (float)_sampleCountSpark;
    }
    float deliveryPct = (s.coilFiredCount > 0) ? ((float)s.coilSparkReturnCount * 100.0f / (float)s.coilFiredCount) : 100.0f;
    if (s.coilPeakCurrentA > 11.5f) {
        s.coilSparkHealthScore = 0.0f;
        strncpy(s.coilCurrentStatus, "❌ OVERCURRENT (>11A)", sizeof(s.coilCurrentStatus));
    } else if ((s.coilSparkCurrentmA >= 45.0f || deliveryPct >= 95.0f) && s.coilPeakCurrentA >= 3.5f) {
        s.coilSparkHealthScore = 100.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟢 100%% PRIMA (RATA2 %.1fA)", s.coilPeakCurrentA);
    } else if ((s.coilSparkCurrentmA >= 30.0f || deliveryPct >= 80.0f) && s.coilPeakCurrentA >= 3.0f) {
        s.coilSparkHealthScore = 75.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟡 75%% BAIK (%.0f%% SINKRON)", deliveryPct);
    } else if (s.coilSparkCurrentmA >= 15.0f || deliveryPct >= 50.0f) {
        s.coilSparkHealthScore = 50.0f;
        snprintf(s.coilCurrentStatus, sizeof(s.coilCurrentStatus), "🟠 50%% DROP BEBAN (ARITMIA)", deliveryPct);
    } else if (s.coilSparkCurrentmA >= 3.0f || s.coilSparkReturnCount > 0 || s.coilPeakCurrentA > 2.0f) {
        s.coilSparkHealthScore = 25.0f;
        strncpy(s.coilCurrentStatus, "🔴 25% SEKARAT (MISFIRE)", sizeof(s.coilCurrentStatus));
    } else {
        s.coilSparkHealthScore = 0.0f;
        strncpy(s.coilCurrentStatus, "❌ 0% MATI / NO SPARK", sizeof(s.coilCurrentStatus));
    }
    
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
