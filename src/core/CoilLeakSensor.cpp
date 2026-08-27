#include "CoilLeakSensor.h"

static volatile uint32_t isr_leak_raw_hits = 0;
static volatile uint32_t isr_leak_last_us = 0;
static volatile uint32_t isr_leak_last_time_ms = 0;
static volatile uint32_t isr_leak_debounce_us = 3000; // Default 3.0ms lockout
static uint32_t last_rate_check_time = 0;
static uint32_t prev_leak_snapshot = 0;
static uint32_t buzzer_off_time = 0;
static uint32_t window_start_hits = 0;
static uint32_t last_window_reset = 0;
static uint32_t verified_arcs_total = 0;
static uint32_t last_processed_raw = 0;

static void IRAM_ATTR onLeakageInterrupt() {
    uint32_t nowUs = micros();
    // Dynamic anti-ringing hardware debounce filter (0.8ms - 5.0ms)
    if (nowUs - isr_leak_last_us < isr_leak_debounce_us) return;
    isr_leak_last_us = nowUs;
    
    isr_leak_raw_hits++;
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
    
    // Safety: If ignition simulator is NOT running, mute buzzer and clear active flag immediately
    if (!s.isRunning) {
        s.coilLeakDetected = false;
        digitalWrite(PIN_BUZZER, LOW);
        return;
    }
    
    // Multi-Tier Sensitivity Calibration:
    // Level 1: Ultra (Debounce 0.8ms, Thresh 1 - Direct micro crack probe contact)
    // Level 2: High (Debounce 1.5ms, Thresh 2 - Fine resin cracks)
    // Level 3: Standard (Debounce 3.0ms, Thresh 4 - Robust against air EMI, triggers on body leak)
    // Level 4: Super Immune (Debounce 5.0ms, Thresh 8 - Heavy sustained flashover breakdown only)
    // Level 5: Custom (User slider defined: Thresh 1-25, Debounce 0.1-5.0ms)
    uint32_t threshold = 4;
    float debounceMs = 3.0f;
    
    switch (s.coilLeakSensitivity) {
        case 1: debounceMs = 0.8f; threshold = 1; break;
        case 2: debounceMs = 1.5f; threshold = 2; break;
        case 3: debounceMs = 3.0f; threshold = 4; break;
        case 4: debounceMs = 5.0f; threshold = 8; break;
        case 5: 
            debounceMs = (s.coilLeakDebounceMs >= 0.1f) ? s.coilLeakDebounceMs : 3.0f;
            threshold = (s.coilLeakThreshold >= 1) ? s.coilLeakThreshold : 4;
            break;
        default: debounceMs = 3.0f; threshold = 4; break;
    }
    
    isr_leak_debounce_us = (uint32_t)(debounceMs * 1000.0f);
    
    // Rolling 350ms window count calculation for burst qualification
    if (now - last_window_reset >= 350) {
        window_start_hits = isr_leak_raw_hits;
        last_window_reset = now;
    }
    uint32_t current_window_hits = isr_leak_raw_hits - window_start_hits;
    
    // Noise Gate: Qualify whether activity is real physical arcing
    bool isLeakingNow = (now - isr_leak_last_time_ms < 350) && (current_window_hits >= threshold);
    s.coilLeakDetected = isLeakingNow;
    
    // Accumulate into official ARCS counter only when qualified (blocks stray single air spikes)
    if (isr_leak_raw_hits > last_processed_raw) {
        uint32_t newHits = isr_leak_raw_hits - last_processed_raw;
        if (isLeakingNow || threshold <= 1) {
            verified_arcs_total += newHits;
        }
        last_processed_raw = isr_leak_raw_hits;
    }
    s.coilLeakCount = verified_arcs_total;
    
    // Leak rate per second calculation
    if (now - last_rate_check_time >= 1000) {
        s.coilLeakRate = (uint16_t)(verified_arcs_total - prev_leak_snapshot);
        prev_leak_snapshot = verified_arcs_total;
        last_rate_check_time = now;
        
        // Custom Percentage & Severity Classification
        uint8_t cutIn = s.leakArcCutIn > 0 ? s.leakArcCutIn : 2;
        uint8_t a25 = s.leakArc25 > cutIn ? s.leakArc25 : 5;
        uint8_t a50 = s.leakArc50 > a25 ? s.leakArc50 : 10;
        uint8_t a75 = s.leakArc75 > a50 ? s.leakArc75 : 18;
        uint8_t a100 = s.leakArc100 > a75 ? s.leakArc100 : 25;
        
        uint32_t activeArcs = s.coilLeakRate;
        if (activeArcs < cutIn && verified_arcs_total == 0) {
            s.coilLeakPercent = 0;
            strncpy(s.coilLeakSeverity, "ISOLASI UTUH (0 LEAK)", sizeof(s.coilLeakSeverity));
        } else if (activeArcs <= a25) {
            float ratio = (float)(activeArcs) / (float)(a25);
            s.coilLeakPercent = (uint8_t)(ratio * 25.0f);
            if (s.coilLeakPercent == 0 && activeArcs >= cutIn) s.coilLeakPercent = 10;
            snprintf(s.coilLeakSeverity, sizeof(s.coilLeakSeverity), "MIKRO LEAK (%u%%)", s.coilLeakPercent);
        } else if (activeArcs <= a50) {
            float ratio = (float)(activeArcs - a25) / (float)(a50 - a25);
            s.coilLeakPercent = (uint8_t)(25.0f + ratio * 25.0f);
            snprintf(s.coilLeakSeverity, sizeof(s.coilLeakSeverity), "SEDANG (%u%%)", s.coilLeakPercent);
        } else if (activeArcs <= a75) {
            float ratio = (float)(activeArcs - a50) / (float)(a75 - a50);
            s.coilLeakPercent = (uint8_t)(50.0f + ratio * 25.0f);
            snprintf(s.coilLeakSeverity, sizeof(s.coilLeakSeverity), "BOCOR PARAH (%u%%)", s.coilLeakPercent);
        } else {
            float ratio = (float)(activeArcs - a75) / (float)(a100 - a75);
            uint8_t p = (uint8_t)(75.0f + ratio * 25.0f);
            if (p > 100) p = 100;
            s.coilLeakPercent = p;
            snprintf(s.coilLeakSeverity, sizeof(s.coilLeakSeverity), "JEBOL TOTAL (%u%%)", s.coilLeakPercent);
        }
    }
    
    // Integrate Body Leakage Penalty into Coil Health Analyzer
    if (s.coilFiredCount > 0) {
        float baseHealth = s.coilHealthPercent;
        if (s.coilLeakPercent >= 75) {
            s.coilHealthPercent = (baseHealth > 20.0f) ? 20.0f : baseHealth;
        } else if (s.coilLeakPercent >= 50) {
            s.coilHealthPercent = (baseHealth > 50.0f) ? 50.0f : baseHealth;
        } else if (s.coilLeakPercent >= 25) {
            s.coilHealthPercent = (baseHealth > 75.0f) ? 75.0f : baseHealth;
        }
    }
    
    // Buzzer Alarm Synchronization
    if (isLeakingNow) {
        if (s.coilLeakRate > 15 || current_window_hits > 12) {
            // High-speed / severe continuous arcing: Sustained continuous tone
            digitalWrite(PIN_BUZZER, HIGH);
            buzzer_off_time = now + 150;
        } else {
            // Moderate cadence arcing: Synchronized distinct pulses
            if (now > buzzer_off_time) {
                digitalWrite(PIN_BUZZER, HIGH);
                buzzer_off_time = now + 40;
            }
        }
    } else {
        if (now >= buzzer_off_time) {
            digitalWrite(PIN_BUZZER, LOW);
        }
    }
}

void CoilLeakSensor::reset(AppSettings& s) {
    isr_leak_raw_hits = 0;
    last_processed_raw = 0;
    verified_arcs_total = 0;
    isr_leak_last_time_ms = 0;
    prev_leak_snapshot = 0;
    window_start_hits = 0;
    last_window_reset = millis();
    s.coilLeakCount = 0;
    s.coilLeakRate = 0;
    s.coilLeakDetected = false;
    strncpy(s.coilLeakSeverity, "PERFECT (0 LEAK)", sizeof(s.coilLeakSeverity));
    digitalWrite(PIN_BUZZER, LOW);
}
