#include "PeripheralIsc3Pin.h"
#include "config/Pins.h"
#include <Arduino.h>

#define LEDC_CH_RSO 6
#define LEDC_CH_RSC 7
#define LEDC_TIMER_RES_BITS 10 // 0 - 1023

PeripheralIsc3Pin::PeripheralIsc3Pin(SettingsManager& settingsMgr)
    : _settingsMgr(settingsMgr), _lastDuty(-1.0f), _lastFreq(-1), _lastRunning(false) {}

void PeripheralIsc3Pin::begin() {
    pinMode(PIN_ISC_RSO, OUTPUT);
    digitalWrite(PIN_ISC_RSO, LOW);
    pinMode(PIN_ISC_RSC, OUTPUT);
    digitalWrite(PIN_ISC_RSC, LOW);

    ledcSetup(LEDC_CH_RSO, 250, LEDC_TIMER_RES_BITS);
    ledcAttachPin(PIN_ISC_RSO, LEDC_CH_RSO);
    ledcWrite(LEDC_CH_RSO, 0);

    ledcSetup(LEDC_CH_RSC, 250, LEDC_TIMER_RES_BITS);
    ledcAttachPin(PIN_ISC_RSC, LEDC_CH_RSC);
    ledcWrite(LEDC_CH_RSC, 0);
}

void PeripheralIsc3Pin::update() {
    AppSettings& s = _settingsMgr.getSettings();
    if (s.isRunning != _lastRunning || s.iscDuty != _lastDuty || s.iscFreq != _lastFreq) {
        updatePwmHardware();
    }
}

void PeripheralIsc3Pin::syncHardware() {
    updatePwmHardware();
}

void PeripheralIsc3Pin::start() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = true;
    updatePwmHardware();
}

void PeripheralIsc3Pin::stop() {
    AppSettings& s = _settingsMgr.getSettings();
    s.isRunning = false;
    _lastRunning = false;
    ledcWrite(LEDC_CH_RSO, 0);
    ledcWrite(LEDC_CH_RSC, 0);
    digitalWrite(PIN_ISC_RSO, LOW);
    digitalWrite(PIN_ISC_RSC, LOW);
}

void PeripheralIsc3Pin::trigger() {
    start();
}

void PeripheralIsc3Pin::updatePwmHardware() {
    AppSettings& s = _settingsMgr.getSettings();
    _lastRunning = s.isRunning;
    _lastDuty = s.iscDuty;
    _lastFreq = s.iscFreq;

    if (!s.isRunning) {
        ledcWrite(LEDC_CH_RSO, 0);
        ledcWrite(LEDC_CH_RSC, 0);
        digitalWrite(PIN_ISC_RSO, LOW);
        digitalWrite(PIN_ISC_RSC, LOW);
        return;
    }

    if (s.iscFreq < 10) s.iscFreq = 10;
    if (s.iscFreq > 1000) s.iscFreq = 1000;
    if (s.iscDuty < 0.0f) s.iscDuty = 0.0f;
    if (s.iscDuty > 100.0f) s.iscDuty = 100.0f;

    ledcSetup(LEDC_CH_RSO, s.iscFreq, LEDC_TIMER_RES_BITS);
    ledcSetup(LEDC_CH_RSC, s.iscFreq, LEDC_TIMER_RES_BITS);

    uint32_t dutyRso = (uint32_t)((s.iscDuty / 100.0f) * 1023.0f);
    uint32_t dutyRsc = (uint32_t)(((100.0f - s.iscDuty) / 100.0f) * 1023.0f);

    ledcWrite(LEDC_CH_RSO, dutyRso);
    ledcWrite(LEDC_CH_RSC, dutyRsc);
}

bool PeripheralIsc3Pin::shouldShowMenuItem(int menuIndex) {
    // Only show Mode TYPE (0) and EXIT (9)
    if (menuIndex == 0 || menuIndex == 9) return true;
    return false;
}

void PeripheralIsc3Pin::cycleRunMode(AppSettings& s, int direction) {
    // Single continuous mode
    s.mode = MODE_CONTINUOUS;
}

void PeripheralIsc3Pin::drawDashboard(U8G2& u8g2, int focusIndex, bool isEditMode) {
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

    // Dynamic Valve Position Bar (Row 1: 17 - 25, height 8)
    int barX = 2;
    int barY = 17;
    int barW = 124;
    int barH = 8;
    u8g2.drawFrame(barX, barY, barW, barH);
    
    // Center divider tick (50% midpoint)
    u8g2.drawLine(barX + (barW / 2), barY, barX + (barW / 2), barY + barH - 1);

    // Filled position
    int fillW = (int)((s.iscDuty / 100.0f) * (barW - 4));
    if (fillW > 0) {
        u8g2.drawBox(barX + 2, barY + 2, fillW, barH - 4);
    }

    // Main Parameter Boxes (Row 2: 27 - 52, height 25)
    // Box 1: VALVE % (Focus 1)
    drawHighlight(1, 2, 27, 68, 25);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(6, 35);
    u8g2.print("VALVE");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(6, 48);
    u8g2.print((int)s.iscDuty);
    u8g2.print("%");
    u8g2.setDrawColor(1);

    // Box 2: FREQ Hz (Focus 2)
    drawHighlight(2, 73, 27, 53, 25);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.setCursor(77, 35);
    u8g2.print("FREQ");
    u8g2.setFont(u8g2_font_helvB10_tr);
    u8g2.setCursor(77, 48);
    u8g2.print(s.iscFreq);
    u8g2.setFont(u8g2_font_5x7_tr);
    u8g2.print("Hz");
    u8g2.setDrawColor(1);

    // Bottom Status Line (Row 3: 54 - 64)
    u8g2.setFont(u8g2_font_6x10_tr);
    u8g2.setCursor(4, 63);
    u8g2.print("RSO:");
    u8g2.print((int)s.iscDuty);
    u8g2.print("%");

    u8g2.setCursor(70, 63);
    u8g2.print("RSC:");
    u8g2.print((int)(100.0f - s.iscDuty));
    u8g2.print("%");
}

void PeripheralIsc3Pin::handleEncoder(int diff, int focusIndex) {
    AppSettings& s = _settingsMgr.getSettings();
    if (focusIndex == 1) {
        // Edit Opening Duty %
        s.iscDuty += diff * 1.0f;
        if (s.iscDuty < 0.0f) s.iscDuty = 0.0f;
        if (s.iscDuty > 100.0f) s.iscDuty = 100.0f;
    } else if (focusIndex == 2) {
        // Edit Frequency in Hz
        s.iscFreq += diff * 10;
        if (s.iscFreq < 50) s.iscFreq = 50;
        if (s.iscFreq > 500) s.iscFreq = 500;
    }
    _settingsMgr.save();
    updatePwmHardware();
}

void PeripheralIsc3Pin::handleDashboardEncoder(int diff, AppSettings& s) {
    // Direct duty adjustment from dashboard
    s.iscDuty += diff * 5.0f;
    if (s.iscDuty < 0.0f) s.iscDuty = 0.0f;
    if (s.iscDuty > 100.0f) s.iscDuty = 100.0f;
    _settingsMgr.save();
    updatePwmHardware();
}
