# Project: ESP32 Ignition Coil Tester / Simulator

## Arsitektur: Plugin-Based Strategy
Codebase ini 100% menggunakan arsitektur modular berbasis **Plugin (Strategy Pattern)** via `IPeripheral.h`.

### Aturan Wajib (Strict Architecture Rules):
1. **NO MONOLITHIC LOGIC**: Dilarang keras menempatkan `if (mode == COIL) else if (mode == STEPPER)` di dalam `MenuSystem`, `DisplayManager`, maupun `DashboardEditor`.
2. **PeripheralManager Delegation**: Segala pergantian mode, batas nilai, *UI rendering*, dan kontrol hardware wajib didelegasikan (*delegate*) ke `PeripheralManager` -> `IPeripheral`.
3. **Hardware Pin Isolation**: Semua pin wajib dideklarasikan *hanya* di dalam `include/config/Pins.h`.
4. **Failsafe Boot-Up**: Pada `setup()`, semua pin output pengapian (`PIN_COIL_PASSIVE_IGBT`, `PIN_COIL_ACTIVE_IGT`, `PIN_SOLENOID`) wajib diatur `OUTPUT` + `LOW` secara absolut sebelum task RTOS/timer dimulai.
5. **Dual-Core FreeRTOS**: UI (Layar OLED U8g2 & Encoder) hidup secara eksklusif di **Core 0** (FreeRTOS Task `uiTask`). Logika peripheral utama (*update*, *SweepController*, Timers) tetap di `loop()` **Core 1**. Dilarang operasi blokir di Core 1/ISR.
6. **Hard Code Limit**: Maksimal 300 baris per file untuk seluruh jenis file (`.cpp`, `.h`, `.js`, `.css`, `.html`).
7. **Menambahkan Tester Baru**: Tambahkan ke enum `PulseMode`, buat `Peripheral<Name>.h/cpp` di `src/modes/`, implementasikan `IPeripheral`, dan daftarkan di `PeripheralManager`. UI (OLED & Preact Web UI) akan beradaptasi otomatis.
8. **Git & Deploy Workflow**:
   - Commit lokal berorientasi milestone (`feat:`, `fix:`, `refactor:`, `docs:`) tanpa push ke remote tanpa izin.
   - Build & upload otomatis ke MCU fisik via `pio run -t upload` dan `pio run -t uploadfs`.

## Comprehensive Rules & Documentation
- Pedoman lengkap & engineering rules: [`.agents/rules/ignition_architecture_rules.md`](.agents/rules/ignition_architecture_rules.md)
- Detail arsitektur sistem: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

