/* Inisialisasi database SQLite.
 *   node scripts/init-db.js            -> buat tabel
 *   node scripts/init-db.js --seed     -> buat tabel + isi data contoh (aman dijalankan ulang)
 *   node scripts/init-db.js --reset --seed -> hapus file DB lalu buat ulang
 */
const fs = require('fs');
const config = require('../src/config');
const { openDatabase, initSchema } = require('../src/db/connection');
const { seedIfEmpty, seedLocations } = require('../src/db/seed');

const args = process.argv.slice(2);
if (args.includes('--reset')) {
  ['', '-wal', '-shm'].forEach((s) => fs.rmSync(config.dbPath + s, { force: true }));
  console.log('[DB] File database lama dihapus');
}
const db = initSchema(openDatabase(config.dbPath));
seedLocations(db);
console.log(`[DB] Skema siap di ${config.dbPath}`);
if (args.includes('--seed')) {
  console.log(seedIfEmpty(db).seeded ? '[DB] Data contoh diisi' : '[DB] Data sudah ada, seed dilewati');
}
db.close();
