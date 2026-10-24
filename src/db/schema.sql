PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pickup_locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  area        TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS motorcycles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  plate         TEXT NOT NULL UNIQUE,
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('matic','bebek','sport','trail')),
  engine_cc     INTEGER NOT NULL CHECK (engine_cc > 0),
  year          INTEGER NOT NULL,
  color         TEXT,
  price_per_day INTEGER NOT NULL CHECK (price_per_day > 0),
  status        TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia','perawatan')),
  location_id   INTEGER NOT NULL REFERENCES pickup_locations(id) ON DELETE RESTRICT,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL UNIQUE,
  email      TEXT,
  id_number  TEXT NOT NULL UNIQUE,
  sim_number TEXT NOT NULL,
  origin     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rentals (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT NOT NULL UNIQUE,
  motorcycle_id      INTEGER NOT NULL REFERENCES motorcycles(id) ON DELETE RESTRICT,
  customer_id        INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  pickup_location_id INTEGER NOT NULL REFERENCES pickup_locations(id) ON DELETE RESTRICT,
  start_date         TEXT NOT NULL,
  end_date           TEXT NOT NULL,
  returned_date      TEXT,
  days               INTEGER NOT NULL CHECK (days >= 1),
  price_per_day      INTEGER NOT NULL,
  subtotal           INTEGER NOT NULL,
  discount_amount    INTEGER NOT NULL DEFAULT 0,
  total_price        INTEGER NOT NULL,
  late_fee           INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'dipesan'
                     CHECK (status IN ('dipesan','berjalan','selesai','dibatalkan')),
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_motorcycles_type     ON motorcycles(type);
CREATE INDEX IF NOT EXISTS idx_motorcycles_location ON motorcycles(location_id);
CREATE INDEX IF NOT EXISTS idx_rentals_motor_dates  ON rentals(motorcycle_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_customer     ON rentals(customer_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status       ON rentals(status);
