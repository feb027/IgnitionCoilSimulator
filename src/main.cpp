#ifndef UNIT_TEST

#include <Arduino.h>
#include <esp_task_wdt.h>
#include "core/SettingsManager.h"
#include "core/CoilDriver.h"
#include "ui/DisplayManager.h"
#include "ui/MenuSystem.h"

// Instantiate core modules
SettingsManager settingsMgr;
CoilDriver coilDriver(settingsMgr);
DisplayManager displayMgr(settingsMgr);
MenuSystem menuSys(settingsMgr, coilDriver);

uint32_t lastDisplayUpdate = 0;

void setup() {
    Serial.begin(115200);
    Serial.println("Starting ESP32 Ignition Coil Tester...");

    // Initialize hardware watchdog (2 seconds timeout)
    esp_task_wdt_init(2, true);
    esp_task_wdt_add(NULL);

    // Initialize in order of dependencies
    settingsMgr.begin();
    coilDriver.begin();
    displayMgr.begin();
    menuSys.begin();

    Serial.println("Initialization complete.");
}

void loop() {
    // Reset watchdog timer
    esp_task_wdt_reset();

    // 1. Process encoder and button inputs
    menuSys.update();
    
    // 2. Process coil driver state (if any dynamic checks are needed outside ISR)
    coilDriver.update();
    
    // 3. Update display at a higher frame rate (e.g., 33 Hz / 30ms) for smooth animations
    uint32_t now = millis();
    if (now - lastDisplayUpdate > 30) {
        displayMgr.update(menuSys);
        lastDisplayUpdate = now;
    }
}

#endif // UNIT_TEST
