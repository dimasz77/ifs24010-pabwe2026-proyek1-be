const DAY_MS = 86400000;

function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Selisih hari (b - a) untuk tanggal 'YYYY-MM-DD'. */
function diffDays(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

function addDays(s, n) {
  return new Date(Date.parse(`${s}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Tanggal hari ini menurut WIB (UTC+7), sesuai lokasi Samosir. */
function today(now = Date.now()) {
  return new Date(now + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = { isValidDate, diffDays, addDays, today };
