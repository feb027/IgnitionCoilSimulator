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
├── v2.3.0_FULL_DASHBOARD/         <-- Versi Lengkap Multi-Monitor (Aktif di Alat)
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
└── KATALOG_DAN_CATATAN_FITUR.md   <-- Panduan & Dokumentasi Lengkap ini
```

---

## 📊 TABEL PERBANDINGAN FITUR ANTAR VERSI

| Kategori Fitur | v1.0.0 (Original) | v2.3.0 (Full Dashboard) | v2.4.0 (Compact Cockpit) |
| :--- | :---: | :---: | :---: |
| **Status Saat Ini** | Arsip Cadangan Asli | **AKTIF DI PERANGKAT** | Arsip Eksperimen UI |
| **Tampilan Web UI** | Standar Awal | Full Multi-Panel + Dials Besar | Single Screen Cockpit Ringkas |
| **Uji Koil Pengapian (2P/3P/4P)** | ✅ Standar | ✅ Sangat Lengkap | ✅ Ringkas |
| **Uji Injector / IACV / Stepper** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Speedometer / PWM / Hall DAC** | ✅ Ya | ✅ Ya | ✅ Ya |
| **Dual Gauge Kualitas Api & Irama** | ❌ Belum Ada | ✅ **Dual Gauge Independen (mA & %)** | ✅ 4 Pilar Ringkas |
| **Monitor Arus Primer (Peak ACS712)** | ❌ Belum Terkalibrasi | ✅ **Angka Besar + [🔍 CHECK COIL]** | ✅ Pilar Arus Ringkas |
| **Detektor Kebocoran Bodi (Pin 36)** | ❌ Belum Ada | ✅ **Kartu Khusus + 5 Preset Kepekaan** | ✅ Indikator Status Ringkas |
| **Filter Debounce Float di NVS** | ❌ Belum Ada | ✅ **0.1 - 3.0 ms Tersimpan Presisi** | ✅ Tersimpan Presisi |
| **Kalkulasi Tri-Dimension Health** | ❌ Belum Ada | ✅ **Skor Faktor Api + Irama + Bodi** | ✅ Skor Terintegrasi |
| **Live Performance Trend SVG Graph** | ❌ Belum Ada | ✅ **Grafik Interaktif Standar** | ✅ Collapsible (Bisa Disembunyikan) |
| **Panduan & Troubleshooting Wiring** | ❌ Teks Singkat | ✅ **Buku Panduan Otomotif Lengkap** | ✅ Accordion Ringkas |

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

### 2️⃣ Versi: `v2.3.0_FULL_DASHBOARD` (Full Features — Versi Aktif Saat Ini)
* **Karakteristik:** Versi paling lengkap dengan seluruh instrumen telemetri ditampilkan secara utuh (*dedicated cards*), sangat cocok untuk pengujian mendalam di meja bengkel (*bench testing*).
* **Fitur Baru & Unggulan:**
  1. **Dual Gauge Independen:**
     * **Gauge 1: Kualitas Arus Api (mA):** Mengukur miliampere arus sekunder busi ($10 - 80\text{mA}$) dari Pin 39 (VN) dengan batas sehat $>45\text{mA}$.
     * **Gauge 2: Keteraturan Detak / Irama (%):** Mendeteksi konsistensi frekuensi loncatan api ($0 - 100\%$) dan deteksi *misfire*.
  2. **Monitor Ampere Primer Peak (ACS712 Pin 35):**
     * Menampilkan saturasi arus kumparan primer koil ($0.0 - 15.0\text{A}$) beserta tombol **[🔍 CHECK COIL]** untuk pengujian manual.
  3. **High-Voltage Body Insulation Leak Detector (Pin 36):**
     * Mendeteksi loncatan api kilovolt tembus selongsong karet/resin bodi koil.
     * **5 Tingkat Kepekaan Filter:**
       * `1: ULTRA` ($0.2\text{ms} / 1\text{ Arc}$) — Peka mikro leak saat koil ON, diam saat koil OFF.
       * `2: TINGGI` ($0.5\text{ms} / 2\text{ Arcs}$) — Khusus retak halus leher resin.
       * `3: STANDAR` ($1.0\text{ms} / 3\text{ Arcs}$) — Kebal radiasi medan magnet udara.
       * `4: KEBAL` ($1.5\text{ms} / 5\text{ Arcs}$) — Hanya aktif jika probe ditempelkan ke celah busi.
       * `5: CUSTOM` — Slider bebas mengatur ambang trigger ($1-10\text{ Arcs}$) dan debounce ($0.1-3.0\text{ms}$).
  4. **Kalkulasi Kesehatan Tri-Dimension:**
     * Skor kelayakan koil ($0 - 100\%$) mengkombinasikan kekuatan energi api, irama loncatan, dan degradasi akibat kebocoran bodi.
  5. **Live SVG Trend Performance Analyzer:**
     * Grafik kurva real-time mA dan % vs RPM untuk mengamati performa koil di putaran tinggi tanpa jeda.
  6. **Buku Panduan Otomotif Terbuka:**
     * Menyediakan petunjuk diagnosa celah busi $10-12\text{ mm}$ (kompresi $15\text{ Bar}$), analisa gejala brebet, dan troubleshooting salah colok pin.

---

### 3️⃣ Versi: `v2.4.0_COMPACT_COCKPIT` (Single-Screen Cockpit)
* **Karakteristik:** Tampilan eksperimental yang menyatukan semua kontrol dalam 1 layar tanpa perlu scroll ke bawah di smartphone/tablet.
* **Fitur Utama:**
  * Kontrol RPM dan Dwell mini berdampingan (*side-by-side*).
  * Menggabungkan 4 indikator utama dalam 1 baris (Skor Kelayakan, Arus Api mA, Irama %, dan Arus Primer Peak).
  * Grafik performa dan buku panduan ditaruh dalam menu tab lipat (*collapsible*) agar tampilan tetap bersih dan ringan.

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

### Cara 1: Menggunakan PlatformIO di VS Code (Sangat Mudah)
Untuk berpindah ke versi mana pun:
```powershell
# Berpindah ke Versi Lengkap (Aktif)
git checkout v2.3.0-full
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi Original Asli
git checkout v1.0.0-original
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi Compact 1-Layar
git checkout v2.4.0-compact
pio run -t upload -t uploadfs --upload-port COM7
```

### Cara 2: Flash Langsung File `.bin` via Terminal (Tanpa Compile)
Contoh flash versi `v2.3.0_FULL_DASHBOARD`:
```powershell
esptool.py --chip esp32 --port COM7 --baud 460800 write_flash `
  0x1000 FIRMWARE_BACKUP/v2.3.0_FULL_DASHBOARD/bootloader.bin `
  0x8000 FIRMWARE_BACKUP/v2.3.0_FULL_DASHBOARD/partitions.bin `
  0x10000 FIRMWARE_BACKUP/v2.3.0_FULL_DASHBOARD/firmware.bin `
  0x290000 FIRMWARE_BACKUP/v2.3.0_FULL_DASHBOARD/littlefs.bin
```
