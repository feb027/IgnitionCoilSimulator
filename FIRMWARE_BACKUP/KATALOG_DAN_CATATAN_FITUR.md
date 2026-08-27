# 📑 KATALOG RESMI & CATATAN FITUR FIRMWARE
### Proyek: ESP32 Automotive Diagnostic Simulator & Coil Health Analyzer

Direktori `FIRMWARE_BACKUP/` ini dibuat khusus sebagai pusat arsip dan backup firmware original maupun versi pengembangannya. Semua file binary (`.bin`) siap pakai telah di-generate secara independen dan dapat langsung di-flash kapan saja.

---

## 🗂️ STRUKTUR DIREKTORI BACKUP

```text
FIRMWARE_BACKUP/
├── v1.0.0_ORIGINAL_BASE/          <-- Firmware Versi Awal / Asli (Original Baseline)
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
├── v2.3.0_FULL_DASHBOARD/         <-- Versi Lengkap Multi-Monitor (Arsip Dashboard Besar)
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
├── v2.4.0_COMPACT_COCKPIT/        <-- Versi Cockpit 1-Layar Ringkas Tanpa Scroll
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
├── v2.5.0_CUSTOM_COMPACT/         <-- VERSI TERBAIK & AKTIF (Semua Fitur Penuh + Tata Letak Ringkas)
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
└── KATALOG_DAN_CATATAN_FITUR.md   <-- Panduan & Dokumentasi Lengkap ini
```

---

## 📊 TABEL PERBANDINGAN FITUR ANTAR VERSI

| Kategori Fitur | v1.0.0 (Original) | v2.3.0 (Full Dashboard) | v2.4.0 (Compact Cockpit) | v2.5.0 (Custom Compact) |
| :--- | :---: | :---: | :---: | :---: |
| **Status Saat Ini** | Arsip Cadangan Asli | Arsip Dashboard Luas | Arsip Eksperimen UI | **⭐ AKTIF DI PERANGKAT** |
| **Tampilan Web UI** | Standar Awal | Multi-Panel Dials Besar | Single Screen Cockpit | **Cockpit Ringkas Harmonis** |
| **Kontrol RPM & Dwell** | Dial Standar | Dial Penuh Terpisah | Dial Mini Berdampingan | **Dial Mini Side-by-Side (Bebas Scroll)** |
| **Dual Gauge Kualitas Api & Irama** | ❌ Belum Ada | ✅ Dual Gauge Besar | ✅ 4 Pilar Ringkas | ✅ **Dual Gauge Independen Penuh (mA & %)** |
| **Monitor Arus Primer (Peak ACS712)** | ❌ Belum Terkalibrasi | ✅ Angka Besar + [🔍 CHECK COIL] | ✅ Pilar Arus | ✅ **Angka Besar + [🔍 CHECK COIL]** |
| **Detektor Kebocoran Bodi (Pin 36)** | ❌ Belum Ada | ✅ Kartu Khusus + 5 Preset | ✅ Indikator Status | ✅ **Dedicated Card + 5 Preset + Slider** |
| **Filter Debounce Float di NVS** | ❌ Belum Ada | ✅ 0.1 - 3.0 ms | ✅ 0.1 - 3.0 ms | ✅ **0.1 - 3.0 ms Presisi di NVS** |
| **Kalkulasi Tri-Dimension Health** | ❌ Belum Ada | ✅ Faktor Api+Irama+Bodi | ✅ Skor Terintegrasi | ✅ **Skor Faktor Api+Irama+Bodi (0-100%)** |
| **Live Trend Performance SVG Graph** | ❌ Belum Ada | ✅ Grafik Terbuka Terus | ✅ Tersembunyi | ✅ **Collapsible Tab (Buka Sesuai Kebutuhan)** |
| **Panduan & Troubleshooting Wiring** | ❌ Teks Singkat | ✅ Terbuka Penuh | ✅ Accordion Ringkas | ✅ **Collapsible Accordion di Bagian Bawah** |

---

## 🔍 RINCIAN FITUR PER VERSI

### 1️⃣ Versi: `v1.0.0_ORIGINAL_BASE` (Original Baseline)
* **Karakteristik:** Versi stabil awal murni sebelum penambahan modul sensor sekunder.
* **Fitur Utama:**
  * Pengujian Koil Standar (Driver IGBT Pin 33 & Trigger IGT Pin 25).
  * Pengujian Injector Driver (Pin 27).
  * Pengujian Stepper Motor Idle Air Control Valve (IACV 4-kawat / Bipolar & Unipolar).
  * Simulator Speedometer 4-Jarum & Multi-waveform.
  * Pembangkit Sinyal PWM & Sinyal Sensor Hall/DAC.
  * Layar OLED U8g2 & Rotary Encoder di Core 0 FreeRTOS.
  * Failsafe boot pins (semua pin pengapian LOW saat boot).

---

### 2️⃣ Versi: `v2.3.0_FULL_DASHBOARD` (Full Features Dashboard)
* **Karakteristik:** Versi dengan seluruh instrumen telemetri ditampilkan secara utuh (*dedicated cards* dan dial ukuran penuh).
* **Fitur Utama:**
  * Dial RPM & Dwell terpisah di grid atas.
  * Dual Gauge Independen untuk Kualitas Api (mA) & Irama Detak (%).
  * Monitor Ampere Primer Peak ACS712 dengan tombol `[🔍 CHECK COIL]`.
  * Dedicated Leakage Card Pin 36 dengan 5 preset kepekaan dan slider.
  * Live Performance Trend SVG Graph selalu aktif dan buku panduan terbuka.

