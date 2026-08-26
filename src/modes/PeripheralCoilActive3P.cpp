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

static volatile uint16_t coil_act3p_peakRawAdc = 0;
static volatile bool coil_act3p_hasNewAdc = false;
static volatile uint32_t isr_act3p_firedCount = 0;
static volatile uint32_t isr_act3p_sparkReturnCount = 0;
static volatile uint32_t isr_act3p_lastSparkUs = 0;

static void IRAM_ATTR onActive3pSparkReturnInterrupt() {
    uint32_t nowUs = micros();
    if (nowUs - isr_act3p_lastSparkUs < 1500) return; // 1.5ms anti-ringing dead-time filter
    isr_act3p_lastSparkUs = nowUs;
    isr_act3p_sparkReturnCount++;
}

static void IRAM_ATTR onActive3pCoilTimer() {
    if (isActive3pCoilOn) {
        // Sample peak primary charging current right at the end of Dwell ramp
        coil_act3p_peakRawAdc = analogRead(PIN_COIL_ISENSE);
        coil_act3p_hasNewAdc = true;

        // Turn IGT Pin 25 LOW (Spark Fired)
        GPIO.out_w1tc = (1 << PIN_COIL_ACTIVE_IGT);
        isActive3pCoilOn = false;
        isr_act3p_firedCount++;
        
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
    : _settingsMgr(settingsMgr), _sweepController(sweepController), _lastCurrentSampleTime(0), _zeroCurrentVoltage(1.85f) {}

void PeripheralCoilActive3P::begin() {
    pinMode(PIN_COIL_ACTIVE_IGT, OUTPUT);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    
    pinMode(PIN_COIL_ISENSE, INPUT);
    pinMode(PIN_COIL_ACTIVE_IGF, INPUT);
    pinMode(PIN_COIL_SPARK_SENSE, INPUT);
    
    // Dedicated External Spark Pulse Interrupt (LM358 Schmitt Trigger on GPIO 26)
    pinMode(PIN_COIL_SPARK_PULSE, INPUT);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_SPARK_PULSE), onActive3pSparkReturnInterrupt, RISING);
    
    // Fallback legacy interrupt support on Pin 39 / Pin 34
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_SPARK_SENSE), onActive3pSparkReturnInterrupt, FALLING);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_ACTIVE_IGF), onActive3pSparkReturnInterrupt, FALLING);
    
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
    if (coil_act3p_autoStopped) {
        coil_act3p_autoStopped = false;
        stop();
    }
    
    AppSettings& s = _settingsMgr.getSettings();
    
    s.coilFiredCount = isr_act3p_firedCount;
    s.coilIgfCount = isr_act3p_sparkReturnCount;
    s.coilSparkReturnCount = isr_act3p_sparkReturnCount;
    
    samplePrimaryCurrent();
    CoilLeakSensor::update(s);
    
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralCoilActive3P::probeCoil() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.isRunning) return;
    
    uint32_t prevSpark = isr_act3p_sparkReturnCount;
    
    // Stage 1: 500us Safe Micro-Ping (Short-circuit check)
    digitalWrite(PIN_COIL_ACTIVE_IGT, HIGH);
    delayMicroseconds(500);
    int raw1 = analogRead(PIN_COIL_ISENSE);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    
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
    
    delay(25);
    
    // Stage 2: Target Active Dwell Test (User Selected Setting)
    uint32_t activeDwellUs = (uint32_t)(s.dwellMs * 1000.0f);
    if (activeDwellUs < 500) activeDwellUs = 500;
    if (activeDwellUs > 5000) activeDwellUs = 5000;
    
    digitalWrite(PIN_COIL_ACTIVE_IGT, HIGH);
    delayMicroseconds(activeDwellUs);
    int raw2 = analogRead(PIN_COIL_ISENSE);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    
    float v2 = ((float)raw2 / 4095.0f) * 3.3f;
    float dV2 = (v2 > _zeroCurrentVoltage) ? (v2 - _zeroCurrentVoltage) : 0.0f;
    float peakAmps = (dV2 / 0.066f) * 3.2f;
    if (peakAmps > 25.0f) peakAmps = 25.0f;
    
    delay(10); // Allow full secondary discharge & peak detector capacitor hold (10ms)
    int rawSpark = analogRead(PIN_COIL_SPARK_SENSE);
    float sparkV = ((float)rawSpark / 4095.0f) * 3.3f;
    float sparkmA = sparkV * 25.0f;
    if (sparkmA > 100.0f) sparkmA = 100.0f;
    s.coilSparkCurrentmA = sparkmA;
    s.coilPeakCurrentA = peakAmps;
    
    // Dynamic 5-Tier Health Criteria based on Spark Intensity (mA) + Dwell
    float minHealthyAmps = (s.dwellMs <= 0.8f) ? 2.5f : ((s.dwellMs <= 1.5f) ? 4.0f : 5.0f);
    
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

