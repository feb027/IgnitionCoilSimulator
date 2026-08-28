#ifndef SERVICES_TEMP_SENSOR_SERVICE_H
#define SERVICES_TEMP_SENSOR_SERVICE_H

#include <Arduino.h>
#include "config/Pins.h"

class TempSensorService {
public:
    static TempSensorService& getInstance() {
        static TempSensorService instance;
        return instance;
    }

    void begin(uint8_t pin = PIN_DS18B20_1WIRE);
    void update(float calOffset = 0.0f); // Polls non-blocking every 1000ms
    void setCalOffset(float offset) { _calOffset = offset; }

    bool isConnected() const { return _detectedCount > 0; }
    uint8_t getSensorCount() const { return _detectedCount; }
    
    // Coil Body Temperature (Stainless Tube Probe) in °C
    float getCoilTempC() const { return _coilTempC; }
    
    // IGBT Driver Heatsink Temperature (TO-92) in °C
    float getDriverTempC() const { return _driverTempC; }

    // Safety threshold check
    bool isOverheated() const { 
        return (_coilTempC > 80.0f || _driverTempC > 85.0f); 
    }

private:
    TempSensorService();
    uint8_t _pin;
    uint8_t _detectedCount;
    uint32_t _lastPollMs;
    bool _conversionPending;
    float _calOffset;

    float _coilTempC;
    float _driverTempC;

    uint8_t _romCoil[8];
    uint8_t _romDriver[8];

    portMUX_TYPE _mux;

    bool reset();
    void writeBit(uint8_t bit);
    uint8_t readBit();
    void writeByte(uint8_t byte);
    uint8_t readByte();
    uint8_t crc8(const uint8_t *data, uint8_t len);
    bool readScratchpad(float &tempOut);
};

#endif // SERVICES_TEMP_SENSOR_SERVICE_H
