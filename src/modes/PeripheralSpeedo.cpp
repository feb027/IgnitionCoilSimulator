#include "PeripheralSpeedo.h"
#include "config/Pins.h"

PeripheralSpeedo::PeripheralSpeedo(SettingsManager& settingsMgr, SweepController& sweepController)
    : _settingsMgr(settingsMgr), _sweepController(sweepController),
      _tempPot(PIN_X9C_INC, PIN_X9C_UD, PIN_X9C_CS_TEMP),
      _fuelPot(PIN_X9C_INC, PIN_X9C_UD, PIN_X9C_CS_FUEL) {}

void PeripheralSpeedo::begin() {
    _tempPot.begin();
    _fuelPot.begin();
    
    // Timer 1 and 2 for LEDC (ESP32)
    ledcSetup(1, 50, 10);
    ledcAttachPin(PIN_RPM, 1);
    ledcWrite(1, 0);
    
    ledcSetup(2, 50, 10);
    ledcAttachPin(PIN_KMH, 2);
    ledcWrite(2, 0);
}

void PeripheralSpeedo::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.mode == MODE_SWEEP && s.isRunning) {
        if (_sweepController.update()) {
            updateTimerConfig();
        }
    }
}

void PeripheralSpeedo::updateTimerConfig() {
    AppSettings& s = _settingsMgr.getSettings();
    
    float hzKmh = ((float)s.currentSpeedoKmh * s.pulsePerKm) / 3600.0f;
    float hzRpm = (float)s.currentSpeedoRpm / 30.0f; // 4-cylinder assumption
    
    if (hzKmh > 1.0f) {
        ledcWriteTone(2, hzKmh);
    } else {
        ledcWriteTone(2, 0);
        ledcWrite(2, 0);
    }
    
    if (hzRpm > 1.0f) {
        ledcWriteTone(1, hzRpm);
    } else {
        ledcWriteTone(1, 0);
        ledcWrite(1, 0);
    }
    
    _tempPot.setPercent(s.currentSpeedoTempPercent);
    _fuelPot.setPercent(s.currentSpeedoFuelPercent);
}

void PeripheralSpeedo::start() {
    AppSettings& s = _settingsMgr.getSettings();
    _sweepController.beginSweep();
    updateTimerConfig();
    s.isRunning = true;
    s.lastFiredMs = millis();
}

void PeripheralSpeedo::stop() {
    ledcWrite(1, 0);
    ledcWrite(2, 0);
    
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    
    if (s.mode == MODE_SWEEP) {
        _sweepController.reset();
        updateTimerConfig();
    }
}

void PeripheralSpeedo::trigger() {
    start();
}

void PeripheralSpeedo::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
    AppSettings& s = _settingsMgr.getSettings();
    
    auto drawHighlight = [&](int idx, int x, int y, int w, int h) {
        if (isEditMode && focusIndex == idx) {
            u8g2.setDrawColor(1);
            u8g2.drawBox(x, y, w, h);
            u8g2.setDrawColor(0);
        } else {
            u8g2.setDrawColor(1);
        }
    };
    
    // 2x2 Grid Layout
    u8g2.drawLine(64, 15, 64, 64);
    u8g2.drawLine(0, 39, 128, 39);
    
    // Top Left: KM/H
    drawHighlight(1, 0, 16, 63, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 25);
    u8g2.print("KM/H");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 37);
    u8g2.print(s.currentSpeedoKmh);

    // Top Right: RPM
    drawHighlight(2, 65, 16, 63, 23);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(68, 25);
    u8g2.print("RPM");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 37);
    u8g2.print(s.currentSpeedoRpm);

    // Bottom Left: TEMP
    drawHighlight(3, 0, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(2, 49);
    u8g2.print("TEMP");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(2, 61);
    u8g2.print(s.currentSpeedoTempPercent);
    u8g2.print("%");

    // Bottom Right: FUEL
    drawHighlight(4, 65, 40, 63, 24);
    u8g2.setFont(u8g2_font_helvB08_tr);
    u8g2.setCursor(68, 49);
    u8g2.print("FUEL");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(68, 61);
    u8g2.print(s.currentSpeedoFuelPercent);
    u8g2.print("%");
    
    u8g2.setDrawColor(1);
}

void PeripheralSpeedo::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    
    if (focusIndex == 1) { // KMH
        s.speedoKmh += (diff * 10);
        if (s.speedoKmh < 0) s.speedoKmh = 0;
        if (s.speedoKmh > 300) s.speedoKmh = 300;
    } else if (focusIndex == 2) { // RPM
        s.speedoRpm += (diff * 500);
        if (s.speedoRpm < 0) s.speedoRpm = 0;
        if (s.speedoRpm > 15000) s.speedoRpm = 15000;
    } else if (focusIndex == 3) { // TEMP
        s.speedoTempPercent += (diff * 5);
        if (s.speedoTempPercent < 0) s.speedoTempPercent = 0;
        if (s.speedoTempPercent > 100) s.speedoTempPercent = 100;
    } else if (focusIndex == 4) { // FUEL
        s.speedoFuelPercent += (diff * 5);
        if (s.speedoFuelPercent < 0) s.speedoFuelPercent = 0;
        if (s.speedoFuelPercent > 100) s.speedoFuelPercent = 100;
    }
    
    if (s.isRunning && focusIndex > 0) {
        trigger();
    } else if (!s.isRunning && focusIndex > 0) {
        updateTimerConfig();
    }
}

int PeripheralSpeedo::getMaxFocusIndex() const {
    return 4;
}
