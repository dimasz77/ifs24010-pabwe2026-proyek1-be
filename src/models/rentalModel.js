const SELECT = `
  SELECT r.*, (r.total_price + r.late_fee) AS grand_total,
    m.brand || ' ' || m.model AS motorcycle_name, m.plate AS motorcycle_plate,
    c.full_name AS customer_name, c.phone AS customer_phone,
    l.name AS pickup_location_name,
    CASE WHEN r.status = 'berjalan' AND r.end_date < @today THEN 1 ELSE 0 END AS is_overdue
  FROM rentals r
  JOIN motorcycles m ON m.id = r.motorcycle_id
  JOIN customers c ON c.id = r.customer_id
  JOIN pickup_locations l ON l.id = r.pickup_location_id`;

const toRow = (r) => (r ? { ...r, is_overdue: Boolean(r.is_overdue) } : r);

exports.list = (db, f, { limit, offset }, today) => {
  const where = [];
  const params = { today };
  if (f.status) { where.push('r.status = @status'); params.status = f.status; }
  if (f.motorcycle_id) { where.push('r.motorcycle_id = @motorcycle_id'); params.motorcycle_id = f.motorcycle_id; }
  if (f.customer_id) { where.push('r.customer_id = @customer_id'); params.customer_id = f.customer_id; }
  if (f.overdue) { where.push("r.status = 'berjalan' AND r.end_date < @today"); }
  if (f.q) {
    where.push('(r.code LIKE @q OR c.full_name LIKE @q OR m.plate LIKE @q OR m.brand LIKE @q OR m.model LIKE @q)');
    params.q = `%${f.q}%`;
  }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM rentals r
    JOIN motorcycles m ON m.id = r.motorcycle_id JOIN customers c ON c.id = r.customer_id ${sql}`)
    .get(params).n;
  const rows = db.prepare(`${SELECT} ${sql} ORDER BY r.start_date DESC, r.id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset });
  return { rows: rows.map(toRow), total };
};

exports.findById = (db, id, today) => toRow(db.prepare(`${SELECT} WHERE r.id = @id`).get({ id, today }));
exports.findRaw = (db, id) => db.prepare('SELECT * FROM rentals WHERE id = ?').get(id);

/** Sewa aktif (dipesan/berjalan) yang bentrok dengan rentang tanggal. Sewa berjalan yang terlambat dianggap masih memakai motor sampai akhir hari ini. */
exports.findConflict = (db, motorcycleId, start, end, excludeId, today) =>
  db.prepare(`SELECT id, code, start_date, end_date FROM rentals
    WHERE motorcycle_id = @motorcycleId AND status IN ('dipesan','berjalan') AND id != @excludeId
    AND start_date < @end
    AND (CASE WHEN status = 'berjalan' AND end_date < @today THEN date(@today, '+1 day') ELSE end_date END) > @start
    LIMIT 1`).get({ motorcycleId, start, end, excludeId: excludeId || 0, today });

exports.nextSequence = (db) => db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM rentals').get().n;

exports.insert = (db, d) =>
  Number(db.prepare(`INSERT INTO rentals
    (code, motorcycle_id, customer_id, pickup_location_id, start_date, end_date, days, price_per_day,
     subtotal, discount_amount, total_price, late_fee, returned_date, status, notes)
    VALUES (@code, @motorcycle_id, @customer_id, @pickup_location_id, @start_date, @end_date, @days,
     @price_per_day, @subtotal, @discount_amount, @total_price, @late_fee, @returned_date, @status, @notes)`)
    .run(d).lastInsertRowid);

exports.update = (db, id, d) =>
  db.prepare(`UPDATE rentals SET motorcycle_id=@motorcycle_id, customer_id=@customer_id,
    pickup_location_id=@pickup_location_id, start_date=@start_date, end_date=@end_date, days=@days,
    price_per_day=@price_per_day, subtotal=@subtotal, discount_amount=@discount_amount,
    total_price=@total_price, notes=@notes, updated_at=datetime('now') WHERE id=@id`).run({ ...d, id }).changes;

exports.setStatus = (db, id, { status, returned_date = null, late_fee = 0 }) =>
  db.prepare(`UPDATE rentals SET status=@status, returned_date=@returned_date, late_fee=@late_fee,
    updated_at=datetime('now') WHERE id=@id`).run({ id, status, returned_date, late_fee }).changes;

exports.remove = (db, id) => db.prepare('DELETE FROM rentals WHERE id = ?').run(id).changes;
