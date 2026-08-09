#ifndef DIGIPOT_DRIVER_H
#define DIGIPOT_DRIVER_H

#include <Arduino.h>

class DigipotDriver {
public:
    DigipotDriver(uint8_t incPin, uint8_t udPin, uint8_t csPin);
    
    void begin();
    
    // Set wiper position from 0 to 100 percent
    void setPercent(uint8_t percent);
    
private:
    uint8_t _incPin;
    uint8_t _udPin;
    uint8_t _csPin;
    uint8_t _currentPercent;
    
    void step(bool up, uint8_t steps);
};

#endif
