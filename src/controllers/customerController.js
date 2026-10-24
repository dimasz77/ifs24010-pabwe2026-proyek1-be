const model = require('../models/customerModel');
const rentalModel = require('../models/rentalModel');
const { ok } = require('./response');
const { notFound, conflict } = require('../utils/httpError');
const { parsePage, buildMeta, parseId } = require('../utils/pagination');
const { validateBody } = require('../validators/validate');
const { customerRules } = require('../validators/schemas');
const { today } = require('../utils/dates');
const { normalizePhone } = require('../utils/phone');

function prepare(req) {
  const data = validateBody(req.body, customerRules);
  data.phone = normalizePhone(data.phone);
  return data;
}

const db = (req) => req.app.locals.db;

exports.list = (req, res) => {
  const page = parsePage(req.query, 10);
  const { rows, total } = model.list(db(req), { q: req.query.q ? String(req.query.q).trim() : '' }, page);
  ok(res, rows, buildMeta(page, total));
};

exports.get = (req, res) => {
  const id = parseId(req.params.id);
  const row = model.findById(db(req), id);
  if (!row) throw notFound('Pelanggan');
  const history = rentalModel.list(db(req), { customer_id: id }, { limit: 50, offset: 0 }, today()).rows;
  ok(res, { ...row, rentals: history });
};

exports.create = (req, res) => {
  const id = model.insert(db(req), prepare(req));
  ok(res, model.findById(db(req), id), null, 201);
};

exports.update = (req, res) => {
  const id = parseId(req.params.id);
  if (!model.findById(db(req), id)) throw notFound('Pelanggan');
  model.update(db(req), id, prepare(req));
  ok(res, model.findById(db(req), id));
};

exports.remove = (req, res) => {
  const id = parseId(req.params.id);
  const row = model.findById(db(req), id);
  if (!row) throw notFound('Pelanggan');
  if (row.rental_count > 0) {
    throw conflict('HAS_HISTORY', `Pelanggan memiliki ${row.rental_count} data sewa sehingga tidak dapat dihapus`);
  }
  model.remove(db(req), id);
  ok(res, { id });
};
