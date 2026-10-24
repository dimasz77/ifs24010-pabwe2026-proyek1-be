# Naskah Video YouTube: Menjalankan Jenika Rental di Komputer Lokal

Syarat panduan: video harus dimulai dari **git clone** repository GitHub sampai aplikasi berjalan lokal. Durasi target 6-8 menit. Rekam layar + terminal; unggah ke YouTube (boleh *Unlisted*), lalu tempel tautan di Lampiran B dokumen.

Siapkan sebelum merekam: Node.js 22 dan Git terpasang (`node -v`, `git --version`), folder kerja kosong, repository sudah di-push ke GitHub, tidak ada proses lain di port 4000/5173.

| Menit | Rekam | Perintah / aksi | Ucapan singkat |
|---|---|---|---|
| 0:00 | Slide/judul | - | "Halo, saya Dimas Rexan Samuel Sidabutar, NIM 11S24010. Ini demo menjalankan aplikasi Jenika Rental, rental motor Samosir, dari clone repository sampai berjalan lokal." |
| 0:30 | Browser: halaman repo GitHub | Tunjukkan URL repo, tombol Code | "Kode ada di GitHub. Saya mulai dari clone." |
| 1:00 | Terminal | `git clone <URL-REPOSITORY>` lalu `cd rental-motor-samosir` lalu `ls` | "Setelah clone, struktur proyek: backend Express, frontend React, dan folder docs." |
| 1:45 | Terminal | `node -v` lalu `npm run install:all` | "Saya pasang dependency backend dan frontend. Pastikan Node versi 20 ke atas." |
| 3:00 | Terminal | `cp backend/.env.example backend/.env` (Windows: `copy backend\.env.example backend\.env`) | "Konfigurasi environment disalin dari contoh. Database SQLite dibuat otomatis." |
| 3:20 | Terminal | `npm --prefix backend run db:seed` | "Skema tabel dan data contoh diisi. Dijalankan ulang pun tidak menggandakan data." |
| 3:40 | Terminal 1 | `npm run dev:backend` | "Backend jalan di port 4000." |
| 3:55 | Terminal 2 | `npm run dev:frontend` | "Frontend jalan di port 5173 dan meneruskan /api ke backend." |
| 4:10 | Browser | Buka `http://localhost:4000/api/health` lalu `http://localhost:5173` | "Health check OK, dan ini halaman Beranda." |
| 4:30 | Browser | Armada Motor: cari, filter, tambah motor (isi form salah dulu untuk tunjukkan validasi), simpan | "CRUD tersimpan di SQLite dan ada validasi." |
| 5:30 | Browser | Penyewaan: Buat sewa baru, pilih tanggal 7 hari, tunjukkan diskon, simpan; lalu Mulai dan Kembalikan | "Biaya dihitung otomatis, bentrok jadwal ditolak, denda dihitung bila terlambat." |
| 6:30 | Terminal | Hentikan server (Ctrl+C), jalankan lagi `npm run dev:backend`, refresh browser | "Data tetap ada setelah restart karena disimpan di SQLite." |
| 7:00 | Terminal | `npm test` | "Pengujian otomatis: backend dan frontend lulus." |
| 7:30 | Penutup | - | "Terima kasih. Tautan repository ada di deskripsi video." |

## Perintah lengkap (salin-tempel)
```bash
git clone <URL-REPOSITORY>
cd rental-motor-samosir
npm run install:all
cp backend/.env.example backend/.env
npm --prefix backend run db:seed
npm run dev:backend        # terminal 1
npm run dev:frontend       # terminal 2  -> http://localhost:5173
npm test
```
Mode produksi lokal (opsional): `npm run build` lalu `SERVE_FRONTEND=true npm --prefix backend start` -> http://localhost:4000

Tips: perbesar font terminal, jangan tampilkan token/akun pribadi, dan pastikan seluruh langkah berhasil dari folder kosong sebelum merekam.
