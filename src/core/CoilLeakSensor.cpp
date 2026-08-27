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
    // Mode 1: 0% (Cut-In - up to 10 ARC)
    // Mode 2: 25% (Mikro Leak - up to 20 ARC)
    // Mode 3: 50% (Sedang - up to 30 ARC)
    // Mode 4: 75% (Bocor Parah - up to 40 ARC)
    // Mode 5: 100% (Jebol Total - up to 50 ARC)
    // Mode 6: CUSTOM (User slider defined: Thresh 1-50, Debounce 0.1-8.0ms)
    uint32_t threshold = 4;
    float debounceMs = 3.0f;
    
    switch (s.coilLeakSensitivity) {
        case 1: debounceMs = 3.0f; threshold = 2; break;  // 0% Cut-In
        case 2: debounceMs = 2.5f; threshold = 4; break;  // 25% Mikro
        case 3: debounceMs = 3.0f; threshold = 6; break;  // 50% Sedang
        case 4: debounceMs = 3.5f; threshold = 8; break;  // 75% Bocor Parah
        case 5: debounceMs = 4.0f; threshold = 12; break; // 100% Jebol Total
        case 6: 
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
        
        // Custom Percentage & Severity Classification (0 - 50 ARC Scale)
        uint8_t cutIn = s.leakArcCutIn > 0 ? s.leakArcCutIn : 10;
        uint8_t a25 = s.leakArc25 > cutIn ? s.leakArc25 : 20;
        uint8_t a50 = s.leakArc50 > a25 ? s.leakArc50 : 30;
        uint8_t a75 = s.leakArc75 > a50 ? s.leakArc75 : 40;
        uint8_t a100 = s.leakArc100 > a75 ? s.leakArc100 : 50;
        
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
