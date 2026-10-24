/** Normalisasi nomor telepon: hapus spasi, strip, kurung, dan titik; pertahankan "+" di awal. */
function normalizePhone(phone) {
  const raw = String(phone).trim();
  const plus = raw.startsWith('+') ? '+' : '';
  return plus + raw.replace(/\D/g, '');
}
module.exports = { normalizePhone };
