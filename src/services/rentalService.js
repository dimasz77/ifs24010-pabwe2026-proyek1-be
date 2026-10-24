const motorModel = require('../models/motorcycleModel');
const customerModel = require('../models/customerModel');
const locationModel = require('../models/locationModel');
const rentalModel = require('../models/rentalModel');
const { HttpError, notFound, conflict, validation } = require('../utils/httpError');
const { diffDays, today: todayFn } = require('../utils/dates');
const { computeQuote, computeLateFee, MAX_RENTAL_DAYS } = require('../utils/pricing');

function assertDateRange(start, end) {
  const days = diffDays(start, end);
  if (days < 1) throw validation({ end_date: 'Tanggal kembali harus setelah tanggal mulai' });
  if (days > MAX_RENTAL_DAYS) throw validation({ end_date: `Lama sewa maksimal ${MAX_RENTAL_DAYS} hari per transaksi` });
}

function assertReferences(db, d) {
  const errors = {};
  const motor = motorModel.findRaw(db, d.motorcycle_id);
  if (!motor) errors.motorcycle_id = 'Motor tidak ditemukan';
  if (!customerModel.findById(db, d.customer_id)) errors.customer_id = 'Pelanggan tidak ditemukan';
  if (!locationModel.findById(db, d.pickup_location_id)) errors.pickup_location_id = 'Lokasi jemput tidak ditemukan';
  if (Object.keys(errors).length) throw validation(errors);
  return motor;
}

function assertAvailable(db, motor, start, end, excludeId, today) {
  if (motor.status !== 'tersedia') {
    throw conflict('MOTOR_UNAVAILABLE', `${motor.brand} ${motor.model} sedang dalam perawatan dan tidak dapat disewa`);
  }
  const clash = rentalModel.findConflict(db, motor.id, start, end, excludeId, today);
  if (clash) {
    throw conflict('BOOKING_CONFLICT',
      `Motor sudah dipesan pada ${clash.start_date} s/d ${clash.end_date} (${clash.code}). Pilih tanggal atau motor lain`);
  }
}

function getQuote(db, { motorcycle_id, start_date, end_date }) {
  const motor = motorModel.findRaw(db, motorcycle_id);
  if (!motor) throw notFound('Motor');
  assertDateRange(start_date, end_date);
  return { motorcycle_id, start_date, end_date, ...computeQuote(motor.price_per_day, diffDays(start_date, end_date)) };
}

function createRental(db, data, { now = Date.now() } = {}) {
  const today = todayFn(now);
  assertDateRange(data.start_date, data.end_date);
  if (data.start_date < today) throw validation({ start_date: 'Tanggal mulai tidak boleh sebelum hari ini' });
  const motor = assertReferences(db, data);

  return db.transaction(() => {
    assertAvailable(db, motor, data.start_date, data.end_date, null, today);
    const q = computeQuote(motor.price_per_day, diffDays(data.start_date, data.end_date));
    const code = `RMS-${today.slice(0, 4)}-${String(rentalModel.nextSequence(db)).padStart(4, '0')}`;
    return rentalModel.insert(db, {
      ...data, code, days: q.days, price_per_day: q.price_per_day, subtotal: q.subtotal,
      discount_amount: q.discount_amount, total_price: q.total_price,
      late_fee: 0, returned_date: null, status: 'dipesan',
    });
  })();
}

function updateRental(db, id, data, { now = Date.now() } = {}) {
  const today = todayFn(now);
  const current = rentalModel.findRaw(db, id);
  if (!current) throw notFound('Data sewa');
  if (current.status !== 'dipesan') {
    throw conflict('INVALID_STATE', 'Hanya sewa berstatus "dipesan" yang dapat diubah');
  }
  assertDateRange(data.start_date, data.end_date);
  if (data.start_date !== current.start_date && data.start_date < today) {
    throw validation({ start_date: 'Tanggal mulai tidak boleh sebelum hari ini' });
  }
  const motor = assertReferences(db, data);

  db.transaction(() => {
    assertAvailable(db, motor, data.start_date, data.end_date, id, today);
    const q = computeQuote(motor.price_per_day, diffDays(data.start_date, data.end_date));
    rentalModel.update(db, id, {
      ...data, days: q.days, price_per_day: q.price_per_day, subtotal: q.subtotal,
      discount_amount: q.discount_amount, total_price: q.total_price,
    });
  })();
}

function changeStatus(db, id, { action, returned_date }, { now = Date.now(), lateFeeMultiplier = 1.5 } = {}) {
  const today = todayFn(now);
  const r = rentalModel.findRaw(db, id);
  if (!r) throw notFound('Data sewa');

  if (action === 'start') {
    if (r.status !== 'dipesan') throw conflict('INVALID_STATE', 'Hanya sewa berstatus "dipesan" yang dapat dimulai');
    if (r.start_date > today) throw conflict('TOO_EARLY', `Sewa baru dapat dimulai pada ${r.start_date}`);
    const motor = motorModel.findRaw(db, r.motorcycle_id);
    if (motor.status !== 'tersedia') throw conflict('MOTOR_UNAVAILABLE', 'Motor sedang dalam perawatan');
    rentalModel.setStatus(db, id, { status: 'berjalan' });
  } else if (action === 'return') {
    if (r.status !== 'berjalan') throw conflict('INVALID_STATE', 'Hanya sewa berstatus "berjalan" yang dapat diselesaikan');
    const returned = returned_date || today;
    if (returned < r.start_date) throw validation({ returned_date: 'Tanggal pengembalian tidak boleh sebelum tanggal mulai' });
    if (returned > today) throw validation({ returned_date: 'Tanggal pengembalian tidak boleh di masa depan' });
    const lateDays = Math.max(0, diffDays(r.end_date, returned));
    rentalModel.setStatus(db, id, {
      status: 'selesai', returned_date: returned,
      late_fee: computeLateFee(r.price_per_day, lateDays, lateFeeMultiplier),
    });
  } else if (action === 'cancel') {
    if (r.status !== 'dipesan') throw conflict('INVALID_STATE', 'Hanya sewa berstatus "dipesan" yang dapat dibatalkan');
    rentalModel.setStatus(db, id, { status: 'dibatalkan' });
  } else {
    throw new HttpError(400, 'INVALID_ACTION', 'Aksi tidak dikenal');
  }
}

function deleteRental(db, id) {
  const r = rentalModel.findRaw(db, id);
  if (!r) throw notFound('Data sewa');
  if (r.status === 'berjalan') {
    throw conflict('INVALID_STATE', 'Sewa yang sedang berjalan tidak dapat dihapus. Selesaikan terlebih dahulu');
  }
  rentalModel.remove(db, id);
}

module.exports = { getQuote, createRental, updateRental, changeStatus, deleteRental };
