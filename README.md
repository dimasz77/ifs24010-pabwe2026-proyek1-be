# Jenika Rental - Backend (REST API)

Backend aplikasi **rental sepeda motor di kawasan Samosir**: armada motor, pelanggan, pemesanan, pengembalian, denda keterlambatan, dan ringkasan harian. Repository ini hanya berisi **API**; antarmuka ada di repository terpisah: `ifs24010-pabwe2026-proyek1-frontend`.

Proyek 1 PABWE, Institut Teknologi Del, TA 2026/2027. Penulis: Dimas Rexan Samuel Sidabutar (11S24010).

## Teknologi
Node.js >= 20, Express 5, SQLite (`better-sqlite3`, query berparameter), JWT (kata sandi di-hash scrypt), Jest + Supertest.

## Struktur
```
src/{routes,controllers,services,models,validators,middleware,utils,db}
tests/{unit,integration}   scripts/{init-db.js,smoke.mjs}   data/ (file SQLite)
```

## Menjalankan
```bash
npm ci
cp .env.example .env          # Windows: copy .env.example .env
npm run dev                   # http://localhost:4000  (atau: npm start)
```

## Konfigurasi (`.env`)
| Variabel | Default | Keterangan |
|---|---|---|
| `NODE_ENV` | development | Set `production` saat deploy HTTPS agar cookie sesi memakai `Secure; SameSite=None` |
| `PORT` | 4000 | Port API |
| `DB_PATH` | ./data/rental.db | Lokasi file SQLite |
| `CORS_ORIGINS` | http://localhost:5173 | Origin frontend yang diizinkan (pisahkan koma). **Isi dengan URL frontend yang di-deploy** |
| `JWT_SECRET` | (dev) | Kunci token. **Wajib** diisi di produksi (min. 32 karakter acak) |
| `TOKEN_TTL_HOURS` | 168 | Masa berlaku token |
| `ALLOW_REGISTRATION` | true | `false` = tutup pendaftaran akun baru |
| `AUTO_SEED` | false | `true` = isi data contoh bila tabel kosong |
| `LATE_FEE_MULTIPLIER` | 1.5 | Pengali denda keterlambatan |

## Database
Tabel dibuat otomatis saat server start. Manual:
```bash
npm run db:init     # buat tabel
npm run db:seed     # tabel + data contoh (aman diulang)
npm run db:clean    # hapus file DB, buat ulang KOSONG
npm run db:reset    # hapus file DB, buat ulang, isi data contoh
```

## Pengujian
```bash
npm test                  # Jest: unit + integrasi
npm run test:coverage     # dengan cakupan kode (coverage/lcov.info untuk SonarQube)
npm start &               # lalu smoke test pada server yang berjalan:
node scripts/smoke.mjs http://localhost:4000
```

## Docker
```bash
docker compose up -d --build        # http://localhost:4000, data di volume rental_data
curl http://localhost:4000/api/health
```
Set `CORS_ORIGINS` ke URL frontend, mis. `CORS_ORIGINS=https://frontend-anda docker compose up -d --build`. Karena memakai SQLite, hosting harus menyediakan **volume persisten** (mount di `/data`), dan jalankan satu instance saja.

## API
Respons: `{ "success": true, "data": ..., "meta": ... }` atau `{ "success": false, "error": { "code", "message", "details?" } }`.

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/health` | Status API dan database (503 bila DB bermasalah); publik |
| POST | `/api/auth/register` | Daftar -> 201 `{user}` dan cookie sesi HttpOnly (403 bila registrasi ditutup) |
| POST | `/api/auth/login` | `{user}` dan cookie sesi HttpOnly (401 bila salah) |
| POST | `/api/auth/logout` | Hapus cookie sesi |
| GET | `/api/auth/me` | Profil dari cookie sesi |

Endpoint berikut memerlukan cookie sesi yang valid (401 bila tidak ada/tidak valid). Request mutasi dengan cookie juga harus berasal dari origin di `CORS_ORIGINS`. Autentikasi melalui bearer token tidak didukung.

| Metode | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/dashboard/summary` | Ringkasan beranda |
| GET | `/api/locations` | Lokasi jemput |
| GET/POST | `/api/motorcycles` | Daftar (`q,type,status,location_id,sort,available_from,available_to,page,limit`) / tambah |
| GET/PUT/DELETE | `/api/motorcycles/:id` | Detail / ubah / hapus (409 bila punya riwayat sewa) |
| GET/POST | `/api/customers` | Daftar (`q,page,limit`) / tambah |
| GET/PUT/DELETE | `/api/customers/:id` | Detail + riwayat / ubah / hapus |
| GET/POST | `/api/rentals` | Daftar (`status,q,overdue,motorcycle_id,customer_id,page,limit`) / buat |
| GET | `/api/rentals/quote` | Hitung biaya (`motorcycle_id,start_date,end_date`) |
| GET/PUT/DELETE | `/api/rentals/:id` | Detail / ubah (hanya status dipesan) / hapus |
| PATCH | `/api/rentals/:id/status` | `{"action":"start"\|"return"\|"cancel","returned_date?"}` |

Kode status: 200, 201, 400, 401, 403, 404, 409 (duplikat/bentrok/status tidak valid), 422 (validasi), 500, 503.

## Troubleshooting
| Gejala | Solusi |
|---|---|
| `better-sqlite3` gagal terpasang / `node-gyp` | Proyek memakai binary prebuilt (`.npmrc` berisi `ignore-scripts=true`). Pakai Node 20/22 LTS |
| `EADDRINUSE` port 4000 | Ubah `PORT` di `.env` |
| Error CORS di browser | Tambahkan origin frontend ke `CORS_ORIGINS` |
| Data hilang setelah redeploy | Pasang volume dan arahkan `DB_PATH` ke sana |

Catatan: semua akun terdaftar melihat data yang sama (belum ada peran/multi-usaha) dan belum ada pembatasan percobaan login. Cookie sesi memakai `HttpOnly`; pada produksi gunakan HTTPS (`Secure`, `SameSite=None`) dan set `CORS_ORIGINS` tepat ke origin frontend. Untuk penggunaan nyata: `JWT_SECRET` kuat dan `ALLOW_REGISTRATION=false` setelah akun pemilik dibuat. Seluruh data contoh fiktif.
