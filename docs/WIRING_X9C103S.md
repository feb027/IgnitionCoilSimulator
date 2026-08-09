# Skema Wiring: X9C103S Digital Potentiometer (Untuk Suhu & Bensin)

Untuk mengetes jarum Suhu dan Bensin pada Speedometer yang membaca resistansi (Ohm), kita menggunakan modul **X9C103S** (Digital Potentiometer 10K).

> [!IMPORTANT]
> Karena kita mengetes dua jarum (Suhu dan Bensin) secara bersamaan dan independen, Anda membutuhkan **2 buah modul X9C103S**. Keduanya bisa menggunakan pin INC dan U/D yang sama dari ESP32, tetapi **wajib** dipisahkan pada pin CS (Chip Select).

## Konfigurasi Pin ESP32 (Wemos D1 R32)
Sesuai pengaturan di `include/config/Pins.h`, sambungkan kabel sebagai berikut:

| Pin ESP32 | Pin X9C103S (Modul 1: Suhu) | Pin X9C103S (Modul 2: Bensin) | Keterangan |
| :--- | :--- | :--- | :--- |
| **GND** | GND | GND | Ground Bersama |
| **5V** / **3.3V** | VCC | VCC | Daya modul (Bisa 5V dari ESP32) |
| **Pin 14** | U/D | U/D | Pin Arah (Naik/Turun). Digabung (Paralel) |
| **Pin 27** | INC | INC | Pin Clock (Langkah). Digabung (Paralel) |
| **Pin 12** | CS | - | Chip Select untuk Modul SUHU saja |
| **Pin 13** | - | CS | Chip Select untuk Modul BENSIN saja |

## Konfigurasi Output Modul ke Speedometer
X9C103S memiliki 3 pin keluaran analog yang berperilaku seperti potensiometer biasa:
- **VH** (High Terminal)
- **VW** (Wiper - Terminal Tengah)
- **VL** (Low Terminal)

1. Sambungkan **VL** ke Ground (Massa mobil / Ground ESP32).
2. Sambungkan kabel sensor dari jarum Speedometer ke **VW** (Wiper).
3. Biarkan **VH** tidak terhubung (menggantung).

> [!TIP]
> X9C103S adalah potensiometer 10K Ohm (0 hingga 10.000 Ohm). Sebagian besar sensor suhu dan pelampung bensin mobil beroperasi dalam rentang 10 - 200 Ohm (Full - Empty).
> Karena X9C103S memiliki 100 *step*, setiap kenaikan 1% di layar menu akan menaikkan tahanan sebesar 100 Ohm. Jika jarum suhu mobil Anda membutuhkan 50 Ohm untuk posisi Normal, Anda hanya perlu mengatur `SET TEMP` di ESP32 pada kisaran **0% - 2%**.
> **Pastikan Anda melihat lembar spesifikasi (Manual Book) mobil Anda untuk mengetahui rentang Ohm yang dibutuhkan oleh jarum.**
