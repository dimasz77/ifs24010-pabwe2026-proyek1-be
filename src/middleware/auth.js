const { HttpError } = require('../utils/httpError');
const { verifyToken } = require('../utils/auth');
const userModel = require('../models/userModel');
const { readSessionCookie, assertAllowedOrigin } = require('../utils/session');

/** Mewajibkan sesi cookie yang valid dan memeriksa Origin pada request yang mengubah data. */
module.exports = function requireAuth(req, res, next) {
  const cookieToken = readSessionCookie(req);
  if (cookieToken && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    try {
      assertAllowedOrigin(req, req.app.locals.config);
    } catch (err) {
      return next(err);
    }
  }
  const token = cookieToken;
  const payload = verifyToken(token, req.app.locals.config.jwtSecret);
  const user = payload && userModel.findById(req.app.locals.db, payload.sub);
  if (!user) return next(new HttpError(401, 'UNAUTHORIZED', 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali'));
  req.user = user;
  return next();
};
