const SELECT = `SELECT c.*, (SELECT COUNT(*) FROM rentals r WHERE r.customer_id = c.id) AS rental_count FROM customers c`;

exports.list = (db, { q }, { limit, offset }) => {
  const where = q ? 'WHERE (c.full_name LIKE ? OR c.phone LIKE ? OR c.id_number LIKE ?)' : '';
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM customers c ${where}`).get(...params).n;
  const rows = db.prepare(`${SELECT} ${where} ORDER BY c.full_name COLLATE NOCASE LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  return { rows, total };
};

exports.findById = (db, id) => db.prepare(`${SELECT} WHERE c.id = ?`).get(id);

exports.insert = (db, d) =>
  Number(db.prepare(`INSERT INTO customers (full_name, phone, email, id_number, sim_number, origin)
    VALUES (@full_name, @phone, @email, @id_number, @sim_number, @origin)`).run(d).lastInsertRowid);

exports.update = (db, id, d) =>
  db.prepare(`UPDATE customers SET full_name=@full_name, phone=@phone, email=@email, id_number=@id_number,
    sim_number=@sim_number, origin=@origin, updated_at=datetime('now') WHERE id=@id`).run({ ...d, id }).changes;

exports.remove = (db, id) => db.prepare('DELETE FROM customers WHERE id = ?').run(id).changes;
