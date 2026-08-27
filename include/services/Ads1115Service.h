#ifndef SERVICES_ADS1115_SERVICE_H
#define SERVICES_ADS1115_SERVICE_H

#include <Arduino.h>
#include <Wire.h>
#include "config/Pins.h"

class Ads1115Service {
public:
    static Ads1115Service& getInstance() {
        static Ads1115Service instance;
        return instance;
    }

    void begin(uint8_t i2cAddr = ADS1115_I2C_ADDR);
    void update(); // Non-blocking poll

    bool isAvailable() const { return _available; }
    
    // Joystick normalized (-100 to +100, 0 is center)
    int16_t getJoystickX() const { return _joyX; }
    int16_t getJoystickY() const { return _joyY; }
    
    // Battery supply voltage in Volts (0.0V - 18.0V) with calibration support
    float getSupplyVoltage(float calGain = 1.0f, float calOffset = 0.0f) const {
        float v = (_supplyVoltage * calGain) + calOffset;
        return (v < 0.0f) ? 0.0f : v;
    }
    
    // Auxiliary raw voltage in Volts
    float getAuxVoltage() const { return _auxVoltage; }

private:
    Ads1115Service();
    uint8_t _addr;
    bool _available;
    uint8_t _currentMux;
    uint32_t _lastPollMs;

    int16_t _joyX;
    int16_t _joyY;
    float _supplyVoltage;
    float _auxVoltage;

    void startConversion(uint8_t muxChannel);
    int16_t readConversion();
};

#endif // SERVICES_ADS1115_SERVICE_H
