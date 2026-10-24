exports.summary = (db, today) => {
  const one = (sql, ...p) => db.prepare(sql).get(...p).n;
  const month = today.slice(0, 7);
  const fleet = db.prepare(`SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'perawatan' THEN 1 ELSE 0 END) AS maintenance
    FROM motorcycles`).get();
  const rentedNow = one(`SELECT COUNT(DISTINCT motorcycle_id) AS n FROM rentals WHERE status = 'berjalan'`);
  const maintenance = fleet.maintenance || 0;

  return {
    fleet: {
      total: fleet.total,
      rented: rentedNow,
      maintenance,
      available: Math.max(0, fleet.total - rentedNow - maintenance),
    },
    rentals: {
      active: one(`SELECT COUNT(*) AS n FROM rentals WHERE status = 'berjalan'`),
      booked: one(`SELECT COUNT(*) AS n FROM rentals WHERE status = 'dipesan'`),
      overdue: one(`SELECT COUNT(*) AS n FROM rentals WHERE status = 'berjalan' AND end_date < ?`, today),
      due_today: one(`SELECT COUNT(*) AS n FROM rentals WHERE status = 'berjalan' AND end_date = ?`, today),
      completed_this_month: one(
        `SELECT COUNT(*) AS n FROM rentals WHERE status = 'selesai' AND substr(returned_date, 1, 7) = ?`, month),
    },
    customers: one('SELECT COUNT(*) AS n FROM customers'),
    revenue_this_month: one(
      `SELECT COALESCE(SUM(total_price + late_fee), 0) AS n FROM rentals
       WHERE status = 'selesai' AND substr(returned_date, 1, 7) = ?`, month),
    fleet_by_type: db.prepare(`SELECT type, COUNT(*) AS count FROM motorcycles GROUP BY type ORDER BY count DESC`).all(),
    upcoming_returns: db.prepare(`SELECT r.id, r.code, r.end_date, c.full_name AS customer_name,
        m.brand || ' ' || m.model AS motorcycle_name, m.plate AS motorcycle_plate,
        CASE WHEN r.end_date < @today THEN 1 ELSE 0 END AS is_overdue
      FROM rentals r JOIN motorcycles m ON m.id = r.motorcycle_id JOIN customers c ON c.id = r.customer_id
      WHERE r.status = 'berjalan' ORDER BY r.end_date ASC LIMIT 5`).all({ today })
      .map((r) => ({ ...r, is_overdue: Boolean(r.is_overdue) })),
    recent_rentals: db.prepare(`SELECT r.id, r.code, r.status, r.start_date, r.end_date,
        (r.total_price + r.late_fee) AS grand_total, c.full_name AS customer_name,
        m.brand || ' ' || m.model AS motorcycle_name
      FROM rentals r JOIN motorcycles m ON m.id = r.motorcycle_id JOIN customers c ON c.id = r.customer_id
      ORDER BY r.id DESC LIMIT 5`).all(),
  };
};
