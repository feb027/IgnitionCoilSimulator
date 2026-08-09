# ESP32 Ignition Coil Tester & Simulator

Sebuah alat *tester* dan *simulator* koil pengapian (Ignition Coil) yang sangat presisi, modular, dan aman, dibangun menggunakan *platform* ESP32 (Wemos D1 R32). Alat ini dirancang untuk menyimulasikan sinyal RPM mesin agar kamu bisa mengetes kondisi koil dengan aman sebelum dipasang ke kendaraan.

## Fitur Unggulan
- **Antarmuka (UI) Raksasa & Minimalis**: Didesain agar sangat mudah dibaca. Font berukuran raksasa memastikan nilai Frekuensi dan Dwell dapat dipantau dari kejauhan tanpa perlu kacamata baca. Layar dibagi menjadi 3 zona yang rapi.
- **Presisi Tingkat Mikrodetik**: Menggunakan *Hardware Timer* (Interupsi) ESP32 untuk menghasilkan lebar pulsa (Dwell) dan frekuensi yang sangat akurat tanpa membebani program utama.
- **Sistem Keamanan Otomatis**: Batas keamanan *hard-coded* mencegah koil meleleh atau meledak. (Contoh: Dwell maksimal dibatasi pada `5.0ms`, dan *Duty Cycle* tidak akan bisa melebihi `80%` pada putaran RPM tinggi).
- **Berbagai Mode Pengetesan**:
  - **CONTINUOUS**: Memercikkan api terus-menerus sesuai frekuensi (Menyimulasikan mesin yang sedang menyala normal).
  - **BURST**: Hanya memercikkan tepat **5 pulsa** lalu otomatis berhenti (STOP). Sangat ideal dan aman untuk sekadar mengecek percikan api awal.
  - **SINGLE**: Hanya memercikkan tepat **1 pulsa** lalu berhenti. Sempurna jika kamu ingin mengukur tegangan/waktu menggunakan Osiloskop.
- **UI Bebas Error**: Menggunakan *Rotary Encoder* dengan *state machine anti-bouncing* (tanpa blokir). Menu ditampilkan satu per satu di layar penuh agar ayahmu tidak mungkin salah pilih.

---

## ⚠️ PERINGATAN KERAS: Keamanan & Wiring (Kabel) ⚠️

**JANGAN PERNAH MENYAMBUNGKAN PIN ESP32 LANGSUNG KE IGNITION COIL!**
Ignition Coil menghasilkan tegangan hingga puluhan ribu volt. Saat medan magnet di dalam koil runtuh, ia akan mengirimkan lonjakan tegangan balik (*Back-EMF*) yang sangat masif melalui kabel pemicunya (*trigger*). Jika kabel ini terhubung langsung ke ESP32, mikrokontrolermu akan **meledak atau rusak total secara instan**.

### Topologi Rangkaian (Low-Side Switch)
Untuk menyalakan koil 2-pin konvensional, gunakan **IGBT** yang sanggup menahan lonjakan induktif otomotif ratusan volt.

**Rekomendasi IGBT Otomotif (Paling Aman):**

| Tipe IGBT | Fitur | Keterangan |
| :--- | :--- | :--- |
| `IRGB14C40L` | Logic Level Gate | **Sangat disarankan!** Bisa langsung dipicu sinyal 3.3V dari ESP32. |
| `ISL9V5036P3` | Logic Level Gate | Standar tangguh yang sering dipakai di ECU otomotif. |
| `FGD3136AS`  | Logic Level Gate | Bagus untuk sistem pengapian. |

IGBT umumnya memiliki 3 kaki (dilihat dari depan, kiri ke kanan): **1. Gate, 2. Collector, 3. Emitter**.
Berikut adalah panduan *wiring* yang ringkas dan aman:

1. **Gate (Pin 1 IGBT)** dihubungkan ke **Pin 33 ESP32** melalui sebuah **Resistor 100 Ohm** (sebagai pembatas arus gerbang).
2. **Emitter (Pin 3 IGBT)** dihubungkan menjadi satu ke **GND ESP32** *DAN* **GND (Negatif) Aki 12V**.
3. **Collector (Pin 2 IGBT)** dihubungkan ke pin **Negatif (-)** pada Ignition Coil.
4. Pin **Positif (+)** pada Ignition Coil dihubungkan langsung ke **Positif (+)** Aki 12V.

*(Praktik Terbaik: Tambahkan resistor "pull-down" 10k Ohm yang menjembatani antara **Gate** dan **GND** agar koil tidak memercik liar saat ESP32 sedang proses booting).*

### Level Up: Keamanan Ekstra & Alternatif (Opsional)

**1. Industrial Safe (100% Aman dari Konslet via Optocoupler)**
Lingkungan mesin sangat bising akan gangguan elektromagnetik (EMI). Untuk mencegah layar mati/nge-blank atau ESP32 me-reset sendiri karena radiasi koil, gunakan **Optocoupler**. 

