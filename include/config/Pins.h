#ifndef CONFIG_PINS_H
#define CONFIG_PINS_H

// ==========================================
// IGNITION COIL TESTER - PIN CONFIGURATION
// ==========================================
// Board: Wemos D1 R32 (ESP32)

// --- Output Pins ---
#define PIN_COIL_PASSIVE_IGBT 33 // Dedicated for 2-Pin Passive Coil (IGBT Gate Driver, GPIO 33)
#define PIN_COIL_ACTIVE_IGT   25 // Dedicated Logic IGT Output for 3-Pin & 4-Pin Active Coil (GPIO 25)
#define PIN_INJECTOR          32 // Fuel Injector MOSFET Driver Output (GPIO 32)
#define PIN_SOLENOID          32 // Solenoid 2-Pin Output (GPIO 32)
#define PIN_ISC_RSO           33 // Rotary Solenoid Open (Duty D%)
#define PIN_ISC_RSC           32 // Rotary Solenoid Close (Duty 100-D%)

// --- Diagnostic Input Pins ---
#define PIN_COIL_ACTIVE_IGF   34 // Internal Ignition Feedback (IGF) Input for 4-Pin Smart Coil (GPIO 34)
#define PIN_COIL_ISENSE       35 // Primary Current Sense ADC Input (ACS712-30A, GPIO 35)
#define PIN_COIL_LEAK_SENSE   36 // Body Leakage Probe Input (GPIO 36 / VP)
#define PIN_COIL_SPARK_SENSE  39 // External Spark Energy Analog Input from LM358 Pin 1 (GPIO 39 / VN)
#define PIN_COIL_SPARK_PULSE  26 // External Spark Digital Cadence/Pulse Input from LM358 Pin 7 (GPIO 26)
#define PIN_BUZZER            12 // Alarm Buzzer Output (Active/Passive Piezo, GPIO 12)

// --- Speedometer Cluster Output Pins ---
#define PIN_RPM 4           // LEDC Channel 1
#define PIN_KMH 2           // LEDC Channel 2
#define PIN_PWM_TEMP 13     // PWM output for Temperature (4N35)
#define PIN_PWM_FUEL 15     // PWM output for Fuel (4N35)

// --- Hall Signal Simulation Pins (CKP / CMP) ---
#define PIN_CKP 25          // Hall Signal Out 1 (Crankshaft)
#define PIN_CMP 26          // Hall Signal Out 2 (Camshaft)

// --- Stepper Motor Pins (IACV) ---
#define PIN_STEP_A_PLUS  16
#define PIN_STEP_A_MINUS 17
#define PIN_STEP_B_PLUS  18
#define PIN_STEP_B_MINUS 19

// --- Rotary Encoder ---
#define PIN_ENC_CLK 14
#define PIN_ENC_DT  23
#define PIN_ENC_SW  27

// --- OLED Display, MCP4725 DAC & ADS1115 ADC (I2C) ---
// Standard ESP32 I2C pins
#define PIN_OLED_SDA 21
#define PIN_OLED_SCL 22
#define MCP4725_I2C_ADDR 0x60     // Default MCP4725 address (A0 to GND)
#define MCP4725_I2C_ADDR_ALT 0x61 // Alternate MCP4725 address (A0 to VCC)
#define ADS1115_I2C_ADDR 0x48     // Default ADS1115 I2C ADC address (ADDR to GND)

// --- Dual Temperature Sensor (Dallas 1-Wire DS18B20) ---
#define PIN_DS18B20_1WIRE 13      // 1-Wire Data Line for Coil & Driver Temp (GPIO 13)

// --- TFT Display (SPI) - Reserved for future ---
// Standard ESP32 VSPI pins
#define PIN_TFT_MOSI 23
#define PIN_TFT_MISO 19
#define PIN_TFT_SCK  18
#define PIN_TFT_CS   5
#define PIN_TFT_DC   17
#define PIN_TFT_RST  16

#endif // CONFIG_PINS_H
