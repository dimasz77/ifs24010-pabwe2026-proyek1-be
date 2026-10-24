const { isValidDate } = require('../utils/dates');
const { validation } = require('../utils/httpError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validasi sederhana berbasis aturan.
 * rule: { type: 'string'|'int'|'date'|'enum'|'email', label, required, min, max, values, default }
 * Mengembalikan objek nilai yang sudah dibersihkan atau melempar HttpError 422.
 */
function validateBody(body, rules) {
  const errors = {};
  const value = {};
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  for (const [field, rule] of Object.entries(rules)) {
    const label = rule.label || field;
    let raw = src[field];
    if (typeof raw === 'string') raw = raw.trim();
    const empty = raw === undefined || raw === null || raw === '';

    if (empty) {
      if (rule.required) errors[field] = `${label} wajib diisi`;
      else value[field] = rule.default !== undefined ? rule.default : null;
      continue;
    }

    switch (rule.type) {
      case 'string': {
        if (typeof raw !== 'string') errors[field] = `${label} harus berupa teks`;
        else if (rule.min && raw.length < rule.min) errors[field] = `${label} minimal ${rule.min} karakter`;
        else if (rule.max && raw.length > rule.max) errors[field] = `${label} maksimal ${rule.max} karakter`;
        else if (rule.pattern && !rule.pattern.test(raw)) errors[field] = rule.patternMessage || `${label} tidak valid`;
        else value[field] = raw;
        break;
      }
      case 'email': {
        if (typeof raw !== 'string' || !EMAIL_RE.test(raw)) errors[field] = `${label} tidak valid`;
        else value[field] = raw.toLowerCase();
        break;
      }
      case 'int': {
        const n = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isInteger(n)) errors[field] = `${label} harus berupa bilangan bulat`;
        else if (rule.min !== undefined && n < rule.min) errors[field] = `${label} minimal ${rule.min}`;
        else if (rule.max !== undefined && n > rule.max) errors[field] = `${label} maksimal ${rule.max}`;
        else value[field] = n;
        break;
      }
      case 'date': {
        if (!isValidDate(raw)) errors[field] = `${label} harus berformat YYYY-MM-DD dan valid`;
        else value[field] = raw;
        break;
      }
      case 'enum': {
        if (!rule.values.includes(raw)) errors[field] = `${label} harus salah satu dari: ${rule.values.join(', ')}`;
        else value[field] = raw;
        break;
      }
      default:
        value[field] = raw;
    }
  }

  if (Object.keys(errors).length) throw validation(errors);
  return value;
}

module.exports = { validateBody };