void PeripheralCoilActive3P::resetCounters() {
    AppSettings& s = _settingsMgr.getSettings();
    isr_act3p_firedCount = 0;
    isr_act3p_sparkReturnCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    s.coilSparkReturnCount = 0;
    s.coilMissedCount = 0;
    s.coilHealthPercent = 100.0f;
    s.coilPeakCurrentA = 0.0f;
    s.coilSparkCurrentmA = 0.0f;
    s.coilSparkHealthScore = 100.0f;
    strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
    CoilLeakSensor::reset(s);
}

void PeripheralCoilActive3P::samplePrimaryCurrent() {
    uint32_t now = millis();
    AppSettings& s = _settingsMgr.getSettings();
    
    if (s.isRunning) {
        if (coil_act3p_hasNewAdc) {
            coil_act3p_hasNewAdc = false;
            int rawAdc = coil_act3p_peakRawAdc;
            float voltage = ((float)rawAdc / 4095.0f) * 3.3f;
            
            // ACS712-30A with 1N4148 Peak Detector (Gain factor: 3.2x)
            float deltaV = (voltage > _zeroCurrentVoltage) ? (voltage - _zeroCurrentVoltage) : 0.0f;
            float amps = (deltaV / 0.066f) * 3.2f;
            if (amps > 25.0f) amps = 25.0f;
            
            s.coilPeakCurrentA = (s.coilPeakCurrentA * 0.6f) + (amps * 0.4f);
            s.coilConnected = (s.coilPeakCurrentA > 0.5f || s.coilFiredCount > 0);
            
            // Sample Secondary Spark Intensity via LM358 ADC Pin 39
            int rawSparkAdc = analogRead(PIN_COIL_SPARK_SENSE);
            float sparkV = ((float)rawSparkAdc / 4095.0f) * 3.3f;
            float sparkmA = sparkV * 25.0f;
            if (sparkmA > 100.0f) sparkmA = 100.0f;
            s.coilSparkCurrentmA = (s.coilSparkCurrentmA * 0.7f) + (sparkmA * 0.3f);
            
            // Continuous 5-Tier Health Evaluation
            if (s.coilPeakCurrentA > 11.5f) {
                s.coilSparkHealthScore = 0.0f;
                strncpy(s.coilCurrentStatus, "❌ OVERCURRENT (>11A)", sizeof(s.coilCurrentStatus));
            } else if (s.coilSparkCurrentmA >= 45.0f && s.coilPeakCurrentA >= 5.0f) {
                s.coilSparkHealthScore = 100.0f;
                strncpy(s.coilCurrentStatus, "🟢 100% PRIMA (API BIRU)", sizeof(s.coilCurrentStatus));
            } else if (s.coilSparkCurrentmA >= 30.0f && s.coilPeakCurrentA >= 4.0f) {
                s.coilSparkHealthScore = 75.0f;
                strncpy(s.coilCurrentStatus, "🟡 75% BAIK (LAYAK PAKAI)", sizeof(s.coilCurrentStatus));
            } else if (s.coilSparkCurrentmA >= 15.0f) {
                s.coilSparkHealthScore = 50.0f;
                strncpy(s.coilCurrentStatus, "🟠 50% MARGINAL (DROP BEBAN)", sizeof(s.coilCurrentStatus));
            } else if (s.coilSparkCurrentmA >= 3.0f || s.coilPeakCurrentA > 2.0f) {
                s.coilSparkHealthScore = 25.0f;
                strncpy(s.coilCurrentStatus, "🔴 25% SEKARAT (API LILIN)", sizeof(s.coilCurrentStatus));
            } else {
                s.coilSparkHealthScore = 0.0f;
                strncpy(s.coilCurrentStatus, "❌ 0% MATI / MISFIRE", sizeof(s.coilCurrentStatus));
            }
        }
    } else {
        // When OFF: strictly 0A and auto-zero calibrate ACS712 quiescent offset
        s.coilPeakCurrentA = 0.0f;
        s.coilSparkCurrentmA = 0.0f;
        strncpy(s.coilCurrentStatus, "STANDBY", sizeof(s.coilCurrentStatus));
        
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
    
    isr_act3p_firedCount = 0;
    isr_act3p_sparkReturnCount = 0;
    s.coilFiredCount = 0;
    s.coilIgfCount = 0;
    
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
