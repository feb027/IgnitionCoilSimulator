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

**Skema Teks (TLP250 + IGBT 60N60):**
```text
 +---------------+                     +---------------+                  +------------------+
 |               |                     |               |                  |                  |
 |  ESP32 Board  |      R 330 Ohm      |    TLP250     |                  |    IGBT 60N60    |
 |               |                     | Optocoupler   |    R 47 Ohm      |                  |
 |       PIN 33  |-------[===]-------->| (Pin 2) Anode |                  |                  |
 |               |                     |               |                  |                  |
 |          GND  |-------------------->| (Pin 3) Cath  |                  |                  |
 |               |                     |               |                  |                  |
 +---------------+                     |  (Pin 8) VCC  |---(+ 12V AKI)    |                  |
                                       |               |                  |                  |
                                       |   (Pin 6) VO  |-----[===]------->| (Pin 1) Gate     |
                                       |               |                  |                  |
   (+ 12V AKI )------------------------|  (Pin 5) GND  |----------------->| (Pin 3) Emitter  |
                                       |               |                  |                  |
                                       +---------------+                  | (Pin 2) Collector|
                                                                          |        |         |
                                                                          +--------|---------+
                                                                                   |
                                                                                   V
                                                                        ( - ) Koil Pengapian
                                                                        ( + ) Koil -> + 12V AKI
```
*(Catatan Khusus 60N60: IGBT ini sebenarnya BISA dipakai, namun karena ia biasanya didesain untuk Inverter (bukan spesifik otomotif), ia mungkin **TIDAK MEMILIKI** proteksi Zener Clamp Internal. Sangat disarankan untuk memasang Dioda Flyback besar secara terbalik sejajar dengan koil, agar lonjakan voltase tinggi tidak merusak IGBT).*

*Dengan skema optocoupler ini, jika koil meledak atau IGBT korslet, yang rusak maksimal hanya TLP250. ESP32 mu akan 100% selamat!*

👉 **PENTING:** Jika Anda menggunakan koil aktif (Smart Coil), skema wiring-nya berbeda (tidak perlu IGBT besar):
- Untuk **Honda (3-Pin)**, baca: [WIRING_TLP250_CRV.md](docs/WIRING_TLP250_CRV.md)
- Untuk **Toyota (4-Pin)**, baca: [WIRING_TLP250_TOYOTA.md](docs/WIRING_TLP250_TOYOTA.md)

**2. Alternatif Jika Tidak Ada IGBT**
Jika kamu kesulitan mencari IGBT, kamu **BISA** menggunakan Power MOSFET biasa (seperti N-Channel `IRF540N` atau `IRFZ44N`). 
- **⚠️ TAPI ADA SYARAT MUTLAK:** Kamu **WAJIB** memasang **Dioda Flyback** berukuran besar (misal: seri `1N5408` atau lebih besar) yang dipasang melintang terbalik di antara Positif dan Negatif Koil.
- Tanpa dioda ini, tegangan balik 400 Volt dari koil akan **menghancurkan** MOSFET seketika dalam satu kali jepretan, karena MOSFET biasa tidak memiliki perlindungan *Internal Zener Clamp* seperti IGBT otomotif.

### Wiring Pengetesan PWM / Selenoid / Injektor
Mode `PWM / STEPPER` pada alat ini dirancang untuk mengetes komponen 12V otomotif seperti Katup VVT, Solenoid Purge EVAP, atau Injektor. 
Karena arus komponen ini cukup besar, Anda memerlukan penguat sinyal (MOSFET N-Channel) tipe Logic-Level seperti **IRLZ44N**.

**Wiring Sederhana MOSFET (Low-Side Switch):**
1. **Gate (Kiri):** Hubungkan ke **Pin 32 (PIN_SOLENOID)** ESP32 melalui resistor 100 Ohm.
2. **Drain (Tengah):** Hubungkan ke kabel Negatif (-) Injektor/Selenoid.
3. **Source (Kanan):** Hubungkan ke Ground (GND) ESP32 dan Negatif Aki 12V.
4. Kabel Positif (+) Injektor/Selenoid dihubungkan langsung ke Positif (+) Aki 12V.
*Catatan: Pastikan memasang Dioda Flyback melintang terbalik pada Injektor/Selenoid untuk mengamankan MOSFET.*

### Wiring Pengetesan Speedometer (Full Cluster 4-Jarum)
Alat ini dapat menyimulasikan 4 jarum speedometer secara bersamaan.
1. **Jarum Suhu (Temp) & Jarum Bensin (Fuel):** Keduanya membutuhkan Modul Digital Potentiometer X9C103S untuk menyimulasikan hambatan (Ohm). Baca panduan lengkapnya di [WIRING_X9C103S.md](docs/WIRING_X9C103S.md).
2. **Jarum KM/H & RPM:** Menggunakan frekuensi pulsa (kotak 50% duty cycle). 
   - **Koneksi Langsung:** Beberapa speedometer modern bisa membaca sinyal 3.3V langsung dari ESP32 (**Pin 2 untuk KM/H**, **Pin 4 untuk RPM**).
   - **Koneksi Open-Collector (12V):** Speedometer lawas biasanya membutuhkan pulsa 12V. Gunakan Transistor NPN kecil (seperti 2N3904 atau BC547) untuk merubah sinyal ESP32:
     - **Base (B):** Ke Pin 2 / Pin 4 ESP32 (via Resistor 1k Ohm)
     - **Emitter (E):** Ke Ground (GND)
     - **Collector (C):** Sambungkan ke input KMH/RPM Speedometer. Tambahkan juga *Resistor Pull-Up 1K Ohm* dari Collector ke +12V.

---

## Panduan Pin & Wiring Keseluruhan (Wemos D1 R32)

| Fungsi Utama | Pin ESP32 | Keterangan |
| :--- | :--- | :--- |
| **Ignition Coil Out** | `Pin 33` | Mengendalikan Koil (Gunakan Modul TLP250 / IGBT) |
| **Solenoid / PWM Out** | `Pin 32` | Mengendalikan Injektor / VVT (Gunakan MOSFET) |
| **Speedometer RPM** | `Pin 4` | Output Frekuensi Tachometer (Bisa via NPN 12V) |
| **Speedometer KM/H** | `Pin 2` | Output Frekuensi Odometer/KMH (Bisa via NPN 12V) |
| **X9C103S (INC)** | `Pin 14` | Pin Step (Digabung untuk modul Suhu & Bensin) |
| **X9C103S (U/D)** | `Pin 12` | Pin Arah (Digabung untuk modul Suhu & Bensin) |
| **X9C103S (CS_TEMP)** | `Pin 13` | Chip Select KHUSUS Modul Suhu (Temp) |
| **X9C103S (CS_FUEL)** | `Pin 15` | Chip Select KHUSUS Modul Bensin (Fuel) |
| **Tombol Encoder (SW)** | `Pin 25` | Tekan (Menu) / Tahan (Run/Stop) |
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
