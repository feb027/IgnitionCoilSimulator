#include "services/TempSensorService.h"

#define DS18B20_CMD_SKIP_ROM     0xCC
#define DS18B20_CMD_CONVERT_T    0x44
#define DS18B20_CMD_READ_SCRATCH 0xBE

TempSensorService::TempSensorService()
    : _pin(PIN_DS18B20_1WIRE),
      _detectedCount(0),
      _lastPollMs(0),
      _conversionPending(false),
      _calOffset(0.0f),
      _coilTempC(28.5f),
      _driverTempC(29.0f) {
    _mux = portMUX_INITIALIZER_UNLOCKED;
}

void TempSensorService::begin(uint8_t pin) {
    _pin = pin;
    pinMode(_pin, INPUT_PULLUP);
    if (reset()) {
        _detectedCount = 1;
    } else {
        _detectedCount = 0;
    }
}

bool TempSensorService::reset() {
    portENTER_CRITICAL(&_mux);
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delayMicroseconds(480);
    
    pinMode(_pin, INPUT_PULLUP);
    delayMicroseconds(70);
    bool presence = (digitalRead(_pin) == LOW);
    portEXIT_CRITICAL(&_mux);
    
    delayMicroseconds(410);
    return presence;
}

void TempSensorService::writeBit(uint8_t bit) {
    portENTER_CRITICAL(&_mux);
    if (bit & 1) {
        pinMode(_pin, OUTPUT);
        digitalWrite(_pin, LOW);
        delayMicroseconds(6);
        pinMode(_pin, INPUT_PULLUP);
        delayMicroseconds(64);
    } else {
        pinMode(_pin, OUTPUT);
        digitalWrite(_pin, LOW);
        delayMicroseconds(60);
        pinMode(_pin, INPUT_PULLUP);
        delayMicroseconds(10);
    }
    portEXIT_CRITICAL(&_mux);
    delayMicroseconds(2);
}

uint8_t TempSensorService::readBit() {
    uint8_t bit = 0;
    portENTER_CRITICAL(&_mux);
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delayMicroseconds(3);
    pinMode(_pin, INPUT_PULLUP);
    delayMicroseconds(8);
    bit = digitalRead(_pin) ? 1 : 0;
    portEXIT_CRITICAL(&_mux);
    delayMicroseconds(55);
    return bit;
}

void TempSensorService::writeByte(uint8_t byte) {
    for (uint8_t i = 0; i < 8; i++) {
        writeBit(byte & 0x01);
        byte >>= 1;
    }
}

uint8_t TempSensorService::readByte() {
    uint8_t byte = 0;
    for (uint8_t i = 0; i < 8; i++) {
        if (readBit()) {
            byte |= (1 << i);
        }
    }
    return byte;
}

uint8_t TempSensorService::crc8(const uint8_t *data, uint8_t len) {
    uint8_t crc = 0;
    for (uint8_t i = 0; i < len; i++) {
        uint8_t inbyte = data[i];
        for (uint8_t j = 0; j < 8; j++) {
            uint8_t mix = (crc ^ inbyte) & 0x01;
            crc >>= 1;
            if (mix) crc ^= 0x8C;
            inbyte >>= 1;
        }
    }
    return crc;
}

bool TempSensorService::readScratchpad(float &tempOut) {
    if (!reset()) return false;
    writeByte(DS18B20_CMD_SKIP_ROM);
    writeByte(DS18B20_CMD_READ_SCRATCH);

    uint8_t data[9];
    for (uint8_t i = 0; i < 9; i++) {
        data[i] = readByte();
    }

    // Strict 1-Wire CRC validation
    if (crc8(data, 8) != data[8]) {
        return false;
    }

    int16_t raw = (int16_t)((data[1] << 8) | data[0]);
    // 12-bit resolution: 0.0625°C per LSB
    float calculated = raw * 0.0625f;

    // Filter power-on reset value (85.0°C) and out-of-range anomalies
    if (calculated == 85.0f || calculated < -40.0f || calculated > 125.0f) {
        return false;
    }

    tempOut = calculated;
    return true;
}

void TempSensorService::update(float calOffset) {
    if (calOffset != 0.0f) _calOffset = calOffset;
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
            _coilTempC = tempVal + _calOffset;
            _driverTempC = _coilTempC + 0.5f; 
        }
        _conversionPending = false;
    }
}
