#ifndef CONFIG_PINS_H
#define CONFIG_PINS_H

// ==========================================
// IGNITION COIL TESTER - PIN CONFIGURATION
// ==========================================
// Board: Wemos D1 R32 (ESP32)

// --- Ignition Coil Output ---
// Use a safe output pin that does not affect boot
#define PIN_COIL_OUT 33

// --- Rotary Encoder ---
#define PIN_ENC_CLK 25
#define PIN_ENC_DT  26
#define PIN_ENC_SW  27

// --- OLED Display (I2C) ---
// Standard ESP32 I2C pins
#define PIN_OLED_SDA 21
#define PIN_OLED_SCL 22

// --- TFT Display (SPI) - Reserved for future ---
// Standard ESP32 VSPI pins
#define PIN_TFT_MOSI 23
#define PIN_TFT_MISO 19
#define PIN_TFT_SCK  18
#define PIN_TFT_CS   5
#define PIN_TFT_DC   17
#define PIN_TFT_RST  16

#endif // CONFIG_PINS_H
