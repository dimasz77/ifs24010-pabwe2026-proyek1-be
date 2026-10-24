const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const bool = (v, d = false) => (v === undefined ? d : String(v).toLowerCase() === 'true');

/** JWT_SECRET dari env; di produksi tanpa env, dibuat acak sekali lalu disimpan di samping file database. */
function resolveSecret(dbPath) {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV !== 'production') return 'dev-secret-ganti-di-produksi';
  const file = path.join(path.dirname(dbPath), '.jwt_secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch { /* belum ada */ }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}
const DB_PATH = path.resolve(__dirname, '..', process.env.DB_PATH || './data/rental.db');

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || process.env.APP_PORT) || 4000,
  dbPath: DB_PATH,
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwtSecret: resolveSecret(DB_PATH),
  tokenTtlSeconds: (Number(process.env.TOKEN_TTL_HOURS) || 168) * 3600,
  allowRegistration: bool(process.env.ALLOW_REGISTRATION, true),
  autoSeed: bool(process.env.AUTO_SEED, false),
  lateFeeMultiplier: Number(process.env.LATE_FEE_MULTIPLIER) || 1.5,
};
