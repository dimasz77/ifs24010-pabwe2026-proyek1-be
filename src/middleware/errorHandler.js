const { HttpError } = require('../utils/httpError');

const UNIQUE_MESSAGES = {
  'users.username': ['username', 'Username sudah dipakai'],
  'users.email': ['email', 'Email sudah terdaftar'],
  'motorcycles.plate': ['plate', 'Plat nomor sudah terdaftar'],
  'customers.phone': ['phone', 'Nomor telepon sudah terdaftar'],
  'customers.id_number': ['id_number', 'Nomor KTP/Paspor sudah terdaftar'],
};

function send(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ success: false, error });
}

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) return send(res, err.status, err.code, err.message, err.details);

  if (err.type === 'entity.parse.failed') return send(res, 400, 'INVALID_JSON', 'Body request bukan JSON yang valid');
  if (err.type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', 'Body request terlalu besar');

  if (typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const key = Object.keys(UNIQUE_MESSAGES).find((k) => err.message.includes(k));
      if (key) {
        const [field, message] = UNIQUE_MESSAGES[key];
        return send(res, 409, 'DUPLICATE', message, { [field]: message });
      }
      return send(res, 409, 'DUPLICATE', 'Data duplikat');
    }
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return send(res, 409, 'IN_USE', 'Data masih terhubung dengan data lain');
    }
    return send(res, 422, 'CONSTRAINT_ERROR', 'Data melanggar aturan basis data');
  }

  if (process.env.NODE_ENV !== 'test') console.error('[ERROR]', err);
  return send(res, 500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server');
};
