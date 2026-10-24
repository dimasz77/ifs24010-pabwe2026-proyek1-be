const { addDays, diffDays, today: todayFn } = require('../utils/dates');
const { computeQuote, computeLateFee } = require('../utils/pricing');
const { normalizePhone } = require('../utils/phone');

const LOCATIONS = [
  ['Dermaga Tomok', 'Tomok', 'Dekat dermaga kapal feri dari Ajibata; cocok untuk wisatawan yang baru tiba.'],
  ['Tuktuk Siadong', 'Tuktuk', 'Kawasan penginapan dan kafe di Tuktuk; pusat wisatawan.'],
  ['Ambarita', 'Ambarita', 'Dekat kawasan Batu Kursi Siallagan dan objek wisata budaya.'],
  ['Pangururan', 'Pangururan', 'Ibu kota Kabupaten Samosir; dekat pasar dan Jembatan Tano Ponggol.'],
  ['Simanindo', 'Simanindo', 'Kawasan utara Samosir; dekat Museum Huta Bolon.'],
];

// [plat, merek, model, tipe, cc, tahun, warna, tarif, status, lokasi]
const MOTORS = [
  ['BB 3101 AA', 'Honda', 'Beat', 'matic', 110, 2022, 'Putih', 80000, 'tersedia', 'Dermaga Tomok'],
  ['BB 3102 AB', 'Honda', 'Scoopy', 'matic', 110, 2023, 'Merah', 90000, 'tersedia', 'Tuktuk Siadong'],
  ['BB 3103 AC', 'Honda', 'Vario 125', 'matic', 125, 2022, 'Hitam', 100000, 'tersedia', 'Tuktuk Siadong'],
  ['BB 3104 AD', 'Honda', 'Vario 160', 'matic', 160, 2024, 'Abu-abu', 130000, 'tersedia', 'Ambarita'],
  ['BB 3105 AE', 'Yamaha', 'NMAX 155', 'matic', 155, 2023, 'Biru', 150000, 'tersedia', 'Dermaga Tomok'],
  ['BB 3106 AF', 'Yamaha', 'Aerox 155', 'matic', 155, 2022, 'Hitam', 140000, 'tersedia', 'Pangururan'],
  ['BB 3107 AG', 'Honda', 'PCX 160', 'matic', 160, 2024, 'Putih', 170000, 'tersedia', 'Tuktuk Siadong'],
  ['BB 3108 AH', 'Yamaha', 'Fino 125', 'matic', 125, 2021, 'Merah', 85000, 'tersedia', 'Ambarita'],
  ['BB 3109 AJ', 'Honda', 'Supra X 125', 'bebek', 125, 2020, 'Hitam', 75000, 'tersedia', 'Pangururan'],
  ['BB 3110 AK', 'Yamaha', 'Jupiter Z1', 'bebek', 115, 2019, 'Biru', 70000, 'tersedia', 'Simanindo'],
  ['BB 3111 AL', 'Honda', 'Revo', 'bebek', 110, 2021, 'Merah', 70000, 'tersedia', 'Simanindo'],
  ['BB 3112 AM', 'Kawasaki', 'KLX 150', 'trail', 150, 2022, 'Hijau', 200000, 'tersedia', 'Pangururan'],
  ['BB 3113 AN', 'Honda', 'CRF150L', 'trail', 150, 2023, 'Merah', 220000, 'tersedia', 'Dermaga Tomok'],
  ['BB 3114 AP', 'Yamaha', 'WR 155 R', 'trail', 155, 2023, 'Biru', 250000, 'tersedia', 'Simanindo'],
  ['BB 3115 AQ', 'Honda', 'CB150R', 'sport', 150, 2022, 'Hitam', 180000, 'perawatan', 'Ambarita'],
];

// [nama, telepon, email, no KTP/paspor, no SIM, asal] -- seluruh data fiktif
const CUSTOMERS = [
  ['Rudi Hutapea', '0812 3000 0101', 'rudi.hutapea@example.com', '1217010101900001', 'SIM-C-9001', 'Medan'],
  ['Sinta Br. Sitorus', '0813 3000 0202', 'sinta.sitorus@example.com', '1217020202950002', 'SIM-C-9002', 'Balige'],
  ['Daniel Simanjuntak', '0821 3000 0303', null, '1271030303980003', 'SIM-C-9003', 'Pematangsiantar'],
  ['Maria Sianturi', '0822 3000 0404', 'maria.sianturi@example.com', '1275040404000004', 'SIM-C-9004', 'Jakarta'],
  ['Ahmad Fauzi', '0852 3000 0505', 'ahmad.fauzi@example.com', '1271050505920005', 'SIM-C-9005', 'Medan'],
  ['Putri Ayu Lestari', '0857 3000 0606', 'putri.ayu@example.com', '3173060606010006', 'SIM-C-9006', 'Jakarta'],
  ['Lukas Weber', '+49 151 3000 0707', 'lukas.weber@example.com', 'C01X00T47', 'DE-FS-770707', 'Jerman'],
  ['Emma Laurent', '+33 6 3000 0808', 'emma.laurent@example.com', '19AB00808', 'FR-PC-880808', 'Prancis'],
  ['Kevin Tambunan', '0878 3000 0909', null, '1217090909020009', 'SIM-C-9009', 'Pangururan'],
];

