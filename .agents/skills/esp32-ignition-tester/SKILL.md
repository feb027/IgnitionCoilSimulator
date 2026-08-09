---
name: esp32-ignition-tester
description: Build and maintain modular PlatformIO firmware for ESP32 ignition coil tester/simulator. Use when working on dwell control, frequency generation, COP driver, OLED+encoder menu, or any ignition coil related ESP32 project.
---

# ESP32 Ignition Coil Tester Skill

## Core Principles
- Strict multi-file modular design. Never put more than one responsibility in a single file.
- CoilDriver is the heart — must generate precise pulses using LEDC or gptimer.
- UI (Menu + Display) is completely decoupled from the driver.
- Safety limits are non-negotiable (max dwell, max frequency, duty protection).

## Required Structure
Follow exactly the folder layout in the project root.  
main.cpp must remain thin.

## Key Classes
- CoilDriver: pulse generation + safety interlocks
- Settings: NVS load/save
- MenuSystem + Encoder: navigation and value editing
- DisplayManager: abstraction over OLED and optional TFT

## Timing
Prefer ESP32 LEDC high-resolution mode or gptimer + ISR.  
Document the chosen method in CoilDriver comments.

## Safety
Always enforce:
- Maximum dwell time
- Maximum frequency / RPM
- Never allow 100% duty cycle continuously