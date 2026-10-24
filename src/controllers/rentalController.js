const model = require('../models/rentalModel');
const service = require('../services/rentalService');
const { ok } = require('./response');
const { notFound, validation } = require('../utils/httpError');
const { parsePage, buildMeta, parseId } = require('../utils/pagination');
const { validateBody } = require('../validators/validate');
const { rentalRules, quoteRules, statusRules, RENTAL_STATUS } = require('../validators/schemas');
const { today } = require('../utils/dates');

const db = (req) => req.app.locals.db;
const cfg = (req) => req.app.locals.config;

exports.list = (req, res) => {
  const q = req.query;
  const filters = {};
  if (q.status) {
    if (!RENTAL_STATUS.includes(q.status)) throw validation({ status: 'Status tidak valid' });
    filters.status = q.status;
  }
  if (q.q) filters.q = String(q.q).trim();
  if (q.motorcycle_id) filters.motorcycle_id = parseId(q.motorcycle_id);
  if (q.customer_id) filters.customer_id = parseId(q.customer_id);
  if (q.overdue === 'true') filters.overdue = true;
  const page = parsePage(q, 10);
  const { rows, total } = model.list(db(req), filters, page, today());
  ok(res, rows, buildMeta(page, total));
};

exports.get = (req, res) => {
  const row = model.findById(db(req), parseId(req.params.id), today());
  if (!row) throw notFound('Data sewa');
  ok(res, row);
};

exports.quote = (req, res) => {
  const data = validateBody(req.query, quoteRules);
  ok(res, service.getQuote(db(req), data));
};

exports.create = (req, res) => {
  const id = service.createRental(db(req), validateBody(req.body, rentalRules));
  ok(res, model.findById(db(req), id, today()), null, 201);
};

exports.update = (req, res) => {
  const id = parseId(req.params.id);
  service.updateRental(db(req), id, validateBody(req.body, rentalRules));
  ok(res, model.findById(db(req), id, today()));
};

exports.changeStatus = (req, res) => {
  const id = parseId(req.params.id);
  const data = validateBody(req.body, statusRules);
  service.changeStatus(db(req), id, data, { lateFeeMultiplier: cfg(req).lateFeeMultiplier });
  ok(res, model.findById(db(req), id, today()));
};

exports.remove = (req, res) => {
  const id = parseId(req.params.id);
  service.deleteRental(db(req), id);
  ok(res, { id });
};
