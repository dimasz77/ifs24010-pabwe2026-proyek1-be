const userModel = require('../models/userModel');
const { ok } = require('./response');
const { HttpError } = require('../utils/httpError');
const { validateBody } = require('../validators/validate');
const { registerRules, loginRules } = require('../validators/schemas');
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');
const { SESSION_COOKIE, sessionCookieOptions, assertAllowedOrigin } = require('../utils/session');

const cfg = (req) => req.app.locals.config;
const db = (req) => req.app.locals.db;
const issue = (req, user) => signToken({ sub: user.id }, cfg(req).jwtSecret, cfg(req).tokenTtlSeconds);
const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, email: u.email || null });

function startSession(req, res, user) {
  const token = issue(req, user);
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions(cfg(req)),
    maxAge: cfg(req).tokenTtlSeconds * 1000,
  });
  return { user: publicUser(user) };
}

// Hash palsu agar waktu respons login tidak membocorkan apakah email terdaftar.
const DUMMY_HASH = hashPassword('dummy-password-untuk-menyamakan-waktu');

exports.register = (req, res) => {
  if (!cfg(req).allowRegistration) {
    throw new HttpError(403, 'REGISTRATION_CLOSED', 'Registrasi akun baru sedang ditutup');
  }
  const data = validateBody(req.body, registerRules);
  const id = userModel.insert(db(req), {
    name: data.name, username: data.username.toLowerCase(), email: data.email, password_hash: hashPassword(data.password),
  });
  const user = userModel.findById(db(req), id);
  ok(res, startSession(req, res, user), null, 201);
};

exports.login = (req, res) => {
  const data = validateBody(req.body, loginRules);
  const user = userModel.findByLogin(db(req), data.username.toLowerCase());
  const valid = verifyPassword(data.password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !valid) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Username atau kata sandi salah');
  ok(res, startSession(req, res, user));
};

exports.me = (req, res) => ok(res, publicUser(req.user));

exports.logout = (req, res) => {
  assertAllowedOrigin(req, cfg(req));
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions(cfg(req)));
  ok(res, { loggedOut: true });
};
