#include "services/TempSensorService.h"

#define DS18B20_CMD_SKIP_ROM    0xCC
#define DS18B20_CMD_CONVERT_T   0x44
#define DS18B20_CMD_READ_SCRATCH 0xBE

TempSensorService::TempSensorService()
    : _pin(PIN_DS18B20_1WIRE),
      _detectedCount(0),
      _lastPollMs(0),
      _conversionPending(false),
      _coilTempC(28.5f),
      _driverTempC(29.0f) {}

void TempSensorService::begin(uint8_t pin) {
    _pin = pin;
    pinMode(_pin, INPUT_PULLUP);
    if (reset()) {
        _detectedCount = 1; // At least 1 sensor detected on line
    } else {
        _detectedCount = 0;
    }
}

bool TempSensorService::reset() {
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delayMicroseconds(480);
    
    pinMode(_pin, INPUT_PULLUP);
    delayMicroseconds(70);
    bool presence = (digitalRead(_pin) == LOW);
    delayMicroseconds(410);
    return presence;
}

void TempSensorService::writeByte(uint8_t byte) {
    for (uint8_t i = 0; i < 8; i++) {
        pinMode(_pin, OUTPUT);
        digitalWrite(_pin, LOW);
        if (byte & 0x01) {
            delayMicroseconds(8);
            pinMode(_pin, INPUT_PULLUP);
            delayMicroseconds(55);
        } else {
            delayMicroseconds(60);
            pinMode(_pin, INPUT_PULLUP);
            delayMicroseconds(5);
        }
        byte >>= 1;
    }
}

uint8_t TempSensorService::readByte() {
    uint8_t byte = 0;
    for (uint8_t i = 0; i < 8; i++) {
        pinMode(_pin, OUTPUT);
        digitalWrite(_pin, LOW);
        delayMicroseconds(3);
        pinMode(_pin, INPUT_PULLUP);
        delayMicroseconds(10);
        if (digitalRead(_pin)) {
            byte |= (1 << i);
        }
        delayMicroseconds(50);
    }
    return byte;
}

bool TempSensorService::readScratchpad(float &tempOut) {
    if (!reset()) return false;
    writeByte(DS18B20_CMD_SKIP_ROM);
    writeByte(DS18B20_CMD_READ_SCRATCH);

    uint8_t data[9];
    for (uint8_t i = 0; i < 9; i++) {
        data[i] = readByte();
    }

    int16_t raw = (int16_t)((data[1] << 8) | data[0]);
    // 12-bit resolution: 0.0625°C per LSB
    tempOut = raw * 0.0625f;
    return (tempOut > -50.0f && tempOut < 125.0f);
}

void TempSensorService::update() {
    uint32_t now = millis();
    if (now - _lastPollMs < 1000) return; // Run once per second
    _lastPollMs = now;

    if (!_conversionPending) {
        if (reset()) {
            writeByte(DS18B20_CMD_SKIP_ROM);
            writeByte(DS18B20_CMD_CONVERT_T);
            _conversionPending = true;
            _detectedCount = 1;
        } else {
            _detectedCount = 0;
        }
    } else {
        float tempVal = 0.0f;
        if (readScratchpad(tempVal)) {
            _coilTempC = tempVal;
            // Simulated driver temp tracking or dual probe offset
            _driverTempC = _coilTempC + 1.5f; 
        }
        _conversionPending = false;
    }
}
