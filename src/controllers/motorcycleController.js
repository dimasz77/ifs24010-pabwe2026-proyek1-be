const model = require('../models/motorcycleModel');
const locationModel = require('../models/locationModel');
const { ok } = require('./response');
const { notFound, conflict, validation } = require('../utils/httpError');
const { parsePage, buildMeta, parseId } = require('../utils/pagination');
const { validateBody } = require('../validators/validate');
const { motorcycleRules, MOTOR_TYPES, MOTOR_STATUS } = require('../validators/schemas');
const { normalizePlate } = require('../utils/plate');
const { isValidDate, today } = require('../utils/dates');

const db = (req) => req.app.locals.db;

function prepare(req) {
  const data = validateBody(req.body, motorcycleRules);
  data.plate = normalizePlate(data.plate);
  if (!locationModel.findById(db(req), data.location_id)) {
    throw validation({ location_id: 'Lokasi tidak ditemukan' });
  }
  return data;
}

exports.list = (req, res) => {
  const q = req.query;
  const filters = { today: today(), sort: q.sort };
  if (q.q) filters.q = String(q.q).trim();
  if (q.type) {
    if (!MOTOR_TYPES.includes(q.type)) throw validation({ type: 'Tipe tidak valid' });
    filters.type = q.type;
  }
  if (q.status) {
    if (!MOTOR_STATUS.includes(q.status)) throw validation({ status: 'Status tidak valid' });
    filters.status = q.status;
  }
  if (q.location_id) filters.location_id = parseId(q.location_id);
  if (q.available_from || q.available_to) {
    if (!isValidDate(q.available_from) || !isValidDate(q.available_to) || q.available_to <= q.available_from) {
      throw validation({ available_from: 'available_from dan available_to harus tanggal valid (YYYY-MM-DD) dan available_to setelah available_from' });
    }
    filters.available_from = q.available_from;
    filters.available_to = q.available_to;
  }
  const page = parsePage(q, 12);
  const { rows, total } = model.list(db(req), filters, page);
  ok(res, rows, buildMeta(page, total));
};

exports.get = (req, res) => {
  const row = model.findById(db(req), parseId(req.params.id));
  if (!row) throw notFound('Motor');
  ok(res, row);
};

exports.create = (req, res) => {
  const id = model.insert(db(req), prepare(req));
  ok(res, model.findById(db(req), id), null, 201);
};

exports.update = (req, res) => {
  const id = parseId(req.params.id);
  if (!model.findRaw(db(req), id)) throw notFound('Motor');
  model.update(db(req), id, prepare(req));
  ok(res, model.findById(db(req), id));
};

exports.remove = (req, res) => {
  const id = parseId(req.params.id);
  if (!model.findRaw(db(req), id)) throw notFound('Motor');
  const n = model.countRentals(db(req), id);
  if (n > 0) {
    throw conflict('HAS_HISTORY',
      `Motor memiliki ${n} data sewa sehingga tidak dapat dihapus. Ubah status menjadi "perawatan" bila tidak digunakan`);
  }
  model.remove(db(req), id);
  ok(res, { id });
};
