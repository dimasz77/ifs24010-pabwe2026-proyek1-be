const { buildApp, validCustomer } = require('../helpers');

describe('API /api/customers', () => {
  let ctx;
  beforeEach(() => { ctx = buildApp(); });
  afterEach(() => ctx.db.close());

  test('GET daftar + pencarian nama', async () => {
    const all = await ctx.api.get('/api/customers');
    expect(all.body.meta.total).toBe(9);
    const q = await ctx.api.get('/api/customers?q=weber');
    expect(q.body.data).toHaveLength(1);
    expect(q.body.data[0].full_name).toBe('Lukas Weber');
  });

  test('CRUD lengkap', async () => {
    const created = await ctx.api.post('/api/customers').send(validCustomer());
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    const upd = await ctx.api.put(`/api/customers/${id}`).send(validCustomer({ full_name: 'Nama Baru' }));
    expect(upd.status).toBe(200);
    expect(upd.body.data.full_name).toBe('Nama Baru');

    const detail = await ctx.api.get(`/api/customers/${id}`);
    expect(detail.body.data.rentals).toEqual([]);

    expect((await ctx.api.delete(`/api/customers/${id}`)).status).toBe(200);
    expect((await ctx.api.get(`/api/customers/${id}`)).status).toBe(404);
  });

  test('validasi: kosong, email salah, telepon salah', async () => {
    const empty = await ctx.api.post('/api/customers').send({});
    expect(empty.status).toBe(422);
    const bad = await ctx.api.post('/api/customers').send(validCustomer({ email: 'bukan-email', phone: 'abc' }));
    expect(bad.status).toBe(422);
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(['email', 'phone']));
  });

  test('telepon dan KTP duplikat -> 409', async () => {
    const dupPhone = await ctx.api.post('/api/customers').send(validCustomer({ phone: '0812 3000 0101' }));
    expect(dupPhone.status).toBe(409);
    expect(dupPhone.body.error.details.phone).toBeDefined();
    const dupId = await ctx.api.post('/api/customers').send(validCustomer({ id_number: 'C01X00T47' }));
    expect(dupId.status).toBe(409);
  });

  test('regresi: nomor telepon sama dengan format berbeda dianggap duplikat dan disimpan ternormalisasi', async () => {
    const dup = await ctx.api.post('/api/customers').send(validCustomer({ phone: '0812-3000-0101' }));
    expect(dup.status).toBe(409);
    const ok = await ctx.api.post('/api/customers').send(validCustomer({ phone: '+62 811-2222-3333' }));
    expect(ok.status).toBe(201);
    expect(ok.body.data.phone).toBe('+6281122223333');
  });

  test('hapus pelanggan yang punya sewa -> 409; id tidak ada -> 404', async () => {
    expect((await ctx.api.delete('/api/customers/1')).status).toBe(409);
    expect((await ctx.api.delete('/api/customers/9999')).status).toBe(404);
  });
});
