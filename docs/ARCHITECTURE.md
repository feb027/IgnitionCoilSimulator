# Architecture

## Layers
1. **Hardware Abstraction** (`config/Pins.h`)  
   Single source of truth for pin definitions.

2. **Core Domain** (`core/`)  
   - `SettingsManager`: NVS management and application state (`AppSettings`).
   - `PeripheralManager`: Brain of the Strategy pattern. Routes commands to the active peripheral.
   - `IPeripheral`: Abstract base class for all testers.
   - `SweepController`: Mathematics and timing calculations for continuous/sweep logic.

3. **Modes (Plugins)** (`modes/`)  
   Concrete implementations of `IPeripheral`.
   - `PeripheralCoil`: Coil tester logic (Timer 0).
   - `PeripheralPwm`: PWM output (Timer 0/LEDC).
   - `PeripheralSpeedo`: Speedometer logic (Timer 1, 2, Digipot).

4. **UI** (`ui/`)  
   - `MenuSystem`: Handles encoder inputs and delegates drawing to pages.
   - `DashboardEditor`: Delegates encoder modifications directly to the active peripheral.
   - `DisplayManager`: Orchestrates U8G2 layout and asks active peripheral to draw itself.

5. **Entry Point**  
   `main.cpp`: Thin entry point. Initializes dependencies and runs `uiTask` on Core 0 and `peripheralMgr.update()` on Core 1 loop.

## Dependencies Direction
```
main.cpp
  → ui/MenuSystem
  → ui/DisplayManager
  → core/PeripheralManager
    → modes/PeripheralCoil, PeripheralPwm, PeripheralSpeedo
```

UI never talks directly to hardware timers. UI delegates all specific layouts to the Peripheral plugins.

---

## Adding a New Tester Tool (e.g. IACV Stepper)
1. Add new mode to `PulseMode` enum in `SettingsManager.h`.
2. Create `PeripheralStepper.h` & `.cpp` in `modes/` inheriting from `IPeripheral`.
3. Add to `PeripheralManager` array.
4. UI will automatically handle it!
