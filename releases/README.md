# 📦 PANDUAN & DAFTAR VERSI FIRMWARE (FIRMWARE RELEASES)

Folder ini berisi arsip file binary (`.bin`) siap flash dan penandaan versi di Git untuk proyek **ESP32 Ignition Coil Tester & Simulator**.

---

## 📁 Lokasi Penyimpanan File Firmware (.bin)

Anda dapat membuka file binary langsung di Windows Explorer pada folder:

1. **`releases/v2.3.0-full/`** *(Versi Tampilan Lengkap - AKTIF)*
   - `firmware.bin` (Program C++ ESP32)
   - `littlefs.bin` (Web UI Dashboard Penuh + Dual Gauges + Monitor Ampere + Leak Card)
   - `bootloader.bin` & `partitions.bin`

2. **`releases/v2.4.0-compact/`** *(Versi Cockpit 1-Layar Ringkas)*
   - `firmware.bin` (Program C++ ESP32)
   - `littlefs.bin` (Web UI Ringkas Cockpit 1 Layar tanpa Scroll)
   - `bootloader.bin` & `partitions.bin`

---

## 🏷️ Cara Melihat Versi Melalui Git

Buka Terminal / PowerShell di folder project:

```powershell
# 1. Melihat semua tag versi yang tersimpan
git tag -n

# 2. Melihat riwayat commit versi dengan detail grafik
git log --oneline --decorate -n 10
```

---

## 🔄 Cara Berpindah / Memilih Versi yang Mau Dipakai

### Opsi A: Berpindah via Kode Sumber & PlatformIO (Otomatis Compile & Flash)

1. **Jika ingin memakai versi Ringkas (`v2.4.0-compact`):**
   ```powershell
   git checkout v2.4.0-compact
   pio run -t upload -t uploadfs --upload-port COM7
   ```

2. **Jika ingin kembali ke versi Lengkap (`v2.3.0-full`):**
   ```powershell
   git checkout main
   pio run -t upload -t uploadfs --upload-port COM7
   ```
