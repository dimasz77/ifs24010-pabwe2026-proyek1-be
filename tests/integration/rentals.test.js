const { buildApp } = require('../helpers');
const { addDays, today } = require('../../src/utils/dates');

const T = today();
const body = (over = {}) => ({
  motorcycle_id: 8, customer_id: 9, pickup_location_id: 3,
  start_date: addDays(T, 20), end_date: addDays(T, 23), ...over,
});

describe('API /api/rentals', () => {
  let ctx;
  beforeEach(() => { ctx = buildApp(); });
  afterEach(() => ctx.db.close());

  test('GET daftar, filter status, dan pencarian', async () => {
    const all = await ctx.api.get('/api/rentals');
    expect(all.body.meta.total).toBe(10);
    const running = await ctx.api.get('/api/rentals?status=berjalan');
    expect(running.body.data.every((r) => r.status === 'berjalan')).toBe(true);
    expect(running.body.meta.total).toBe(3);
    const q = await ctx.api.get('/api/rentals?q=weber');
    expect(q.body.data.length).toBeGreaterThan(0);
    const overdue = await ctx.api.get('/api/rentals?overdue=true');
    expect(overdue.body.meta.total).toBe(1);
    expect(overdue.body.data[0].is_overdue).toBe(true);
    expect((await ctx.api.get('/api/rentals?status=ngawur')).status).toBe(422);
  });

  test('quote menghitung harga dan diskon mingguan', async () => {
    const res = await ctx.api.get('/api/rentals/quote').query({
      motorcycle_id: 8, start_date: addDays(T, 20), end_date: addDays(T, 27),
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ days: 7, price_per_day: 85000, subtotal: 595000, discount_percent: 10, total_price: 535500 });
  });

  test('quote: tanggal terbalik -> 422, motor tidak ada -> 404, parameter kosong -> 422', async () => {
    const rev = await ctx.api.get('/api/rentals/quote').query({ motorcycle_id: 8, start_date: addDays(T, 5), end_date: addDays(T, 4) });
    expect(rev.status).toBe(422);
    const nf = await ctx.api.get('/api/rentals/quote').query({ motorcycle_id: 999, start_date: addDays(T, 5), end_date: addDays(T, 6) });
    expect(nf.status).toBe(404);
    expect((await ctx.api.get('/api/rentals/quote')).status).toBe(422);
  });

  test('POST membuat sewa berstatus dipesan dengan total yang benar', async () => {
    const res = await ctx.api.post('/api/rentals').send(body());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'dipesan', days: 3, total_price: 255000, grand_total: 255000 });
    expect(res.body.data.code).toMatch(/^RMS-\d{4}-\d{4}$/);
    expect(res.body.data.customer_name).toBe('Kevin Tambunan');
  });

  test('POST validasi: kosong, tanggal terbalik, tanggal lampau, referensi tidak ada', async () => {
    expect((await ctx.api.post('/api/rentals').send({})).status).toBe(422);
    const rev = await ctx.api.post('/api/rentals').send(body({ end_date: addDays(T, 19) }));
    expect(rev.status).toBe(422);
    expect(rev.body.error.details.end_date).toBeDefined();
    const past = await ctx.api.post('/api/rentals').send(body({ start_date: addDays(T, -2), end_date: addDays(T, 1) }));
    expect(past.status).toBe(422);
    expect(past.body.error.details.start_date).toBeDefined();
    const refs = await ctx.api.post('/api/rentals').send(body({ motorcycle_id: 999, customer_id: 999, pickup_location_id: 999 }));
    expect(refs.status).toBe(422);
    expect(Object.keys(refs.body.error.details)).toEqual(['motorcycle_id', 'customer_id', 'pickup_location_id']);
  });

  test('POST bentrok jadwal -> 409, rentang berdampingan diperbolehkan', async () => {
    await ctx.api.post('/api/rentals').send(body());
    const clash = await ctx.api.post('/api/rentals').send(body({ customer_id: 1, start_date: addDays(T, 22), end_date: addDays(T, 25) }));
    expect(clash.status).toBe(409);
    expect(clash.body.error.code).toBe('BOOKING_CONFLICT');
    const adjacent = await ctx.api.post('/api/rentals').send(body({ customer_id: 1, start_date: addDays(T, 23), end_date: addDays(T, 25) }));
    expect(adjacent.status).toBe(201);
  });

  test('regresi: durasi sewa dibatasi maksimal 90 hari', async () => {
    const tooLong = await ctx.api.post('/api/rentals').send(body({ end_date: addDays(T, 20 + 91) }));
    expect(tooLong.status).toBe(422);
    expect(tooLong.body.error.details.end_date).toMatch(/maksimal 90 hari/);
    const edge = await ctx.api.post('/api/rentals').send(body({ end_date: addDays(T, 20 + 90) }));
    expect(edge.status).toBe(201);
    const quote = await ctx.api.get('/api/rentals/quote').query({ motorcycle_id: 8, start_date: T, end_date: '2099-12-31' });
    expect(quote.status).toBe(422);
  });

  test('motor perawatan tidak dapat disewa -> 409', async () => {
    const res = await ctx.api.post('/api/rentals').send(body({ motorcycle_id: 15 }));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MOTOR_UNAVAILABLE');
  });

  test('motor yang terlambat dikembalikan masih dianggap terpakai', async () => {
    // Seed: KLX 150 (id 12) berjalan, jatuh tempo kemarin dan belum kembali
    const res = await ctx.api.post('/api/rentals').send(body({ motorcycle_id: 12, start_date: T, end_date: addDays(T, 2) }));
    expect(res.status).toBe(409);
  });

  test('filter ketersediaan motor mengecualikan motor yang sedang dipesan', async () => {
    await ctx.api.post('/api/rentals').send(body());
    const res = await ctx.api.get('/api/motorcycles').query({ available_from: addDays(T, 20), available_to: addDays(T, 23), limit: 50 });
    expect(res.status).toBe(200);
    const ids = res.body.data.map((m) => m.id);
    expect(ids).not.toContain(8);
    expect(ids).not.toContain(15); // perawatan
    expect(ids).toContain(1);
  });

  test('alur lengkap: dipesan -> berjalan -> selesai tanpa denda', async () => {
    const created = await ctx.api.post('/api/rentals').send(body({ start_date: T, end_date: addDays(T, 2) }));
    const id = created.body.data.id;
    const start = await ctx.api.patch(`/api/rentals/${id}/status`).send({ action: 'start' });
    expect(start.status).toBe(200);
    expect(start.body.data.status).toBe('berjalan');
    const done = await ctx.api.patch(`/api/rentals/${id}/status`).send({ action: 'return' });
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({ status: 'selesai', late_fee: 0, returned_date: T });
  });

  test('pengembalian terlambat menghasilkan denda', async () => {
    // Seed #6 (KLX 150): jatuh tempo kemarin, harga 200000/hari -> denda 1 hari x 1.5
    const res = await ctx.api.patch('/api/rentals/6/status').send({ action: 'return' });
    expect(res.status).toBe(200);
    expect(res.body.data.late_fee).toBe(300000);
    expect(res.body.data.grand_total).toBe(res.body.data.total_price + 300000);
  });

  test('transisi status tidak valid -> 409, aksi/tanggal tidak valid -> 422', async () => {
    expect((await ctx.api.patch('/api/rentals/1/status').send({ action: 'start' })).status).toBe(409); // selesai
    expect((await ctx.api.patch('/api/rentals/5/status').send({ action: 'cancel' })).status).toBe(409); // berjalan
    expect((await ctx.api.patch('/api/rentals/9/status').send({ action: 'start' })).status).toBe(409); // belum waktunya
    expect((await ctx.api.patch('/api/rentals/9/status').send({ action: 'terbang' })).status).toBe(422);
    expect((await ctx.api.patch('/api/rentals/5/status').send({ action: 'return', returned_date: addDays(T, 5) })).status).toBe(422);
    expect((await ctx.api.patch('/api/rentals/9999/status').send({ action: 'start' })).status).toBe(404);
  });

  test('batalkan sewa dipesan lalu motor kembali bebas untuk tanggal itu', async () => {
    const created = await ctx.api.post('/api/rentals').send(body());
    const id = created.body.data.id;
    expect((await ctx.api.patch(`/api/rentals/${id}/status`).send({ action: 'cancel' })).body.data.status).toBe('dibatalkan');
    expect((await ctx.api.post('/api/rentals').send(body({ customer_id: 1 }))).status).toBe(201);
  });

  test('PUT hanya untuk sewa dipesan dan menghitung ulang total', async () => {
    const created = await ctx.api.post('/api/rentals').send(body());
    const id = created.body.data.id;
    const upd = await ctx.api.put(`/api/rentals/${id}`).send(body({ end_date: addDays(T, 24) }));
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ days: 4, total_price: 340000 });
    expect((await ctx.api.put('/api/rentals/1').send(body())).status).toBe(409);
    expect((await ctx.api.put('/api/rentals/9999').send(body())).status).toBe(404);
  });

  test('PUT tidak bentrok dengan dirinya sendiri', async () => {
    const created = await ctx.api.post('/api/rentals').send(body());
    const res = await ctx.api.put(`/api/rentals/${created.body.data.id}`).send(body({ notes: 'ubah catatan' }));
    expect(res.status).toBe(200);
    expect(res.body.data.notes).toBe('ubah catatan');
  });

  test('DELETE: sewa berjalan ditolak, selesai/dipesan dapat dihapus, id tidak ada 404', async () => {
    expect((await ctx.api.delete('/api/rentals/5')).status).toBe(409);
    expect((await ctx.api.delete('/api/rentals/1')).status).toBe(200);
    expect((await ctx.api.get('/api/rentals/1')).status).toBe(404);
    expect((await ctx.api.delete('/api/rentals/9999')).status).toBe(404);
  });
});
