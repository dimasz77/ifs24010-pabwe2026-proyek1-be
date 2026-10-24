const model = require('../models/dashboardModel');
const { ok } = require('./response');
const { today } = require('../utils/dates');

exports.summary = (req, res) => ok(res, { today: today(), ...model.summary(req.app.locals.db, today()) });
