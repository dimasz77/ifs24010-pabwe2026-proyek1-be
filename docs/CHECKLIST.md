# Checklist Persyaratan dan Artefak

Status: **Berhasil** = sudah dijalankan/diverifikasi pada lingkungan pembuatan (bukti di `docs/hasil-pengujian/`); **Belum diverifikasi** = berkas ada tetapi belum dijalankan; **Belum selesai** = tindakan Anda diperlukan.

| Persyaratan | Implementasi / artefak | Cara verifikasi | Status |
|---|---|---|---|
| Proyek individu, topik bebas | Jenika Rental (rental motor Samosir) | - | Berhasil |
| Topik berbeda dari teman | Topik ditentukan pengguna | Cek spreadsheet topik pada tautan di panduan (tidak dapat diakses oleh AI) | **Belum diverifikasi** |
| Backend Express.js | `backend/` Express 5 | `npm test`, `node scripts/smoke.mjs` | Berhasil |
| Database SQLite | `better-sqlite3`, `backend/src/db/schema.sql` | Test persistensi + E2E restart server | Berhasil |
| API dengan data sendiri | 5 sumber daya REST + ringkasan | 59 test backend, smoke test | Berhasil |
| Frontend framework yang diizinkan | React 19 + Vite (Modul praktikum 4) | `npm run build` | Berhasil |
| Fitur utama (CRUD, filter, validasi, status UI) | Lihat README bagian 1 | E2E 13 langkah | Berhasil |
| Validasi dan penanganan error | `validators/`, `errorHandler.js`, `lib/validators.js` | Test 422/409/404/500, test frontend | Berhasil |
| Integrasi frontend-backend | Proxy Vite / satu layanan produksi | E2E Playwright | Berhasil |
| Test dan build | Jest 59, Vitest 26, E2E 13, smoke 9, build Vite | Perintah di README bagian 9 | Berhasil |
| README | `README.md` | Ikuti langkahnya dari folder kosong | Berhasil (disusun; ikuti sekali dari clone baru) |
| Dokumen proyek sesuai template | `Dokumen_Proyek_1_PABWE_11S24010.docx` (+ PDF) | Buka di Word, periksa penanda kuning | **Belum selesai** (bukti asli diisi penulis) |
| Flowchart | Gambar 2.2 dan 2.3 pada dokumen | Cocokkan dengan kode | Berhasil |
| Dokumentasi penggunaan AI | Bab III | Isi Prompt 2/3 dan tangkapan layar asli | **Belum selesai** |
| Evaluasi kritis kode AI (3 masalah) | Bab IV, bukti dari test/eksperimen | Gambar 4.1-4.3 | Berhasil |
| Perbaikan dan bukti pengujian | Bab V, Gambar 5.1-5.3 | Test regresi 3/3 lulus | Berhasil |
| Repository GitHub | - | Buat repo, push, isi Lampiran A | **Belum selesai** |
| Pipeline Jenkins | `Jenkinsfile`, `docs/JENKINS.md` | Jalankan di Jenkins Anda, tangkap layar | **Belum diverifikasi** |
| Docker image | `Dockerfile`, `docker-compose.yml` | `docker compose up --build` | **Belum diverifikasi** (Docker tidak tersedia saat pembuatan) |
| Deployment + URL online | `docs/DEPLOYMENT.md`, `fly.toml` | Deploy lalu `node scripts/smoke.mjs <URL>` | **Belum selesai** |
| Video YouTube | `docs/VIDEO_SCRIPT.md` | Rekam, unggah, isi Lampiran B | **Belum selesai** |
| Semua artefak sebelum 24 Oktober 2026 | - | Lihat daftar di atas | **Belum selesai** |

## Urutan kerja yang disarankan (deadline 24 Oktober 2026)
1. Buat repository GitHub, `git init`, commit, push (jangan commit `backend/.env`).
2. Cek keunikan topik pada spreadsheet kelas dan daftarkan topik Anda.
3. Deploy (docs/DEPLOYMENT.md), catat URL, jalankan smoke test.
4. Siapkan Jenkins, jalankan pipeline, tangkap layar Stage View + Console Output (docs/JENKINS.md).
5. Rekam video (docs/VIDEO_SCRIPT.md), unggah, ambil tautan.
6. Lengkapi dokumen: tangkapan layar percakapan asli, prompt 2/3 dan bantuan AI tambahan yang benar-benar Anda kirim, Lampiran A dan B. Hapus semua penanda kuning.
7. Perbarui daftar isi di Word (klik kanan pada daftar isi, Update Field) lalu ekspor PDF.
