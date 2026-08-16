#ifndef COIL_LEAK_SENSOR_H
#define COIL_LEAK_SENSOR_H

#include <Arduino.h>
#include "SettingsManager.h"
#include "config/Pins.h"

class CoilLeakSensor {
public:
    static void begin();
    static void update(AppSettings& s);
    static void reset(AppSettings& s);
};

#endif // COIL_LEAK_SENSOR_H
