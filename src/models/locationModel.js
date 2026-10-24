exports.list = (db) => db.prepare('SELECT * FROM pickup_locations ORDER BY name').all();
exports.findById = (db, id) => db.prepare('SELECT * FROM pickup_locations WHERE id = ?').get(id);
