# Project: ESP32 Ignition Coil Tester / Simulator

## Arsitektur: Plugin-Based Strategy
Mulai refactoring Agustus 2026, codebase ini telah 100% menggunakan arsitektur modular berbasis **Plugin (Strategy Pattern)** via `IPeripheral.h`.

### Aturan Wajib (Strict Rules):
1. **NO MONOLITHIC LOGIC**: Dilarang keras menempatkan `if (mode == COIL) else if (mode == STEPPER)` di dalam `MenuSystem`, `DisplayManager`, maupun `DashboardEditor`.
2. **PeripheralManager**: Segala pergantian mode, batas nilai, *UI rendering*, dan kontrol hardware wajib dilempar (*delegate*) ke `PeripheralManager` -> `IPeripheral`.
3. **Hardware Pin Isolation**: Semua pin wajib dideklarasikan *hanya* di dalam `include/config/Pins.h`.
4. **Dual-Core**: UI (Layar & Encoder) hidup secara eksklusif di **Core 0** (FreeRTOS Task `uiTask`). Logika peripheral utama (*update*, *SweepController*) tetap di `loop()` **Core 1**. Dilarang melakukan operasi blokir yang lama di dalam ISR atau Core 1.
5. **Menambahkan Tester Baru**: Cukup tambahkan ke enum `PulseMode`, lalu buat `Peripheral<Name>.h/cpp` di folder `src/modes/`, implementasikan `IPeripheral`, dan daftarkan di konstruktor `PeripheralManager`. Sistem UI akan menyesuaikan otomatis.

## Architecture
See `docs/ARCHITECTURE.md`. Follow it strictly.
