# Architecture

## Layers
1. **Hardware Abstraction** (`drivers/`)  
   OLED, TFT, Encoder

2. **Core Domain** (`core/`)  
   CoilDriver, Settings, Safety

3. **UI** (`ui/`)  
   MenuSystem, DisplayManager

4. **Entry Point**  
   main.cpp (thin)

## Dependencies Direction
```
main.cpp
  → ui/MenuSystem
  → ui/DisplayManager
  → core/CoilDriver
  → core/Settings
  → core/Safety
```

UI never talks directly to hardware timers.  
CoilDriver never knows about displays or menus.

---

### 5. Prompt Lengkap (versi final, non-monolith)

```markdown
You are building a modular ESP32 Ignition Coil Tester using PlatformIO.

STRICT RULES:
- No monolithic files. Every class in its own .h + .cpp.
- main.cpp must stay very thin.
- Follow the exact folder structure provided.
- All pins only in include/config/Pins.h
- Timing must use LEDC or gptimer (no delayMicroseconds for dwell).
- Safety limits enforced inside CoilDriver.

Hardware:
- Board: wemos_d1_uno32
- Primary: 0.96" SSD1306 OLED (I2C)
- Secondary: larger TFT (optional, SPI)
- Rotary encoder + button

Features:
- Set Frequency / RPM
- Set Dwell time (with hard max limit)
- Duty cycle display
- Modes: Continuous, Single, Burst
- Menu driven by encoder
- Settings saved to NVS

Start by creating the complete folder structure and empty modular files first, then implement CoilDriver, then UI.
