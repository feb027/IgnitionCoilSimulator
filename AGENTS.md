# AGENTS.md

## Project
ESP32 Ignition Coil Tester / Simulator  
Board: Wemos D1 R32 (`board = wemos_d1_uno32`)  
Framework: Arduino via PlatformIO

## Strict Rules
- **NO monolithic files.** Every responsibility has its own .h/.cpp.
- `main.cpp` must stay thin (only setup + loop + object creation).
- All timing must use hardware peripherals (LEDC or gptimer). Never use blocking delay for dwell.
- Pins only defined in `include/config/Pins.h`.
- Safety limits (max dwell, max frequency) are hard requirements and must be enforced in CoilDriver.
- Dual display support via DisplayManager abstraction (OLED primary, TFT optional).

## Architecture
See `docs/ARCHITECTURE.md`. Follow it strictly.

## When adding features
1. Update the relevant class only.
2. Keep UI completely separated from CoilDriver.
3. Persist new settings via Settings class (NVS).
4. Update docs if pins or safety limits change.