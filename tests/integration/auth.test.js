const { buildApp } = require('../helpers');
const { signToken, verifyToken, hashPassword, verifyPassword } = require('../../src/utils/auth');

describe('util auth', () => {
  test('hash kata sandi: benar/salah dan salt berbeda', () => {
    const h1 = hashPassword('rahasia123');
    const h2 = hashPassword('rahasia123');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('rahasia123', h1)).toBe(true);
    expect(verifyPassword('salah', h1)).toBe(false);
    expect(verifyPassword('x', 'format-rusak')).toBe(false);
  });
  test('token: valid, dimanipulasi, dan kedaluwarsa', () => {
    const t = signToken({ sub: 1 }, 's', 60, 1_000_000);
    expect(verifyToken(t, 's', 1_000_000).sub).toBe(1);
    expect(verifyToken(t, 'kunci-lain', 1_000_000)).toBeNull();
    expect(verifyToken(t + 'x', 's', 1_000_000)).toBeNull();
    expect(verifyToken(t, 's', 1_000_000 + 61_000)).toBeNull();
    expect(verifyToken('bukan.token', 's')).toBeNull();
  });
});

describe('API /api/auth', () => {
  let ctx;
  beforeEach(() => { ctx = buildApp({ seed: false }); });
  afterEach(() => ctx.db.close());
  const user = { name: 'Dimas Sidabutar', username: 'Dimas_S', email: 'Dimas@Contoh.id', password: 'kataSandi123' };

  test('registrasi berhasil: 201, sesi cookie HttpOnly, dan hash tidak bocor', async () => {
    const res = await ctx.raw.post('/api/auth/register').send(user);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toEqual({ id: expect.any(Number), name: user.name, username: 'dimas_s', email: 'dimas@contoh.id' });
    expect(res.body.data.token).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(res.headers['set-cookie'][0]).toMatch(/Path=\/api/);
    expect(JSON.stringify(res.body)).not.toMatch(/scrypt|password_hash/);
  });

  test('email bersifat opsional saat registrasi', async () => {
    const res = await ctx.raw.post('/api/auth/register').send({ name: 'Tanpa Email', username: 'tanpaemail', password: 'abcdef' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBeNull();
    const again = await ctx.raw.post('/api/auth/register').send({ name: 'Tanpa Email Dua', username: 'tanpaemail2', password: 'abcdef' });
    expect(again.status).toBe(201); // dua akun tanpa email tidak saling bentrok
  });

  test('registrasi: validasi dan duplikat username/email (409)', async () => {
    const empty = await ctx.raw.post('/api/auth/register').send({});
    expect(empty.status).toBe(422);
    expect(Object.keys(empty.body.error.details)).toEqual(['name', 'username', 'password']);
    const bad = await ctx.raw.post('/api/auth/register').send({ ...user, username: 'a b', email: 'x', password: '123' });
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(['username', 'email', 'password']));
    await ctx.raw.post('/api/auth/register').send(user);
    const dupUser = await ctx.raw.post('/api/auth/register').send({ ...user, username: 'DIMAS_S', email: 'lain@contoh.id' });
    expect(dupUser.status).toBe(409);
    expect(dupUser.body.error.details.username).toBe('Username sudah dipakai');
    const dupMail = await ctx.raw.post('/api/auth/register').send({ ...user, username: 'lain' });
    expect(dupMail.status).toBe(409);
    expect(dupMail.body.error.details.email).toBe('Email sudah terdaftar');
  });

  test('registrasi dapat ditutup lewat konfigurasi (403)', async () => {
    ctx.app.locals.config.allowRegistration = false;
    const res = await ctx.raw.post('/api/auth/register').send(user);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('REGISTRATION_CLOSED');
  });

  test('login via username/email membuat sesi cookie dan /auth/me memulihkannya', async () => {
    await ctx.raw.post('/api/auth/register').send(user);
    const byUser = await ctx.raw.post('/api/auth/login').send({ username: 'DIMAS_S', password: user.password });
    expect(byUser.status).toBe(200);
    expect(byUser.body.data.token).toBeUndefined();
    expect(byUser.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    const byMail = await ctx.raw.post('/api/auth/login').send({ username: 'dimas@contoh.id', password: user.password });
    expect(byMail.status).toBe(200);
    const cookie = byUser.headers['set-cookie'][0].split(';')[0];
    const me = await ctx.raw.get('/api/auth/me').set('Cookie', cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.username).toBe('dimas_s');
  });

  test('cookie produksi memiliki atribut lintas-origin yang aman', async () => {
    ctx.config.env = 'production';
    const login = await ctx.raw.post('/api/auth/login').send({ username: 'admintest', password: 'rahasia123' });
    expect(login.status).toBe(200);
    expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(login.headers['set-cookie'][0]).toMatch(/Secure/);
    expect(login.headers['set-cookie'][0]).toMatch(/SameSite=None/i);
    expect(login.headers['set-cookie'][0]).toMatch(/Max-Age=3600/);
  });

  test('cookie-authenticated write requests require an allowed Origin and logout clears the cookie', async () => {
    const login = await ctx.raw.post('/api/auth/login').send({ username: 'admintest', password: 'rahasia123' });
    const cookie = login.headers['set-cookie'][0].split(';')[0];

    const blocked = await ctx.raw.post('/api/customers').set('Cookie', cookie)
      .set('Origin', 'https://attacker.example').send({});
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ORIGIN_NOT_ALLOWED');

    const logout = await ctx.raw.post('/api/auth/logout').set('Origin', 'http://localhost:5173');
    expect(logout.status).toBe(200);
    expect(logout.headers['set-cookie'][0]).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(logout.headers['set-cookie'][0]).toMatch(/Path=\/api/);
    expect(logout.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  });

  test('CORS allows credentialed requests from configured frontend origins', async () => {
    const response = await ctx.raw.options('/api/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('login gagal: sandi salah dan username tidak terdaftar memberi pesan yang sama (401)', async () => {
    await ctx.raw.post('/api/auth/register').send(user);
    const wrong = await ctx.raw.post('/api/auth/login').send({ username: 'dimas_s', password: 'salahsalah' });
    const unknown = await ctx.raw.post('/api/auth/login').send({ username: 'tidakada', password: 'kataSandi123' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
    expect((await ctx.raw.post('/api/auth/login').send({})).status).toBe(422);
  });

  test('endpoint data wajib login; health tetap publik', async () => {
    for (const path of ['/api/motorcycles', '/api/customers', '/api/rentals', '/api/dashboard/summary', '/api/locations', '/api/auth/me']) {
      expect((await ctx.raw.get(path)).status).toBe(401);
    }
    expect((await ctx.raw.post('/api/motorcycles').send({})).status).toBe(401);
    expect((await ctx.raw.get('/api/motorcycles').set('Authorization', 'Bearer rusak.rusak.rusak')).status).toBe(401);
    expect((await ctx.raw.get('/api/motorcycles').set('Authorization', `Bearer ${ctx.token}`)).status).toBe(401);
    const expired = signToken({ sub: 1 }, ctx.config.jwtSecret, 60, Date.now() - 120_000);
    expect((await ctx.raw.get('/api/motorcycles').set('Cookie', `jenika_session=${expired}`)).status).toBe(401);
    expect((await ctx.raw.get('/api/health')).status).toBe(200);
  });

  test('token milik pengguna yang sudah dihapus ditolak', async () => {
    const res = await ctx.raw.post('/api/auth/register').send(user);
    ctx.db.prepare('DELETE FROM users WHERE id = ?').run(res.body.data.user.id);
    const cookie = res.headers['set-cookie'][0].split(';')[0];
    expect((await ctx.raw.get('/api/auth/me').set('Cookie', cookie)).status).toBe(401);
  });

  test('database kosong: dashboard dan daftar tetap berfungsi', async () => {
    const dash = await ctx.api.get('/api/dashboard/summary');
    expect(dash.status).toBe(200);
    expect(dash.body.data.fleet.total).toBe(0);
    expect((await ctx.api.get('/api/locations')).body.data).toHaveLength(5);
  });
});

describe('migrasi database lama', () => {
  test('tabel users tanpa username dimigrasi tanpa kehilangan akun; login lama tetap bisa lewat email', async () => {
    const { openDatabase, initSchema } = require('../../src/db/connection');
    const db = openDatabase(':memory:');
    db.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
    db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)').run('Lama Sekali', 'lama@contoh.id', hashPassword('sandilama1'));
    initSchema(db);
    initSchema(db); // idempoten
    const row = db.prepare('SELECT username, email FROM users').get();
    expect(row).toEqual({ username: 'lama_1', email: 'lama@contoh.id' });

    const request = require('supertest');
    const { createApp } = require('../../src/app');
    const cfg = { corsOrigins: [], lateFeeMultiplier: 1.5, jwtSecret: 's', tokenTtlSeconds: 60, allowRegistration: true };
    const api = request(createApp({ db, config: cfg }));
    expect((await api.post('/api/auth/login').send({ username: 'lama@contoh.id', password: 'sandilama1' })).status).toBe(200);
    expect((await api.post('/api/auth/login').send({ username: 'lama_1', password: 'sandilama1' })).status).toBe(200);
    db.close();
  });
});
