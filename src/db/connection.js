const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/** Membuka koneksi SQLite. Gunakan ':memory:' untuk pengujian. */
function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  if (file !== ':memory:') db.pragma('journal_mode = WAL');
  return db;
}

/** Migrasi: tabel users versi lama (tanpa kolom username) dibangun ulang; username awal = bagian lokal email + '_' + id. */
function migrateUsers(db) {
  const cols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
  if (cols.length === 0 || cols.includes('username')) return;
  db.transaction(() => {
    db.exec('ALTER TABLE users RENAME TO users_old');
    db.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.exec(`INSERT INTO users (id, name, username, email, password_hash, created_at)
      SELECT id, name, lower(substr(email, 1, instr(email, '@') - 1)) || '_' || id, email, password_hash, created_at FROM users_old`);
    db.exec('DROP TABLE users_old');
  })();
}

function initSchema(db) {
  // Tabel users lama harus dimigrasi sebelum schema.sql dijalankan (agar tidak bentrok dengan definisi baru)
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (exists) migrateUsers(db);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return db;
}

module.exports = { openDatabase, initSchema };
