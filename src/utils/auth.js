const crypto = require('crypto');

/** Hash kata sandi dengan scrypt (bawaan Node.js, tanpa dependency tambahan). Format: scrypt$salt$hash */
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltB64, hashB64] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

/** Token JWT HS256 sederhana. */
function signToken(payload, secret, ttlSeconds, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...payload, iat, exp: iat + ttlSeconds });
  return `${head}.${body}.${sign(`${head}.${body}`, secret)}`;
}

/** Mengembalikan payload bila token valid dan belum kedaluwarsa, selain itu null. */
function verifyToken(token, secret, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, secret));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(now / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken };
