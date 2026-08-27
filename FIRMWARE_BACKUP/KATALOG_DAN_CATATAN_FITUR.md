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
├── v2.5.0_CUSTOM_COMPACT/         <-- Versi Custom Ringkas Telemetri Terintegrasi
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
├── v2.6.0_SAFE_LOCK/              <-- Sticky Emergency Stop + Safety Double-Tap + Fine Sliders + Dwell 0.0ms
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
├── v2.7.0_BENCHMARK_PRO/          <-- ⭐ VERSI TERBARU & AKTIF (Database Mobil/Koil + ADS1115 Voltmeter & Joystick + Dual Suhu DS18B20 + Anti-Jitter Deadband + Matriks Kalibrasi)
│   ├── firmware.bin
│   ├── littlefs.bin
│   ├── bootloader.bin
│   └── partitions.bin
│
└── KATALOG_DAN_CATATAN_FITUR.md   <-- Panduan & Dokumentasi Lengkap ini
```

---

## 📊 TABEL PERBANDINGAN FITUR ANTAR VERSI

| Kategori Fitur | v1.0.0 | v2.3.0 | v2.6.0 | v2.7.0 (Benchmark Pro) |
| :--- | :---: | :---: | :---: | :---: |
| **Status Saat Ini** | Cadangan Asli | Arsip Luas | Arsip Safe Lock | **⭐ AKTIF DI PERANGKAT** |
| **Database Profil Mobil & Koil** | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ✅ **Built-In Presets + Cold vs Hot Endurance Logger** |
| **Voltmeter Realtime (ADS1115 I2C)** | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ✅ **Scanner-Style Voltmeter (12.6V Ready)** |
| **Navigasi Joystick Analog (ADS1115)** | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ✅ **I2C 16-Bit Dual-Axis VRx/VRy Driver** |
| **Dual Sensor Suhu DS18B20 (1-Wire)** | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ✅ **Suhu Bodi Koil & Heatsink Driver IGBT** |
| **Matriks Kalibrasi Skor Custom** | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ✅ **Grade A/B/C/D/E Custom Calibration** |
| **Pre-Flight Check Coil Drawer** | ❌ Belum Ada | ❌ Belum Ada | Standar | ✅ **Collapsible + Custom 1x/2x/3x/5x/10x Pulses** |
| **Slider Anti-Jitter Touch Deadband** | ❌ Belum Ada | ❌ Belum Ada | Standar | ✅ **Deadband ≥4px (Digit Terkunci Mantap)** |
| **Safety Lock & Emergency Stop** | Standar | Standar | ✅ Sticky Bottom | ✅ **Sticky Bottom + Double-Tap + 1-Tap STOP** |
| **Safety Lock & Emergency Stop** | Standar | Standar | Standar | Standar | ✅ **Sticky Bottom + Double-Tap Unlock + Instant STOP** |
| **Fine Tuning Slider Speed & Dwell** | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ❌ Belum Ada | ✅ **Slider Halus Step 10 RPM & 0.05ms + Tombol Nudge** |
| **Batas Minimum Dwell Time** | 0.5 ms | 0.5 ms | 0.5 ms | 0.5 ms | ✅ **Bisa 0.0 ms (OLED & Web UI)** |
| **Posisi Advanced Settings** | Bawah Panduan | Bawah Panduan | Bawah Panduan | Bawah Panduan | ✅ **Tepat di Bawah Dial Speed & Dwell** |
| **Dual Gauge Kualitas Api & Irama** | ❌ Belum Ada | ✅ Dual Gauge | ✅ 4 Pilar | ✅ Dual Gauge | ✅ **Dual Gauge Penuh (mA & %)** |
| **Monitor Arus Primer Peak ACS712** | ❌ Belum Presisi | ✅ Peak + Check | ✅ Pilar Arus | ✅ Peak + Check | ✅ **Peak + [🔍 CHECK COIL]** |
| **Detektor Kebocoran Bodi (Pin 36)** | ❌ Belum Ada | ✅ Kartu Khusus | ✅ Status Mini | ✅ Terintegrasi | ✅ **Terintegrasi di Panel Atas** |
| **Preset Kepekaan Leak (5 Tingkat)** | ❌ Belum Ada | ✅ 5 Preset | ❌ Belum Ada | ✅ Collapsible | ✅ **Collapsible di Atas Grafik** |
| **Live Performance Trend SVG Graph** | ❌ Belum Ada | ✅ Terbuka | ❌ Tertutup | ✅ Collapsible | ✅ **Collapsible di Bawah Filter Leak** |

---

## 🔍 RINCIAN FITUR VERSI TERBARU: `v2.6.0_SAFE_LOCK`

1. **Sticky Bottom Safety Trigger & Emergency STOP Bar**:
   - **Terkunci di Bawah Layar (`position: sticky; bottom: 0;`)**: Tidak ikut bergeser saat scrolling. Teknisi selalu memiliki akses instan ke tombol STOP darurat dalam situasi bahaya pengapian.
   - **Safety Armed Guard (Double-Tap / Tombol Buka Kunci)**:
     - Saat standby, tombol terkunci (`🛡️ TRIGGER TERKUNCI`). Tidak akan menyala jika layar tersenggol tidak sengaja saat teknisi sedang memegang koil/busi.
     - Membuka kunci dilakukan dengan mengetuk 2x atau menekan tombol `[🔓 BUKA KUNCI]`.
     - Saat running, tombol berubah menjadi **`🚨 EMERGENCY STOP (OFF)`** berwarna merah menyala yang langsung mematikan pengapian dalam 1x sentuhan.
2. **Advanced Speed & Dwell Fine Tuning Panel (Tepat di Bawah Dial)**:
   - **Fine RPM Tuning Slider**: Slider slider halus dengan step 10 RPM serta tombol nudge `[-100] [-10] [+10] [+100] RPM` untuk memuluskan penyetelan RPM tepat di titik brebet koil.
   - **Fine Dwell Tuning Slider (Batas 0.0 ms s/d 5.0 ms)**: Slider Dwell beresolusi tinggi (step 0.05 ms) serta tombol nudge `[-0.5] [-0.1] [+0.1] [+0.5] ms`.
   - **Dwell Minimal 0.0 ms**: Mendukung penyetelan dwell hingga 0.0 ms (identik dengan putaran rotary encoder fisik pada layar OLED).
   - **Sweep Time & RPM Step Size**: Dial ringkas untuk durasi sweep (1-60s) dan lompatan step (10-1000 RPM).
3. **Cockpit Telemetri Atas Utuh**:
   - Skor Kelayakan Total (%), Dual Gauge Kualitas Api (mA) & Irama Detak (%), Arus Primer Peak ACS712 + `[🔍 CHECK COIL]`, Detak IGT/Respon/Missed, dan Status Leak Insulasi Pin 36.
   - Tab Filter Kepekaan Leak Probe Pin 36 (`1:ULTRA` s/d `5:CUSTOM`) tersimpan di atas grafik performa SVG.

---

## 🚀 CARA FLASH FIRMWARE DARI BACKUP

### Menggunakan PlatformIO:
```powershell
# Berpindah ke Versi Terbaru v2.6.0 Safe Lock (Sedang Aktif)
git checkout v2.6.0-safe-lock
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi v2.5.0 Custom Compact
git checkout v2.5.0-custom
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi Full Dashboard v2.3.0
git checkout v2.3.0-full
pio run -t upload -t uploadfs --upload-port COM7

# Atau Berpindah ke Versi Original Asli v1.0.0
git checkout v1.0.0-original
pio run -t upload -t uploadfs --upload-port COM7
```
