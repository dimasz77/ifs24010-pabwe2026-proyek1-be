const SELECT = `
  SELECT m.*, l.name AS location_name,
    EXISTS (SELECT 1 FROM rentals r WHERE r.motorcycle_id = m.id AND r.status = 'berjalan') AS rented_now
  FROM motorcycles m
  JOIN pickup_locations l ON l.id = m.location_id`;

const SORTS = {
  newest: 'm.id DESC',
  price_asc: 'm.price_per_day ASC, m.id ASC',
  price_desc: 'm.price_per_day DESC, m.id ASC',
  brand: 'm.brand COLLATE NOCASE ASC, m.model COLLATE NOCASE ASC',
};

const toRow = (r) => (r ? { ...r, rented_now: Boolean(r.rented_now) } : r);

function buildWhere(f) {
  const where = [];
  const params = [];
  if (f.q) {
    where.push('(m.plate LIKE ? OR m.brand LIKE ? OR m.model LIKE ?)');
    const like = `%${f.q}%`;
    params.push(like, like, like);
  }
  if (f.type) { where.push('m.type = ?'); params.push(f.type); }
  if (f.status) { where.push('m.status = ?'); params.push(f.status); }
  if (f.location_id) { where.push('m.location_id = ?'); params.push(f.location_id); }
  if (f.available_from && f.available_to) {
    where.push(`m.status = 'tersedia' AND NOT EXISTS (
      SELECT 1 FROM rentals r WHERE r.motorcycle_id = m.id AND r.status IN ('dipesan','berjalan')
      AND r.start_date < ? AND (CASE WHEN r.status = 'berjalan' AND r.end_date < ? THEN date(?, '+1 day') ELSE r.end_date END) > ?)`);
    params.push(f.available_to, f.today, f.today, f.available_from);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

exports.list = (db, filters, { limit, offset }) => {
  const { sql, params } = buildWhere(filters);
  const order = SORTS[filters.sort] || SORTS.newest;
  const total = db.prepare(`SELECT COUNT(*) AS n FROM motorcycles m ${sql}`).get(...params).n;
  const rows = db.prepare(`${SELECT} ${sql} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { rows: rows.map(toRow), total };
};

exports.findById = (db, id) => toRow(db.prepare(`${SELECT} WHERE m.id = ?`).get(id));
exports.findRaw = (db, id) => db.prepare('SELECT * FROM motorcycles WHERE id = ?').get(id);

exports.insert = (db, d) => {
  const info = db.prepare(`INSERT INTO motorcycles
    (plate, brand, model, type, engine_cc, year, color, price_per_day, status, location_id, notes)
    VALUES (@plate, @brand, @model, @type, @engine_cc, @year, @color, @price_per_day, @status, @location_id, @notes)`).run(d);
  return Number(info.lastInsertRowid);
};

exports.update = (db, id, d) =>
  db.prepare(`UPDATE motorcycles SET plate=@plate, brand=@brand, model=@model, type=@type, engine_cc=@engine_cc,
    year=@year, color=@color, price_per_day=@price_per_day, status=@status, location_id=@location_id,
    notes=@notes, updated_at=datetime('now') WHERE id=@id`).run({ ...d, id }).changes;

exports.remove = (db, id) => db.prepare('DELETE FROM motorcycles WHERE id = ?').run(id).changes;
exports.countRentals = (db, id) =>
  db.prepare('SELECT COUNT(*) AS n FROM rentals WHERE motorcycle_id = ?').get(id).n;
