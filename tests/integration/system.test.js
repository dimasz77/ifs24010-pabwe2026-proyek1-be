const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const { buildApp, validMotor } = require('../helpers');
const { openDatabase, initSchema } = require('../../src/db/connection');
const { seedIfEmpty } = require('../../src/db/seed');
const { createApp } = require('../../src/app');

describe('sistem', () => {
  test('health OK, dashboard berisi ringkasan, locations tersedia', async () => {
    const { api, db } = buildApp();
    expect((await api.get('/api/health')).body.data.database).toBe('connected');
    const dash = (await api.get('/api/dashboard/summary')).body.data;
    expect(dash.fleet).toEqual({ total: 15, rented: 3, maintenance: 1, available: 11 });
    expect(dash.rentals).toMatchObject({ active: 3, booked: 2, overdue: 1 });
    expect(dash.recent_rentals).toHaveLength(5);
    expect((await api.get('/api/locations')).body.data).toHaveLength(5);
    db.close();
  });

  test('endpoint tidak ada -> 404 JSON', async () => {
    const { api, db } = buildApp();
    const res = await api.get('/api/tidak-ada');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
    db.close();
  });

  test('error database: health 503 dan endpoint data 500 tanpa membocorkan detail', async () => {
    const { api, db } = buildApp();
    db.close();
    const health = await api.get('/api/health');
    expect(health.status).toBe(503);
    const list = await api.get('/api/motorcycles');
    expect(list.status).toBe(500);
    expect(list.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(list.body)).not.toMatch(/SELECT|sqlite/i);
  });

  test('seed idempoten: dijalankan dua kali tidak menggandakan data', () => {
    const { db } = buildApp();
    expect(seedIfEmpty(db).seeded).toBe(false);
    expect(db.prepare('SELECT COUNT(*) n FROM motorcycles').get().n).toBe(15);
    expect(db.prepare('SELECT COUNT(*) n FROM pickup_locations').get().n).toBe(5);
    db.close();
  });

  test('data tetap ada setelah database dibuka ulang (persisten)', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rms-')), 'persist.db');
    const first = buildApp({ file });
    const created = await first.api.post('/api/motorcycles').send(validMotor());
    expect(created.status).toBe(201);
    first.db.close();

    const db2 = initSchema(openDatabase(file));
    seedIfEmpty(db2); // restart server: seed tidak boleh menimpa/menggandakan
    const api2 = request(createApp({ db: db2, config: { ...first.config, corsOrigins: [] } }));
    const res = await api2.get(`/api/motorcycles/${created.body.data.id}`).set('Authorization', `Bearer ${first.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.plate).toBe('BB 9001 ZZ');
    expect(db2.prepare('SELECT COUNT(*) n FROM motorcycles').get().n).toBe(16);
    db2.close();
  });
});
