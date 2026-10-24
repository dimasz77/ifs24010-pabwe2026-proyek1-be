const config = require('./config');
const { openDatabase, initSchema } = require('./db/connection');
const { seedIfEmpty, seedLocations } = require('./db/seed');
const { createApp } = require('./app');

const db = initSchema(openDatabase(config.dbPath));
seedLocations(db); // lokasi jemput adalah data master, selalu tersedia
if (config.autoSeed) {
  const result = seedIfEmpty(db);
  if (result.seeded) console.log('[DB] Data contoh berhasil diisi');
}

const app = createApp({ db, config });
const server = app.listen(config.port, () => {
  console.log(`[API] Rental Motor Samosir berjalan di http://localhost:${config.port}  (db: ${config.dbPath})`);
});

function shutdown(signal) {
  console.log(`[API] ${signal} diterima, menutup server...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