* **PC817 vs TLP250:** 
  - **PC817** adalah optocoupler standar. Sangat murah, tapi lambat dan arusnya kecil. Bisa dipakai, tapi gerbang (Gate) IGBT berpotensi agak panas di putaran tinggi.
  - **TLP250** adalah **Optocoupler Khusus Gate Driver**. Ini adalah **PILIHAN TERBAIK**. TLP250 dirancang khusus untuk mendobrak gerbang IGBT/MOSFET dengan arus hingga 1.5A dan sangat cepat.

* **Wiring TLP250 ke ESP32 & IGBT:**
  - **Sisi ESP32 (Aman):**
    1. **Pin 33 ESP32** -> Resistor 330 Ohm -> **Pin 2 (Anode) TLP250**
    2. **GND ESP32** -> **Pin 3 (Cathode) TLP250**
  - **Sisi Tegangan Tinggi (Aki/Koil):**
    1. **Pin 8 (VCC) TLP250** -> Positif Aki 12V
    2. **Pin 5 (GND) TLP250** -> Negatif Aki 12V (dan sambungkan juga ke Emitter IGBT)
    3. **Pin 6 (VO) TLP250** -> Resistor 10-47 Ohm -> **Gate (Pin 1) IGBT**
  *Dengan skema ini, jika koil meledak atau korslet, yang rusak maksimal hanya TLP250. ESP32 mu akan 100% selamat!*

**2. Alternatif Jika Tidak Ada IGBT**
Jika kamu kesulitan mencari IGBT, kamu **BISA** menggunakan Power MOSFET biasa (seperti N-Channel `IRF540N` atau `IRFZ44N`). 
- **⚠️ TAPI ADA SYARAT MUTLAK:** Kamu **WAJIB** memasang **Dioda Flyback** berukuran besar (misal: seri `1N5408` atau lebih besar) yang dipasang melintang terbalik di antara Positif dan Negatif Koil.
- Tanpa dioda ini, tegangan balik 400 Volt dari koil akan **menghancurkan** MOSFET seketika dalam satu kali jepretan, karena MOSFET biasa tidak memiliki perlindungan *Internal Zener Clamp* seperti IGBT otomotif.

---

## Panduan Pin & Wiring ke ESP32 (Wemos D1 R32)

| Komponen | Pin ESP32 | Keterangan |
| :--- | :--- | :--- |
| **Sinyal Ignition Coil** | `Pin 33` | **WAJIB** melewati sirkuit IGBT/TLP250 di atas! |
| **Tombol Encoder (SW)** | `Pin 25` | Tekan untuk masuk menu / Tahan untuk RUN/STOP |
| **Data Encoder (DT)** | `Pin 26` | Putaran Kanan/Kiri (Rotary) |
| **Clock Encoder (CLK)** | `Pin 27` | Sinkronisasi Putaran (Rotary) |
| **Data Layar (OLED SDA)** | `Pin 21` | Kabel komunikasi I2C (SDA) |
| **Clock Layar (OLED SCL)**| `Pin 22` | Kabel jam I2C (SCL) |

---

## Cara Penggunaan

1. **Layar Utama (Dashboard):** Layar awal ini menampilkan status, mode, **RPM** (angka raksasa), dan nilai Dwell (ms) atau Duty Cycle (%).
2. **Menyalakan Sinyal (Start/Stop):** Saat di Dashboard, **Tekan dan Tahan** tombol encoder selama 1 detik. Layar akan menampilkan tulisan `[FIRING]`. Tahan lagi 1 detik untuk `[STOP]`.
3. **Masuk ke Menu:** **Tekan Sekali (Klik Cepat)** tombol encoder.
4. **Sistem Tipe Cerdas (Dual Personality):** 
   - Di menu `SET TYPE`, pilih **IGNITION COIL** jika ayahmu ingin mengetes koil. Sistem hanya akan memunculkan menu `SET DWELL (ms)`.
   - Pilih **PWM / STEPPER** jika ingin mengetes komponen lain (Injektor, kipas, dinamo). Sistem hanya akan memunculkan menu `SET DUTY (%)`.
5. **Navigasi Menu:** Putar encoder untuk berpindah halaman (`SET TYPE` -> `SET RPM` -> `SET DWELL/DUTY` -> `SET MODE` -> `EXIT`). 
6. **Mengubah Nilai:** Klik sekali pada pengaturan yang ingin diubah. Background tulisan akan terbalik (inverse). Putar encoder untuk menaik-turunkan angka. Klik sekali lagi untuk menyimpan.
7. **Keluar & Simpan:** Putar ke halaman `EXIT` lalu klik. Pengaturan akan tersimpan abadi ke memori NVS ESP32.

## Cara Mengisi Program (Upload)
Proyek ini dibangun secara modular menggunakan lingkungan pengembangan **PlatformIO**.
1. Buka folder proyek ini di VS Code yang sudah terpasang ekstensi PlatformIO.
2. Colokkan kabel USB ke Wemos D1 R32.
3. Klik tombol **Upload** berlambang panah di bawah layar (atau jalankan `pio run --target upload` di terminal).
