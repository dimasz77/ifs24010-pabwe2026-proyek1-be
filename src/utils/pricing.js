/** Batas lama sewa dalam satu transaksi (hari). */
const MAX_RENTAL_DAYS = 90;

/** Diskon bertingkat berdasarkan lama sewa (hari). Urut dari yang terbesar. */
const DISCOUNT_TIERS = [
  { minDays: 14, percent: 15 },
  { minDays: 7, percent: 10 },
];

function discountPercentFor(days) {
  const tier = DISCOUNT_TIERS.find((t) => days >= t.minDays);
  return tier ? tier.percent : 0;
}

function computeQuote(pricePerDay, days) {
  if (!Number.isInteger(pricePerDay) || pricePerDay < 0) throw new RangeError('Tarif harian tidak valid');
  if (!Number.isInteger(days) || days < 1) throw new RangeError('Lama sewa minimal 1 hari');
  const subtotal = pricePerDay * days;
  const discountPercent = discountPercentFor(days);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  return {
    price_per_day: pricePerDay,
    days,
    subtotal,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    total_price: subtotal - discountAmount,
  };
}

function computeLateFee(pricePerDay, lateDays, multiplier) {
  if (!lateDays || lateDays <= 0) return 0;
  return Math.round(pricePerDay * lateDays * multiplier);
}

module.exports = { MAX_RENTAL_DAYS, DISCOUNT_TIERS, discountPercentFor, computeQuote, computeLateFee };
