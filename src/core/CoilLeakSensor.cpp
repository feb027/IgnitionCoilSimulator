#include "CoilLeakSensor.h"

static volatile uint32_t isr_leak_total = 0;
static volatile uint32_t isr_leak_last_us = 0;
static volatile uint32_t isr_leak_last_time_ms = 0;
static volatile uint32_t isr_leak_debounce_us = 1000; // Default 1.0ms lockout
static uint32_t last_rate_check_time = 0;
static uint32_t prev_leak_snapshot = 0;
static uint32_t buzzer_off_time = 0;
static uint32_t window_start_total = 0;
static uint32_t last_window_reset = 0;

static void IRAM_ATTR onLeakageInterrupt() {
    uint32_t nowUs = micros();
    // Dynamic anti-ringing hardware debounce filter (0.1ms - 3.0ms)
    if (nowUs - isr_leak_last_us < isr_leak_debounce_us) return;
    isr_leak_last_us = nowUs;
    
    isr_leak_total++;
    isr_leak_last_time_ms = millis();
}

void CoilLeakSensor::begin() {
    pinMode(PIN_COIL_LEAK_SENSE, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_LEAK_SENSE), onLeakageInterrupt, FALLING);
    
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
}

void CoilLeakSensor::update(AppSettings& s) {
    uint32_t now = millis();
    
    s.coilLeakCount = isr_leak_total;
    
    // Safety: If ignition simulator is NOT running, mute buzzer and clear active flag immediately
    if (!s.isRunning) {
        s.coilLeakDetected = false;
        digitalWrite(PIN_BUZZER, LOW);
        return;
    }
    
    // Multi-Tier Sensitivity Calibration:
    // Level 1: Ultra (Debounce 0.2ms, Thresh 1 - Micro leakage detection)
    // Level 2: High (Debounce 0.5ms, Thresh 2 - Fine resin cracks)
    // Level 3: Medium / Standard (Debounce 1.0ms, Thresh 3 - Standard)
    // Level 4: Super Immune (Debounce 1.5ms, Thresh 5 - Direct spark gap exposure only)
    // Level 5: Custom (User slider defined: Thresh 1-10, Debounce 0.1-3.0ms)
    uint32_t threshold = 3;
    float debounceMs = 1.0f;
    
    switch (s.coilLeakSensitivity) {
        case 1: debounceMs = 0.2f; threshold = 1; break;
        case 2: debounceMs = 0.5f; threshold = 2; break;
        case 3: debounceMs = 1.0f; threshold = 3; break;
        case 4: debounceMs = 1.5f; threshold = 5; break;
        case 5: 
            debounceMs = (s.coilLeakDebounceMs >= 0.1f) ? s.coilLeakDebounceMs : 1.0f;
            threshold = (s.coilLeakThreshold >= 1) ? s.coilLeakThreshold : 3;
            break;
        default: debounceMs = 1.0f; threshold = 3; break;
    }
    
    isr_leak_debounce_us = (uint32_t)(debounceMs * 1000.0f);
    
    // Rolling 350ms window count calculation
    if (now - last_window_reset >= 350) {
        window_start_total = isr_leak_total;
        last_window_reset = now;
    }
    uint32_t current_window_hits = isr_leak_total - window_start_total;
    
    // Leak rate per second calculation
    if (now - last_rate_check_time >= 1000) {
        s.coilLeakRate = (uint16_t)(isr_leak_total - prev_leak_snapshot);
        prev_leak_snapshot = isr_leak_total;
        last_rate_check_time = now;
        
        // 4-Tier Severity Classification
        if (s.coilLeakRate == 0 && isr_leak_total == 0) {
            strncpy(s.coilLeakSeverity, "PERFECT (0 LEAK)", sizeof(s.coilLeakSeverity));
        } else if (s.coilLeakRate <= 5) {
            strncpy(s.coilLeakSeverity, "MICRO-LEAKAGE", sizeof(s.coilLeakSeverity));
        } else if (s.coilLeakRate <= 25) {
            strncpy(s.coilLeakSeverity, "MEDIUM ARCING", sizeof(s.coilLeakSeverity));
        } else {
            strncpy(s.coilLeakSeverity, "SEVERE BREAKDOWN", sizeof(s.coilLeakSeverity));
        }
    }
    
    // Active detection: triggers if hit received within 350ms AND hits >= threshold
    bool isLeakingNow = (now - isr_leak_last_time_ms < 350) && (current_window_hits >= threshold);
    s.coilLeakDetected = isLeakingNow;
    
    // Integrate Body Leakage Penalty into Coil Health Analyzer
    if (s.coilFiredCount > 0) {
        float baseHealth = s.coilHealthPercent;
        if (s.coilLeakRate > 25 || strstr(s.coilLeakSeverity, "SEVERE") != nullptr) {
            s.coilHealthPercent = (baseHealth > 20.0f) ? 20.0f : baseHealth;
        } else if (s.coilLeakRate > 5 || strstr(s.coilLeakSeverity, "MEDIUM") != nullptr) {
            s.coilHealthPercent = (baseHealth > 50.0f) ? 50.0f : baseHealth;
        } else if (isLeakingNow || s.coilLeakCount > 0) {
            s.coilHealthPercent = (baseHealth > 75.0f) ? 75.0f : baseHealth;
        }
    }
    
    // Buzzer alarm control
    if (isLeakingNow) {
        if (now > buzzer_off_time) {
            digitalWrite(PIN_BUZZER, HIGH);
            uint32_t pulseDuration = (s.coilLeakRate > 25) ? 25 : 40;
            buzzer_off_time = now + pulseDuration;
        }
    } else {
        if (now >= buzzer_off_time) {
            digitalWrite(PIN_BUZZER, LOW);
        }
    }
}

void CoilLeakSensor::reset(AppSettings& s) {
    isr_leak_total = 0;
    isr_leak_last_time_ms = 0;
    prev_leak_snapshot = 0;
    s.coilLeakCount = 0;
    s.coilLeakRate = 0;
    s.coilLeakDetected = false;
    strncpy(s.coilLeakSeverity, "PERFECT (0 LEAK)", sizeof(s.coilLeakSeverity));
    digitalWrite(PIN_BUZZER, LOW);
}
