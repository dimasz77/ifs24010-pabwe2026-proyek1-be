const { buildApp, validMotor } = require('../helpers');

describe('API /api/motorcycles', () => {
  let ctx;
  beforeEach(() => { ctx = buildApp(); });
  afterEach(() => ctx.db.close());

  test('GET daftar motor berisi data seed dan meta paginasi', async () => {
    const res = await ctx.api.get('/api/motorcycles?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5, total: 15, totalPages: 3 });
  });

  test('filter tipe, pencarian, dan urutan harga', async () => {
    const trail = await ctx.api.get('/api/motorcycles?type=trail');
    expect(trail.body.data.every((m) => m.type === 'trail')).toBe(true);
    expect(trail.body.meta.total).toBe(3);

    const search = await ctx.api.get('/api/motorcycles?q=nmax');
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0].model).toBe('NMAX 155');

    const sorted = await ctx.api.get('/api/motorcycles?sort=price_desc&limit=3');
    const prices = sorted.body.data.map((m) => m.price_per_day);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('filter tipe tidak valid -> 422', async () => {
    const res = await ctx.api.get('/api/motorcycles?type=pesawat');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST membuat motor (201), plat dinormalkan, dan dapat dibaca kembali', async () => {
    const res = await ctx.api.post('/api/motorcycles').send(validMotor({ plate: 'bb9001zz' }));
    expect(res.status).toBe(201);
    expect(res.body.data.plate).toBe('BB 9001 ZZ');
    const get = await ctx.api.get(`/api/motorcycles/${res.body.data.id}`);
    expect(get.status).toBe(200);
    expect(get.body.data.brand).toBe('Honda');
  });

  test('POST body kosong -> 422 dengan detail per kolom', async () => {
    const res = await ctx.api.post('/api/motorcycles').send({});
    expect(res.status).toBe(422);
    expect(res.body.error.details).toHaveProperty('plate');
    expect(res.body.error.details).toHaveProperty('price_per_day');
  });

  test('POST nilai tidak valid -> 422', async () => {
    const res = await ctx.api.post('/api/motorcycles').send(validMotor({ price_per_day: 100, year: 1990, plate: '###' }));
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.error.details)).toEqual(expect.arrayContaining(['price_per_day', 'year', 'plate']));
  });

  test('POST plat duplikat -> 409', async () => {
    const res = await ctx.api.post('/api/motorcycles').send(validMotor({ plate: 'BB 3101 AA' }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE');
  });

  test('POST lokasi tidak ada -> 422', async () => {
    const res = await ctx.api.post('/api/motorcycles').send(validMotor({ location_id: 999 }));
    expect(res.status).toBe(422);
    expect(res.body.error.details.location_id).toBeDefined();
  });

  test('JSON rusak -> 400', async () => {
    const res = await ctx.api.post('/api/motorcycles').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('PUT memperbarui data', async () => {
    const created = await ctx.api.post('/api/motorcycles').send(validMotor());
    const res = await ctx.api.put(`/api/motorcycles/${created.body.data.id}`).send(validMotor({ price_per_day: 99000, status: 'perawatan' }));
    expect(res.status).toBe(200);
    expect(res.body.data.price_per_day).toBe(99000);
    expect(res.body.data.status).toBe('perawatan');
  });

  test('GET/PUT/DELETE id tidak ada -> 404, id tidak valid -> 400', async () => {
    expect((await ctx.api.get('/api/motorcycles/9999')).status).toBe(404);
    expect((await ctx.api.put('/api/motorcycles/9999').send(validMotor())).status).toBe(404);
    expect((await ctx.api.delete('/api/motorcycles/9999')).status).toBe(404);
    expect((await ctx.api.get('/api/motorcycles/abc')).status).toBe(400);
  });

  test('DELETE motor tanpa riwayat berhasil, lalu 404', async () => {
    const created = await ctx.api.post('/api/motorcycles').send(validMotor());
    const id = created.body.data.id;
    expect((await ctx.api.delete(`/api/motorcycles/${id}`)).status).toBe(200);
    expect((await ctx.api.get(`/api/motorcycles/${id}`)).status).toBe(404);
  });

  test('DELETE motor yang punya riwayat sewa -> 409', async () => {
    const res = await ctx.api.delete('/api/motorcycles/1');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HAS_HISTORY');
  });
});
