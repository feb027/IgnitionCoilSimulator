#ifndef UNIT_TEST

#include <Arduino.h>
#include <esp_task_wdt.h>
#include "core/SettingsManager.h"
#include "core/PeripheralManager.h"
#include "ui/DisplayManager.h"
#include "ui/MenuSystem.h"
#include "core/NetworkManager.h"
#include "core/CoilLeakSensor.h"
#include "services/Ads1115Service.h"
#include "services/TempSensorService.h"
#include "config/Pins.h"

// Instantiate core modules
SettingsManager settingsMgr;
PeripheralManager peripheralMgr(settingsMgr);
DisplayManager displayMgr(settingsMgr, peripheralMgr);
MenuSystem menuSys(settingsMgr, peripheralMgr);
NetworkManager networkMgr(settingsMgr, peripheralMgr, menuSys);

uint32_t lastDisplayUpdate = 0;

// FreeRTOS Task for UI handling (Pinned to Core 0)
void uiTask(void *pvParameters) {
    uint32_t lastFrameTime = millis();
    for (;;) {
        uint32_t now = millis();
        float dt = (now - lastFrameTime) / 1000.0f;
        if (dt == 0) dt = 0.001f;
        lastFrameTime = now;
        
        // Process encoder and button inputs
        menuSys.update(dt);
        
        // Update display at a higher frame rate (e.g., 33 Hz / 30ms) for smooth animations
        now = millis();
        if (now - lastDisplayUpdate > 30) {
            displayMgr.update(menuSys);
            lastDisplayUpdate = now;
        }
        
        // Update network tasks (WebSocket broadcasting)
        networkMgr.update();
        
        // Yield to other tasks (e.g., WiFi if enabled later)
        vTaskDelay(pdMS_TO_TICKS(5)); 
    }
}

void setup() {
    // --- FAILSAFE BOOT-UP ---
    // Ensure critical output pins are explicitly set LOW immediately
    // before any other peripheral or RTOS task is initialized.
    // This prevents stray voltage spikes from firing the coil on boot.
    pinMode(PIN_COIL_PASSIVE_IGBT, OUTPUT);
    digitalWrite(PIN_COIL_PASSIVE_IGBT, LOW);
    pinMode(PIN_COIL_ACTIVE_IGT, OUTPUT);
    digitalWrite(PIN_COIL_ACTIVE_IGT, LOW);
    pinMode(PIN_SOLENOID, OUTPUT);
    digitalWrite(PIN_SOLENOID, LOW);
    
    Serial.begin(115200);
    Serial.println("Starting ESP32 Ignition Coil Tester...");

    // Initialize hardware watchdog (2 seconds timeout)
    esp_task_wdt_init(2, true);
    esp_task_wdt_add(NULL);

    // Initialize in order of dependencies
    settingsMgr.begin();
    CoilLeakSensor::begin();
    Ads1115Service::getInstance().begin();
    TempSensorService::getInstance().begin();
    peripheralMgr.begin();
    displayMgr.begin();
    menuSys.begin();
    networkMgr.begin();

    // Create UI Task on Core 0
    xTaskCreatePinnedToCore(
        uiTask,        // Task function
        "UI_Task",     // Name of task
        4096,          // Stack size of task
        NULL,          // Parameter of the task
        1,             // Priority of the task
        NULL,          // Task handle
        0);            // Core where the task should run (Core 0)

    Serial.println("Initialization complete.");
}

void loop() {
    // Reset watchdog timer
    esp_task_wdt_reset();
    
    // Process auxiliary services (ADC Voltmeter, Joystick & Temp sensors)
    Ads1115Service::getInstance().update();
    TempSensorService::getInstance().update();

    // Process peripheral state (Core 1 loop)
    peripheralMgr.update();
    
    // Small delay to prevent watchdog reset if loop gets too tight
    delay(1);
}

#endif // UNIT_TEST
