const { HttpError } = require('./httpError');

function parsePage(query, defaultLimit = 10) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  limit = Math.min(limit, 100);
  return { page, limit, offset: (page - 1) * limit };
}

function buildMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'INVALID_ID', 'ID harus berupa bilangan bulat positif');
  }
  return id;
}

module.exports = { parsePage, buildMeta, parseId };
