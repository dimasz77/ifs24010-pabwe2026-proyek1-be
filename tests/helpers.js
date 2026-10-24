const request = require('supertest');
const { openDatabase, initSchema } = require('../src/db/connection');
const { seedIfEmpty, seedLocations } = require('../src/db/seed');
const { createApp } = require('../src/app');

const { hashPassword, signToken } = require('../src/utils/auth');
const userModel = require('../src/models/userModel');

const config = {
  corsOrigins: ['http://localhost:5173'], lateFeeMultiplier: 1.5,
  jwtSecret: 'secret-untuk-test', tokenTtlSeconds: 3600, allowRegistration: true,
};

function buildApp({ seed = true, file = ':memory:' } = {}) {
  const db = initSchema(openDatabase(file));
  if (seed) seedIfEmpty(db); else seedLocations(db);
  const cfg = { ...config };
  const app = createApp({ db, config: cfg });
  const userId = userModel.insert(db, { name: 'Admin Test', username: 'admintest', email: 'admin@test.id', password_hash: hashPassword('rahasia123') });
  const token = signToken({ sub: userId }, cfg.jwtSecret, 3600);
  // api: otomatis membawa token login; raw: tanpa token (untuk menguji proteksi)
  const authed = (method) => (url) => request(app)[method](url).set('Authorization', `Bearer ${token}`);
  const api = { get: authed('get'), post: authed('post'), put: authed('put'), patch: authed('patch'), delete: authed('delete') };
  return { db, app, api, raw: request(app), token, config: cfg };
}

const validMotor = (over = {}) => ({
  plate: 'BB 9001 ZZ', brand: 'Honda', model: 'Beat Street', type: 'matic', engine_cc: 110,
  year: 2023, color: 'Hitam', price_per_day: 85000, status: 'tersedia', location_id: 1, ...over,
});

const validCustomer = (over = {}) => ({
  full_name: 'Tester Uji', phone: '0811 2222 3333', email: 'tester@example.com',
  id_number: 'ID-TEST-0001', sim_number: 'SIM-TEST-0001', origin: 'Medan', ...over,
});

module.exports = { buildApp, validMotor, validCustomer };
