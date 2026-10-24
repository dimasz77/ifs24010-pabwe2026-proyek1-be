const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Lapisan tipis di atas driver SQLite bawaan runtime (tanpa modul native, jadi tidak ada langkah kompilasi):
 * - Bun  -> bun:sqlite
 * - Node -> node:sqlite (Node >= 22.5)
 * Antarmuka yang dipakai kode lain: prepare().get/all/run, exec, pragma, transaction, close.
 */
function openRaw(file) {
  if (process.versions.bun) {
    const { Database } = require('bun:sqlite');
    return { raw: new Database(file, { strict: true }), bun: true };
  }
  const { DatabaseSync } = require('node:sqlite');
  return { raw: new DatabaseSync(file), bun: false };
}

// node:sqlite memberi code 'ERR_SQLITE_ERROR' + errcode numerik (bun:sqlite: errno); samakan dengan kode string SQLite
// yang dikenali errorHandler (mis. SQLITE_CONSTRAINT_UNIQUE -> 409 DUPLICATE).
const SQLITE_CODES = {
  19: 'SQLITE_CONSTRAINT',
  275: 'SQLITE_CONSTRAINT_CHECK',
  787: 'SQLITE_CONSTRAINT_FOREIGNKEY',
  1299: 'SQLITE_CONSTRAINT_NOTNULL',
  1555: 'SQLITE_CONSTRAINT_PRIMARYKEY',
  2067: 'SQLITE_CONSTRAINT_UNIQUE',
};

function normalizeError(err) {
  const num = typeof err.errcode === 'number' ? err.errcode : err.errno;
  const known = typeof err.code === 'string' && err.code.startsWith('SQLITE_');
  if (!known && typeof num === 'number' && SQLITE_CODES[num]) err.code = SQLITE_CODES[num];
  return err;
}

const guard = (fn) => (...args) => {
  try {
    return fn(...args);
  } catch (err) {
    throw normalizeError(err);
  }
};

const plain = (row) => (row === null || row === undefined ? undefined : { ...row });

function wrapDatabase({ raw, bun }) {
  let depth = 0;
  const db = {
    prepare(sql) {
      const st = raw.prepare(sql);
      if (!bun && typeof st.setAllowUnknownNamedParameters === 'function') st.setAllowUnknownNamedParameters(true);
      return {
        get: guard((...args) => plain(st.get(...args))),
        all: guard((...args) => st.all(...args).map(plain)),
        run: guard((...args) => st.run(...args)),
      };
    },
    exec: guard((sql) => raw.exec(sql)),
    pragma: (setting) => raw.exec(`PRAGMA ${setting}`),
    /** Mengembalikan fungsi yang menjalankan fn dalam transaksi (bersarang memakai SAVEPOINT); rollback bila fn melempar error. */
    transaction(fn) {
      return (...args) => {
        const level = depth;
        const savepoint = `sp_${level}`;
        raw.exec(level === 0 ? 'BEGIN' : `SAVEPOINT ${savepoint}`);
        depth += 1;
        try {
          const result = fn(...args);
          depth -= 1;
          raw.exec(level === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
          return result;
        } catch (err) {
          depth -= 1;
          if (level === 0) raw.exec('ROLLBACK');
          else raw.exec(`ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
          throw err;
        }
      };
    },
    close: () => raw.close(),
  };
  return db;
}

/** Membuka koneksi SQLite. Gunakan ':memory:' untuk pengujian. */
function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = wrapDatabase(openRaw(file));
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