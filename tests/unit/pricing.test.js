const { computeQuote, computeLateFee, discountPercentFor, MAX_RENTAL_DAYS } = require('../../src/utils/pricing');

describe('computeQuote', () => {
  test('tanpa diskon untuk sewa < 7 hari', () => {
    expect(computeQuote(100000, 3)).toEqual({
      price_per_day: 100000, days: 3, subtotal: 300000, discount_percent: 0, discount_amount: 0, total_price: 300000,
    });
  });
  test('diskon 10% untuk 7 hari', () => {
    const q = computeQuote(100000, 7);
    expect(q.discount_percent).toBe(10);
    expect(q.discount_amount).toBe(70000);
    expect(q.total_price).toBe(630000);
  });
  test('diskon 15% untuk 14 hari atau lebih', () => {
    expect(discountPercentFor(14)).toBe(15);
    expect(discountPercentFor(30)).toBe(15);
    expect(computeQuote(200000, 14).total_price).toBe(2380000);
  });
  test('batas 6 hari belum mendapat diskon', () => {
    expect(discountPercentFor(6)).toBe(0);
  });
  test('menolak hari < 1 atau bukan bilangan bulat', () => {
    expect(() => computeQuote(100000, 0)).toThrow(RangeError);
    expect(() => computeQuote(100000, 1.5)).toThrow(RangeError);
  });
});

describe('computeLateFee', () => {
  test('0 jika tidak terlambat', () => {
    expect(computeLateFee(100000, 0, 1.5)).toBe(0);
    expect(computeLateFee(100000, -2, 1.5)).toBe(0);
  });
  test('tarif harian x hari terlambat x pengali', () => {
    expect(computeLateFee(100000, 2, 1.5)).toBe(300000);
  });
});

test('batas maksimal sewa 90 hari', () => expect(MAX_RENTAL_DAYS).toBe(90));
