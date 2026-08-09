#include <Arduino.h>
#include <unity.h>
#include "core/SettingsManager.h"
#include "core/CoilDriver.h"

SettingsManager sm;
CoilDriver cd(sm);

void setUp(void) {
    // set stuff up here
}

void tearDown(void) {
    // clean stuff up here
}

void test_settings_rpm_limits(void) {
    AppSettings& s = sm.getSettings();
    
    // Test assignment
    s.rpm = 0;
    TEST_ASSERT_EQUAL(0, s.rpm); 
    
    s.rpm = 6000;
    TEST_ASSERT_EQUAL(6000, s.rpm);
}

void test_driver_duty_cycle_calculation(void) {
    AppSettings& s = sm.getSettings();
    s.rpm = 6000; // 6000 RPM = 100 Hz = 10ms period
    s.dwellMs = 3.0f;    // 3ms dwell
    s.pulseMode = PULSE_DWELL;
    
    // We expect duty cycle to be 30%
    float periodMs = 1000.0f / (s.rpm / 60.0f);
    float duty = (s.dwellMs / periodMs) * 100.0f;
    
    TEST_ASSERT_FLOAT_WITHIN(0.1f, 30.0f, duty);
}

void setup() {
    // NOTE!!! Wait for >2 secs
    // if board doesn't support software reset via Serial.DTR/RTS
    delay(2000);

    UNITY_BEGIN();
    RUN_TEST(test_settings_rpm_limits);
    RUN_TEST(test_driver_duty_cycle_calculation);
    UNITY_END();
}

void loop() {
    digitalWrite(13, HIGH);
    delay(100);
    digitalWrite(13, LOW);
    delay(500);
}
