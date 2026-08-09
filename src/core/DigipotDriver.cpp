#include "DigipotDriver.h"

DigipotDriver::DigipotDriver(uint8_t incPin, uint8_t udPin, uint8_t csPin) {
    _incPin = incPin;
    _udPin = udPin;
    _csPin = csPin;
    _currentPercent = 0;
}

void DigipotDriver::begin() {
    pinMode(_incPin, OUTPUT);
    pinMode(_udPin, OUTPUT);
    pinMode(_csPin, OUTPUT);
    
    digitalWrite(_incPin, HIGH);
    digitalWrite(_udPin, HIGH);
    digitalWrite(_csPin, HIGH);
    
    // Calibrate: Move 100 steps down to ensure we are at 0 (without saving to EEPROM)
    step(false, 100);
    _currentPercent = 0;
}

void DigipotDriver::setPercent(uint8_t percent) {
    if (percent > 100) percent = 100;
    
    if (percent == _currentPercent) return;
    
    if (percent > _currentPercent) {
        step(true, percent - _currentPercent);
    } else {
        step(false, _currentPercent - percent);
    }
    
    _currentPercent = percent;
}

void DigipotDriver::step(bool up, uint8_t steps) {
    digitalWrite(_udPin, up ? HIGH : LOW);
    delayMicroseconds(5); // Setup time
    
    digitalWrite(_csPin, LOW); // Select chip
    delayMicroseconds(5);
    
    for (uint8_t i = 0; i < steps; i++) {
        digitalWrite(_incPin, LOW);
        delayMicroseconds(2);
        digitalWrite(_incPin, HIGH);
        delayMicroseconds(2);
    }
    
    // Deselect WITHOUT writing to EEPROM to prevent wear (max 100k writes)
    // Datasheet: CS HIGH while INC is LOW = do not store.
    digitalWrite(_incPin, LOW);
    delayMicroseconds(5);
    digitalWrite(_csPin, HIGH);
    delayMicroseconds(5);
    digitalWrite(_incPin, HIGH); // Return INC to idle
}
