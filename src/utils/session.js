const { HttpError } = require('./httpError');

const SESSION_COOKIE = 'jenika_session';

function readSessionCookie(req) {
  const cookies = (req.get('Cookie') || '').split(';');
  const entry = cookies.find((part) => part.trim().startsWith(`${SESSION_COOKIE}=`));
  return entry ? entry.trim().slice(SESSION_COOKIE.length + 1) : '';
}

function sessionCookieOptions(config) {
  const secure = config.env === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/api',
  };
}

function assertAllowedOrigin(req, config) {
  const origin = req.get('Origin');
  if (!origin || !config.corsOrigins.includes(origin)) {
    throw new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin request tidak diizinkan');
  }
}

module.exports = { SESSION_COOKIE, readSessionCookie, sessionCookieOptions, assertAllowedOrigin };
