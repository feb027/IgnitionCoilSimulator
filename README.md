# ⚡ ESP32 Ignition Coil Tester & Simulator

[![PlatformIO](https://img.shields.io/badge/PlatformIO-Compatible-orange?logo=platformio)](https://platformio.org/)
[![Framework](https://img.shields.io/badge/Framework-Arduino-blue?logo=arduino)](https://www.arduino.cc/)
[![ESP32](https://img.shields.io/badge/Board-Wemos%20D1%20R32-black?logo=espressif)](https://www.espressif.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Sebuah alat *tester* dan *simulator* koil pengapian (Ignition Coil), aktuator PWM (Solenoid), dan Speedometer yang sangat presisi, modular, dan aman. Proyek ini dibangun di atas *platform* ESP32 (Wemos D1 R32) menggunakan arsitektur mutakhir (FreeRTOS Dual-Core & Plugin Pattern). Alat ini dirancang untuk bengkel, *tuner*, atau *hobbyist* yang membutuhkan injeksi sinyal presisi ke komponen otomotif.

---

## ✨ Fitur Unggulan

- 🧠 **Arsitektur Dual-Core (FreeRTOS)**: Core 0 murni digunakan untuk merender antarmuka OLED (400kHz Fast I2C) dan membaca Encoder tanpa lag. Core 1 secara eksklusif dan konstan mengeksekusi kalkulasi *hardware timer* (PWM/Coil/Speedo).
- 🧩 **100% Plugin-Based (Strategy Pattern)**: Sangat mudah menambahkan alat uji baru tanpa perlu membongkar logika utama. Sistem *Plug & Play*!
- 🛡️ **Keamanan Ekstrem (Failsafe Boot-Up)**: Pin *output* selalu dikunci ke posisi `LOW` secara absolut saat *booting*, melindungi koil Anda dari percikan api liar akibat *voltage spikes*.
- 🎯 **Presisi Mikrodetik**: Memanfaatkan *Hardware Timer* bawaan ESP32 (menggantikan fungsi `delay()`) sehingga *Dwell Time*, RPM, dan sinyal PWM dihasilkan secara identik layaknya ECU mobil sungguhan.
- 💾 **Non-Volatile Settings (NVS)**: Sistem secara cerdas menyimpan preferensi RPM & Dwell Anda terakhir kali. Tidak perlu putar dari awal tiap alat dinyalakan.
- 📺 **OLED Screensaver**: Mencegah *burn-in* layar jika dibiarkan *idle* terlalu lama.

---

## 🛠️ Mode Alat Uji (Plugins)

1. **Ignition Coil Tester** (`PulseMode::COIL`)
   - Mengatur **RPM** (Putaran Mesin) dan **Dwell Time** (Waktu Pengisian Koil).
   - Mendukung mode **CONTINUOUS**, **BURST** (5 pulsa presisi), dan **SINGLE**.
   - Batas keselamatan (*Safety Guard*) tertanam pada level *hardware* untuk mencegah *overheating* (Dwell otomatis dipotong jika frekuensi RPM tidak masuk akal).

2. **PWM Actuator / Solenoid Tester** (`PulseMode::PWM`)
   - Menyimulasikan sinyal PWM presisi dari 0% hingga 100% Duty Cycle.
   - Berguna untuk mengetes Boost Controller, VVT-i Solenoid (OCV), EGR Valve, atau sekadar kipas PWM elektrik.

3. **Speedometer Emulator** (`PulseMode::SPEEDO`)
   - Membangkitkan sinyal kecepatan takometer digital berdasarkan Pulsa-Per-Km.
   - Dilengkapi fungsi lonjakan (*Sweep Controller*) halus layaknya *opening ceremony* pada *dashboard* mobil modern.

---

## 🔌 Daftar Komponen Utama

- **Wemos D1 R32** (Bisa diganti ESP32 NodeMCU biasa, pastikan mapping pin sesuai)
- **Layar OLED 0.96"** I2C (128x64)
- **Rotary Encoder** (Module KY-040)
- **IGBT Otomotif** (IRGB14C40L / ISL9V5036P3)
- **Modul Optocoupler TLP250** (Sangat disarankan untuk stabilitas)
- Resistor (100 Ohm, 330 Ohm, 10k Ohm)

---

## 🔗 Skema Wiring (Pinout ESP32)

Berikut adalah koneksi standar berdasarkan konfigurasi bawaan firmware:

### 1. Antarmuka Layar & Kendali (Core 0)
| Modul | Pin Modul | Pin ESP32 (Wemos D1 R32) |
| :--- | :--- | :--- |
| **OLED (I2C)** | SDA | **GPIO 21** |
| | SCL | **GPIO 22** |
| | VCC / GND | 3.3V / GND |
| **Rotary Encoder** | CLK | **GPIO 25** |
| | DT | **GPIO 26** |
| | SW | **GPIO 27** |
| | VCC / GND | 3.3V / GND |

### 2. Output Tester & Hardware Timer (Core 1)
| Fitur / Modul | Pin ESP32 | Keterangan |
| :--- | :--- | :--- |
| **Ignition Coil Out** | **GPIO 33** | Terhubung ke IGBT (Low-Side Switch) |
| **PWM Solenoid** | **GPIO 32** | Output PWM generik (OCV, IACV, dll) |
| **Speedometer RPM** | **GPIO 4** | Pulsa Takometer / Speedo Kmh |

*(Untuk kabel Digital Potentiometer (Digipot) Speedometer, lihat file `include/config/Pins.h`)*

---

## ⚠️ PERINGATAN KERAS: Keamanan & Wiring (Kabel) ⚠️

**JANGAN PERNAH MENYAMBUNGKAN PIN ESP32 LANGSUNG KE IGNITION COIL!**
Ignition Coil menghasilkan tegangan hingga puluhan ribu volt. Saat medan magnet di dalam koil runtuh, ia akan mengirimkan lonjakan tegangan balik (*Back-EMF*) yang sangat masif. Jika kabel ini terhubung langsung ke ESP32, mikrokontrolermu akan **meledak atau mati total**.

### Topologi Rangkaian (Low-Side Switch)
Gunakan **IGBT** yang dirancang khusus untuk menahan lonjakan induktif otomotif.

**Rekomendasi IGBT Otomotif:**
| Tipe IGBT | Fitur | Keterangan |
| :--- | :--- | :--- |
| `IRGB14C40L` | Logic Level Gate | **Sangat disarankan!** Bisa dipicu sinyal 3.3V ESP32. |
| `ISL9V5036P3` | Logic Level Gate | Standar ECU otomotif. |

### Industrial Safe: Isolasi Optocoupler (Sangat Disarankan)
Untuk mencegah layar *nge-blank* atau ESP32 me-reset sendiri karena radiasi gelombang elektromagnetik (EMI) dari koil, gunakan **Optocoupler TLP250** sebagai *Gate Driver* antara ESP32 dan IGBT. Silakan baca: [`docs/WIRING_TLP250_TOYOTA.md`](docs/WIRING_TLP250_TOYOTA.md).

---

## 🚀 Cara Instalasi & Kompilasi (PlatformIO)

Proyek ini menggunakan **PlatformIO IDE** (bukan Arduino IDE standar).
1. *Clone* repositori ini.
2. Buka *folder* di VSCode dengan ekstensi PlatformIO terinstal.
3. *Build & Upload*:
   ```bash
   pio run -t upload
   ```
4. *Unit Test* (Opsional - pastikan hardware terhubung):
   ```bash
   pio test -e wemos_d1_uno32
   ```

## 🏗️ Struktur Arsitektur (Bagi Pengembang)

Ingin berkontribusi menambahkan mode tester motor IACV Stepper? Sistem kami sudah 100% Modular berbasis Plugin!
Silakan baca panduan aturan (*Strict Rules*) arsitektur kami di: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) dan baca agen kustomisasi di `.agents/AGENTS.md`.

---
*Dibangun dengan dedikasi penuh keamanan agar eksperimen otomotif di garasi Anda tetap terkendali.*
