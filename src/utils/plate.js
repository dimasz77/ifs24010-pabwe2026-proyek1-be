/** Normalisasi plat: huruf besar dan format 'BB 1234 AB'. */
function normalizePlate(plate) {
  const compact = String(plate).toUpperCase().replace(/\s+/g, '');
  const m = compact.match(/^([A-Z]{1,2})(\d{1,4})([A-Z]{0,3})$/);
  return m ? [m[1], m[2], m[3]].filter(Boolean).join(' ') : String(plate).toUpperCase().trim();
}
module.exports = { normalizePlate };