function seedLocations(db) {
  const stmt = db.prepare('INSERT OR IGNORE INTO pickup_locations (name, area, description) VALUES (?, ?, ?)');
  db.transaction(() => LOCATIONS.forEach(([name, area, desc]) => stmt.run(name, area, desc)))();
}

/**
 * Mengisi data contoh HANYA bila motor, pelanggan, dan sewa masih kosong,
 * sehingga aman dipanggil berulang tanpa menimbulkan duplikasi.
 */
function seedIfEmpty(db, now = Date.now()) {
  seedLocations(db);
  const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
  if (count('motorcycles') || count('customers') || count('rentals')) return { seeded: false };

  const today = todayFn(now);
  const loc = Object.fromEntries(db.prepare('SELECT id, name FROM pickup_locations').all().map((l) => [l.name, l.id]));

  db.transaction(() => {
    const insMotor = db.prepare(`INSERT INTO motorcycles
      (plate, brand, model, type, engine_cc, year, color, price_per_day, status, location_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    MOTORS.forEach((m) => insMotor.run(...m.slice(0, 9), loc[m[9]]));

    const insCust = db.prepare(`INSERT INTO customers (full_name, phone, email, id_number, sim_number, origin)
      VALUES (?, ?, ?, ?, ?, ?)`);
    CUSTOMERS.forEach((c) => insCust.run(c[0], normalizePhone(c[1]), ...c.slice(2)));

    const motorId = (plate) => db.prepare('SELECT id, price_per_day, location_id FROM motorcycles WHERE plate = ?').get(plate);
    const custId = (name) => db.prepare('SELECT id FROM customers WHERE full_name = ?').get(name).id;
    const insRental = db.prepare(`INSERT INTO rentals
      (code, motorcycle_id, customer_id, pickup_location_id, start_date, end_date, returned_date, days,
       price_per_day, subtotal, discount_amount, total_price, late_fee, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // [plat, pelanggan, mulaiOffset, akhirOffset, kembaliOffset|null, status, catatan]
    const rentals = [
      ['BB 3101 AA', 'Rudi Hutapea', -20, -17, -17, 'selesai', null],
      ['BB 3102 AB', 'Emma Laurent', -14, -10, -10, 'selesai', 'Termasuk 2 helm'],
      ['BB 3105 AE', 'Lukas Weber', -9, -6, -5, 'selesai', 'Terlambat mengembalikan 1 hari'],
      ['BB 3109 AJ', 'Kevin Tambunan', -7, -5, -5, 'selesai', null],
      ['BB 3103 AC', 'Putri Ayu Lestari', -2, 2, null, 'berjalan', 'Keliling Pulau Samosir'],
      ['BB 3112 AM', 'Daniel Simanjuntak', -6, -1, null, 'berjalan', 'Jalur Pangururan - Simanindo'],
      ['BB 3104 AD', 'Maria Sianturi', -1, 4, null, 'berjalan', null],
      ['BB 3107 AG', 'Ahmad Fauzi', 1, 4, null, 'dipesan', 'Dijemput di Tuktuk Siadong'],
      ['BB 3113 AN', 'Sinta Br. Sitorus', 3, 10, null, 'dipesan', 'Sewa mingguan'],
      ['BB 3106 AF', 'Emma Laurent', 2, 3, null, 'dibatalkan', 'Dibatalkan pelanggan'],
    ];

    rentals.forEach(([plate, cust, s, e, ret, status, notes], i) => {
      const m = motorId(plate);
      const start = addDays(today, s);
      const end = addDays(today, e);
      const returned = ret === null ? null : addDays(today, ret);
      const q = computeQuote(m.price_per_day, diffDays(start, end));
      const late = returned ? computeLateFee(m.price_per_day, Math.max(0, diffDays(end, returned)), 1.5) : 0;
      insRental.run(`RMS-${today.slice(0, 4)}-${String(i + 1).padStart(4, '0')}`, m.id, custId(cust), m.location_id,
        start, end, returned, q.days, q.price_per_day, q.subtotal, q.discount_amount, q.total_price, late, status, notes);
    });
  })();

  return { seeded: true };
}

module.exports = { seedIfEmpty, seedLocations, LOCATIONS, MOTORS, CUSTOMERS };
