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

### Komponen Wajib untuk Rangkaian *Driver*:
Untuk menyalakan koil dengan aman (terutama koil bodoh/2-kabel non-injeksi), kamu **wajib** menggunakan Transistor IGBT (*Insulated-Gate Bipolar Transistor*) yang memang dirancang khusus untuk menahan tegangan kejut koil otomotif (biasanya tahan hingga 400 Volt).

**Rekomendasi IGBT Otomotif (Paling Aman):**
- `IRGB14C40L` (Sangat disarankan karena memiliki fitur *Logic Level Gate*, langsung bisa dipicu oleh ESP32)
- `ISL9V5036P3`
- `FGD3136AS`

**Cara Menyambung Rangkaian (Konsep Dasar):**
1. **Pin 33 (ESP32)** -> Resistor 100 Ohm -> **Gate (Pin 1 IGBT)**
2. **GND (ESP32)** -> **Emitter (Pin 3 IGBT)** sekaligus digabungkan ke **Negatif (-) Aki/Baterai 12V**
3. **Collector (Pin 2 IGBT)** -> **Negatif (-) Ignition Coil**
4. **Positif (+) Aki/Baterai 12V** -> **Positif (+) Ignition Coil**

*(Opsional tapi sangat disarankan: Tambahkan resistor "pull-down" 10k Ohm yang menjembatani antara **Gate IGBT** dan **GND**. Ini mencegah koil memercik sendiri secara liar saat ESP32 baru dinyalakan/booting).*

---

## Panduan Pin & Wiring ke ESP32 (Wemos D1 R32)

| Komponen | Pin ESP32 | Keterangan |
| :--- | :--- | :--- |
| **Sinyal Ignition Coil** | `Pin 33` | **WAJIB** melewati sirkuit IGBT/Transistor di atas! |
| **Tombol Encoder (SW)** | `Pin 25` | Tekan untuk masuk menu / Tahan untuk RUN/STOP |
| **Data Encoder (DT)** | `Pin 26` | Putaran Kanan/Kiri (Rotary) |
| **Clock Encoder (CLK)** | `Pin 27` | Sinkronisasi Putaran (Rotary) |
| **Data Layar (OLED SDA)** | `Pin 21` | Kabel komunikasi I2C (SDA) |
| **Clock Layar (OLED SCL)**| `Pin 22` | Kabel jam I2C (SCL) |

---

## Cara Penggunaan

1. **Layar Utama (Dashboard):** Layar awal ini akan menampilkan status menyala/berhenti, mode, Frekuensi (raksasa), Dwell, dan Duty Cycle (%).
2. **Menyalakan Sinyal (Start/Stop):** Saat berada di Dashboard, **Tekan dan Tahan** tombol encoder selama 1 detik. Layar akan menampilkan tulisan `[FIRING] |` di pojok kiri atas. Tahan lagi 1 detik untuk `[STOP]`.
3. **Masuk ke Menu Pengaturan:** Saat di Dashboard, **Tekan Sekali (Klik Cepat)** tombol encoder. Layar akan menampilkan menu raksasa satu per satu. (Catatan: Masuk ke menu akan otomatis menghentikan koil demi keamanan).
4. **Navigasi Menu:** Putar encoder ke kanan atau kiri untuk berganti halaman (`SET FREQ` -> `SET DWELL` -> `SET MODE` -> `EXIT`). Putaran ini bisa terus melingkar (tanpa batas).
5. **Mengubah Nilai:** Klik sekali pada pengaturan yang ingin diubah (contoh: DWELL). Tanda bintang `*` akan berkedip. Putar encoder untuk menaik-turunkan angka. Klik sekali lagi untuk menyimpan.
6. **Keluar & Simpan:** Putar ke halaman `EXIT MENU` lalu klik. Pengaturan barumu tidak akan ditulis ke *Flash Memory* secara buta, melainkan hanya disimpan secara cerdas jika memang ada nilai yang kamu ganti (membuat memori awet!).

## Cara Mengisi Program (Upload)
Proyek ini dibangun secara modular menggunakan lingkungan pengembangan **PlatformIO**.
1. Buka folder proyek ini di VS Code yang sudah terpasang ekstensi PlatformIO.
2. Colokkan kabel USB ke Wemos D1 R32.
3. Klik tombol **Upload** berlambang panah di bawah layar (atau jalankan `pio run --target upload` di terminal).
