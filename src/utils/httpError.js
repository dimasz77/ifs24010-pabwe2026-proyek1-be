class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
const notFound = (what) => new HttpError(404, 'NOT_FOUND', `${what} tidak ditemukan`);
const conflict = (code, message) => new HttpError(409, code, message);
const validation = (details, message = 'Data yang dikirim tidak valid') =>
  new HttpError(422, 'VALIDATION_ERROR', message, details);

module.exports = { HttpError, notFound, conflict, validation };
