const { HttpError } = require('../utils/httpError');
const { verifyToken } = require('../utils/auth');
const userModel = require('../models/userModel');

/** Mewajibkan header "Authorization: Bearer <token>" yang valid dan pengguna yang masih ada. */
module.exports = function requireAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const payload = verifyToken(token, req.app.locals.config.jwtSecret);
  const user = payload && userModel.findById(req.app.locals.db, payload.sub);
  if (!user) return next(new HttpError(401, 'UNAUTHORIZED', 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali'));
  req.user = user;
  return next();
};
