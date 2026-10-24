const locationModel = require('../models/locationModel');
const { ok } = require('./response');

exports.list = (req, res) => ok(res, locationModel.list(req.app.locals.db));
