#include <Arduino.h>
#include <unity.h>
#include "core/SettingsManager.h"
#include "core/SweepController.h"

SettingsManager settingsMgr;
SweepController sweepController(settingsMgr);

void setUp(void) {
    // Reset settings before each test
    settingsMgr.begin();
    AppSettings& s = settingsMgr.getSettings();
    s.rpm = 1000;
    s.sweepTimeSec = 5;
    s.rpmStep = 1000;
    s.mode = MODE_SWEEP;
    s.isRunning = false;
}

void tearDown(void) {
    // Clean up after each test
}

void test_sweep_controller_limits(void) {
    AppSettings& s = settingsMgr.getSettings();
    
    // Test base logic
    s.rpm = 1000;
    sweepController.beginSweep();
    
    // Wait for 1 second to simulate real time passing
    delay(1010); 
    
    bool updated = sweepController.update();
    
    TEST_ASSERT_TRUE(updated);
    TEST_ASSERT_GREATER_THAN(0, s.rpm);
    TEST_ASSERT_LESS_THAN(1000, s.rpm);
    
    // Test max limits
    s.rpm = 12000;
    
    // Wait for 1 second
    delay(1010);
    
    sweepController.update();
    
    // In our current implementation, sweep resets to 0 when it exceeds max
    // Let's assert it never exceeds 12000
    TEST_ASSERT_LESS_OR_EQUAL(12000, s.rpm);
}

void test_rpm_math(void) {
    // 1000 RPM = 1000/60 = 16.66 Hz = 33.33 Hz toggles (on/off)
    // 12000 RPM = 200 Hz
    int rpm = 12000;
    float hz = rpm / 60.0f;
    TEST_ASSERT_EQUAL_FLOAT(200.0f, hz);
}

void test_settings_manager(void) {
    AppSettings& s = settingsMgr.getSettings();
    s.dwellMs = 3.5f;
    settingsMgr.save();
    
    // Load again
    settingsMgr.begin();
    TEST_ASSERT_EQUAL_FLOAT(3.5f, s.dwellMs);
}

void setup() {
    // NOTE!!! Wait for >2 secs
    // if board doesn't support software reset via Serial.DTR/RTS
    delay(2000);

    UNITY_BEGIN();

    RUN_TEST(test_rpm_math);
    RUN_TEST(test_sweep_controller_limits);
    RUN_TEST(test_settings_manager);

    UNITY_END();
}

void loop() {
    delay(100);
}
