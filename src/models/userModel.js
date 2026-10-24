exports.findByLogin = (db, login) =>
  db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
exports.findById = (db, id) =>
  db.prepare('SELECT id, name, username, email, created_at FROM users WHERE id = ?').get(id);
exports.insert = (db, { name, username, email, password_hash }) =>
  Number(db.prepare('INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)')
    .run(name, username, email, password_hash).lastInsertRowid);
exports.count = (db) => db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
