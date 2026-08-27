#include "services/Ads1115Service.h"

#define ADS_REG_CONVERT 0x00
#define ADS_REG_CONFIG  0x01

#define ADS_OS_START    0x8000
#define ADS_PGA_4_096V  0x0200 // +/- 4.096V (1 bit = 0.125mV)
#define ADS_MODE_SINGLE 0x0100
#define ADS_DR_860SPS   0x00E0
#define ADS_COMP_DIS    0x0003

Ads1115Service::Ads1115Service()
    : _addr(ADS1115_I2C_ADDR),
      _available(false),
      _currentMux(0),
      _lastPollMs(0),
      _joyX(0),
      _joyY(0),
      _supplyVoltage(12.6f),
      _auxVoltage(0.0f) {}

void Ads1115Service::begin(uint8_t i2cAddr) {
    _addr = i2cAddr;
    Wire.beginTransmission(_addr);
    if (Wire.endTransmission() == 0) {
        _available = true;
        _currentMux = 0;
        startConversion(0);
    } else {
        _available = false;
        _supplyVoltage = 12.6f;
    }
}

void Ads1115Service::startConversion(uint8_t muxChannel) {
    if (!_available) return;
    
    // MUX: 0=AIN0, 1=AIN1, 2=AIN2, 3=AIN3 vs GND
    uint16_t muxBits = (0x4000 | (muxChannel << 12));
    uint16_t config = ADS_OS_START | muxBits | ADS_PGA_4_096V | ADS_MODE_SINGLE | ADS_DR_860SPS | ADS_COMP_DIS;

    Wire.beginTransmission(_addr);
    Wire.write(ADS_REG_CONFIG);
    Wire.write((uint8_t)(config >> 8));
    Wire.write((uint8_t)(config & 0xFF));
    Wire.endTransmission();
}

int16_t Ads1115Service::readConversion() {
    if (!_available) return 0;
    
    Wire.beginTransmission(_addr);
    Wire.write(ADS_REG_CONVERT);
    Wire.endTransmission();

    Wire.requestFrom(_addr, (uint8_t)2);
    if (Wire.available() >= 2) {
        uint8_t msb = Wire.read();
        uint8_t lsb = Wire.read();
        return (int16_t)((msb << 8) | lsb);
    }
    return 0;
}

void Ads1115Service::update() {
    if (!_available) return;

    uint32_t now = millis();
    if (now - _lastPollMs < 10) return; // 10ms per channel = 40ms complete scan
    _lastPollMs = now;

    // Read previous conversion result
    int16_t raw = readConversion();
    if (raw < 0) raw = 0;
    float voltage = raw * 0.000125f; // 0.125mV per LSB at +/-4.096V gain

    switch (_currentMux) {
        case 0: { // Channel 0: Joystick X (VRx, 0V - 3.3V, center ~1.65V)
            int16_t centered = (int16_t)(((voltage - 1.65f) / 1.65f) * 100.0f);
            _joyX = constrain(centered, -100, 100);
            if (abs(_joyX) < 8) _joyX = 0; // Center deadband
            break;
        }
        case 1: { // Channel 1: Joystick Y (VRy, 0V - 3.3V, center ~1.65V)
            int16_t centered = (int16_t)(((voltage - 1.65f) / 1.65f) * 100.0f);
            _joyY = constrain(centered, -100, 100);
            if (abs(_joyY) < 8) _joyY = 0; // Center deadband
            break;
        }
        case 2: { // Channel 2: Supply Battery Voltage (+12V via 100k:10k divider -> 11:1)
            float vBat = voltage * 11.0f;
            if (vBat < 1.0f) vBat = 0.0f;
            _supplyVoltage = (_supplyVoltage * 0.85f) + (vBat * 0.15f); // Low-pass filter
            break;
        }
        case 3: { // Channel 3: Auxiliary Analog Sense
            _auxVoltage = voltage;
            break;
        }
    }

    // Switch to next MUX channel
    _currentMux = (_currentMux + 1) % 4;
    startConversion(_currentMux);
}