---

### 3️⃣ Versi: `v2.4.0_COMPACT_COCKPIT` (Single-Screen Cockpit)
* **Karakteristik:** Tampilan eksperimental yang menyatukan kontrol dalam 1 layar tanpa scroll.
* **Fitur:** Dial mini RPM & Dwell bersebelahan, 4 pilar metrik utama menyatu, grafik disembunyikan.

---

### 4️⃣ Versi: `v2.5.0_CUSTOM_COMPACT` (Versi Terbaik — Sedang Aktif di ESP32)
* **Karakteristik:** Menggabungkan **kelengkapan fitur 100% dari versi Full** dengan **kenyamanan tata letak versi Ringkas**. Memungkinkan pengguna mengatur RPM & Dwell sambil mengamati seluruh telemetri pengapian dan kebocoran insulasi bodi secara simultan tanpa scroll.
* **Keunggulan Tata Letak (Custom Placement):**
  1. **Dial Mini Berdampingan (Side-by-Side):** Pengaturan Engine Speed (RPM) & Dwell Time (ms) ditempatkan ringkas di bagian atas.
  2. **Dual Gauge Penuh & Lengkap:**
     * **Gauge 1 (mA):** Mengukur kuat arus percikan api busi ($10 - 80\text{mA}$) dari Pin 39 (VN) & optocoupler 4N35 dengan batas sehat $>45\text{mA}$.
     * **Gauge 2 (%):** Mengukur irama detak loncatan api ($0 - 100\%$) dan deteksi *misfire*.
  3. **Monitor Ampere Primer Peak (ACS712 Pin 35):**
     * Angka arus primer besar ($0.0 - 15.0\text{A}$) + tombol **[🔍 CHECK COIL]** untuk pengujian manual.
  4. **High-Voltage Body Insulation Leak Detector (Pin 36):**
     * Kartu khusus dengan status buzzer, Total Leak Arcs, Rate Arcs/s, tombol Reset, dan **5 Tingkat Kepekaan Filter:**
       * `1: ULTRA` ($0.2\text{ms} / 1\text{ Arc}$) — Peka mikro leak saat koil ON, diam saat koil OFF.
       * `2: TINGGI` ($0.5\text{ms} / 2\text{ Arcs}$) — Khusus retak halus leher resin.
       * `3: STANDAR` ($1.0\text{ms} / 3\text{ Arcs}$) — Kebal radiasi medan magnet udara.
       * `4: KEBAL` ($1.5\text{ms} / 5\text{ Arcs}$) — Hanya aktif jika probe ditempelkan ke celah busi.
       * `5: CUSTOM` — Slider bebas mengatur ambang trigger ($1-10\text{ Arcs}$) dan debounce ($0.1-3.0\text{ms}$).
  5. **Kalkulasi Kesehatan Tri-Dimension:**
     * Skor kelayakan koil ($0 - 100\%$) otomatis turun jika terjadi kebocoran bodi atau api lemah.
  6. **Grafik Tren Performa (Collapsible Tab):**
     * Ditempatkan dalam tab lipat yang bisa dibuka/tutup sesuai kebutuhan untuk menghemat beban render dan tampilan tetap rapi.
  7. **Buku Panduan Diagnosa & Troubleshooting (Collapsible Accordion):**
     * Ditempatkan di bagian bawah halaman display sehingga tidak mengganggu ruang kerja utama, namun selalu siap dibuka kapan pun dibutuhkan.

---

## ⚡ PIN HARDWARE ESP32 REFERENCE

| Pin ESP32 | Fungsi Hardware | Catatan Rangkaian |
| :--- | :--- | :--- |
| **GPIO 25** | Output IGT Trigger (Koil 3-Pin / 4-Pin) | Level 5V via Logic Converter |
| **GPIO 33** | Output IGBT Driver (Koil Pasif 2-Pin) | Drive Gate IGBT Internal Tester |
| **GPIO 34** | Input IGF Confirmation (Koil 4-Pin) | Pull-up 1kΩ ke 5V |
| **GPIO 35** | Input Sensor Arus Primer ACS712 | ADC Arus Primer Koil ($0-15\text{A}$) |
| **GPIO 36 (VP)** | Input Detektor Kebocoran Bodi (Leak) | Resistor $150\text{k}\Omega - 470\text{k}\Omega$ + Zener $5.1\text{V}$ |
| **GPIO 39 (VN)** | Input Sensor Arus Sekunder Api (Spark mA) | Optocoupler 4N35 / Trafo CT Shunt |
| **GPIO 27** | Output Injector Driver | Low-Side MOSFET Driver |
| **GPIO 18, 19, 21, 22** | Output Stepper Motor IACV | Driver ULN2003 / L298N |

---

## 🚀 CARA FLASH FIRMWARE DARI BACKUP

### Cara 1: Menggunakan PlatformIO di VS Code
```powershell
# Berpindah ke Versi Custom Compact v2.5.0 (Sedang Aktif)
git checkout v2.5.0-custom
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi Full Dashboard v2.3.0
git checkout v2.3.0-full
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi Original Asli v1.0.0
git checkout v1.0.0-original
pio run -t upload -t uploadfs --upload-port COM7
```
