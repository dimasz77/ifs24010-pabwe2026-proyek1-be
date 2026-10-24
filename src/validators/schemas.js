const MOTOR_TYPES = ['matic', 'bebek', 'sport', 'trail'];
const MOTOR_STATUS = ['tersedia', 'perawatan'];
const RENTAL_ACTIONS = ['start', 'return', 'cancel'];
const RENTAL_STATUS = ['dipesan', 'berjalan', 'selesai', 'dibatalkan'];

const currentYear = new Date().getFullYear();

const motorcycleRules = {
  plate: {
    type: 'string', label: 'Plat nomor', required: true, min: 4, max: 12,
    pattern: /^[A-Za-z]{1,2}\s?\d{1,4}\s?[A-Za-z]{0,3}$/,
    patternMessage: 'Plat nomor tidak valid (contoh: BB 1234 AB)',
  },
  brand: { type: 'string', label: 'Merek', required: true, min: 2, max: 40 },
  model: { type: 'string', label: 'Model', required: true, min: 1, max: 60 },
  type: { type: 'enum', label: 'Tipe', required: true, values: MOTOR_TYPES },
  engine_cc: { type: 'int', label: 'Kapasitas mesin (cc)', required: true, min: 50, max: 1000 },
  year: { type: 'int', label: 'Tahun', required: true, min: 2000, max: currentYear + 1 },
  color: { type: 'string', label: 'Warna', required: false, max: 30 },
  price_per_day: { type: 'int', label: 'Tarif per hari', required: true, min: 20000, max: 2000000 },
  status: { type: 'enum', label: 'Status', required: false, values: MOTOR_STATUS, default: 'tersedia' },
  location_id: { type: 'int', label: 'Lokasi', required: true, min: 1 },
  notes: { type: 'string', label: 'Catatan', required: false, max: 300 },
};

const customerRules = {
  full_name: { type: 'string', label: 'Nama lengkap', required: true, min: 3, max: 80 },
  phone: {
    type: 'string', label: 'Nomor telepon', required: true, min: 8, max: 20,
    pattern: /^\+?[0-9][0-9\s-]{6,18}$/, patternMessage: 'Nomor telepon tidak valid',
  },
  email: { type: 'email', label: 'Email', required: false },
  id_number: { type: 'string', label: 'Nomor KTP/Paspor', required: true, min: 5, max: 30 },
  sim_number: { type: 'string', label: 'Nomor SIM C', required: true, min: 5, max: 30 },
  origin: { type: 'string', label: 'Asal', required: false, max: 60 },
};

const rentalRules = {
  motorcycle_id: { type: 'int', label: 'Motor', required: true, min: 1 },
  customer_id: { type: 'int', label: 'Pelanggan', required: true, min: 1 },
  pickup_location_id: { type: 'int', label: 'Lokasi jemput', required: true, min: 1 },
  start_date: { type: 'date', label: 'Tanggal mulai', required: true },
  end_date: { type: 'date', label: 'Tanggal kembali', required: true },
  notes: { type: 'string', label: 'Catatan', required: false, max: 300 },
};

const quoteRules = {
  motorcycle_id: rentalRules.motorcycle_id,
  start_date: rentalRules.start_date,
  end_date: rentalRules.end_date,
};

const statusRules = {
  action: { type: 'enum', label: 'Aksi', required: true, values: RENTAL_ACTIONS },
  returned_date: { type: 'date', label: 'Tanggal pengembalian', required: false },
};

const registerRules = {
  name: { type: 'string', label: 'Nama', required: true, min: 3, max: 80 },
  username: {
    type: 'string', label: 'Username', required: true, min: 3, max: 30,
    pattern: /^[A-Za-z0-9_.-]+$/, patternMessage: 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip',
  },
  email: { type: 'email', label: 'Email', required: false },
  password: { type: 'string', label: 'Kata sandi', required: true, min: 6, max: 72 },
};

// 'username' pada login boleh berisi username atau email
const loginRules = {
  username: { type: 'string', label: 'Username', required: true, max: 120 },
  password: { type: 'string', label: 'Kata sandi', required: true, max: 72 },
};

module.exports = {
  registerRules, loginRules,
  MOTOR_TYPES, MOTOR_STATUS, RENTAL_ACTIONS, RENTAL_STATUS,
  motorcycleRules, customerRules, rentalRules, quoteRules, statusRules,
};
