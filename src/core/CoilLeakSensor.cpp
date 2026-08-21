#include "CoilLeakSensor.h"

static volatile uint32_t isr_leak_total = 0;
static volatile uint32_t isr_leak_last_time_ms = 0;
static uint32_t last_rate_check_time = 0;
static uint32_t prev_leak_snapshot = 0;
static uint32_t buzzer_off_time = 0;

static void IRAM_ATTR onLeakageInterrupt() {
    isr_leak_total++;
    isr_leak_last_time_ms = millis();
}

void CoilLeakSensor::begin() {
    pinMode(PIN_COIL_LEAK_SENSE, INPUT);
    attachInterrupt(digitalPinToInterrupt(PIN_COIL_LEAK_SENSE), onLeakageInterrupt, FALLING);
    
    pinMode(PIN_BUZZER, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
}

void CoilLeakSensor::update(AppSettings& s) {
    uint32_t now = millis();
    
    s.coilLeakCount = isr_leak_total;
    
    // Leak rate per second calculation
    if (now - last_rate_check_time >= 1000) {
        s.coilLeakRate = (uint16_t)(isr_leak_total - prev_leak_snapshot);
        prev_leak_snapshot = isr_leak_total;
        last_rate_check_time = now;
        
        // 4-Tier Severity Classification
        if (s.coilLeakRate == 0 && isr_leak_total == 0) {
            strncpy(s.coilLeakSeverity, "PERFECT (0 LEAK)", sizeof(s.coilLeakSeverity));
        } else if (s.coilLeakRate <= 10) {
            strncpy(s.coilLeakSeverity, "MICRO-LEAKAGE", sizeof(s.coilLeakSeverity));
        } else if (s.coilLeakRate <= 50) {
            strncpy(s.coilLeakSeverity, "MEDIUM ARCING", sizeof(s.coilLeakSeverity));
        } else {
            strncpy(s.coilLeakSeverity, "SEVERE BREAKDOWN", sizeof(s.coilLeakSeverity));
        }
    }
    
    // Active detection window (active within last 250ms)
    bool isLeakingNow = (now - isr_leak_last_time_ms < 250) && (isr_leak_total > 0);
    s.coilLeakDetected = isLeakingNow;
    
    // Buzzer alarm control (fast pulsing on severe leakage)
    if (isLeakingNow && s.isRunning) {
        if (now > buzzer_off_time) {
            digitalWrite(PIN_BUZZER, HIGH);
            uint32_t pulseDuration = (s.coilLeakRate > 50) ? 25 : 40;
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
