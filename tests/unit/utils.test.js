const { isValidDate, diffDays, addDays, today } = require('../../src/utils/dates');
const { normalizePlate } = require('../../src/utils/plate');
const { validateBody } = require('../../src/validators/validate');
const { HttpError } = require('../../src/utils/httpError');
const { parsePage, buildMeta, parseId } = require('../../src/utils/pagination');

describe('dates', () => {
  test('isValidDate', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('28-02-2026')).toBe(false);
    expect(isValidDate(null)).toBe(false);
  });
  test('diffDays dan addDays', () => {
    expect(diffDays('2026-10-01', '2026-10-04')).toBe(3);
    expect(diffDays('2026-10-04', '2026-10-01')).toBe(-3);
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
  test('today memakai WIB (UTC+7)', () => {
    expect(today(Date.parse('2026-10-21T20:00:00Z'))).toBe('2026-10-22');
    expect(today(Date.parse('2026-10-21T10:00:00Z'))).toBe('2026-10-21');
  });
});

describe('normalizePlate', () => {
  test('menormalkan format', () => {
    expect(normalizePlate('bb1234ab')).toBe('BB 1234 AB');
    expect(normalizePlate(' bb  1234  ab ')).toBe('BB 1234 AB');
    expect(normalizePlate('BB 12')).toBe('BB 12');
  });
});

describe('validateBody', () => {
  const rules = {
    name: { type: 'string', label: 'Nama', required: true, min: 3 },
    age: { type: 'int', label: 'Umur', required: true, min: 1, max: 120 },
    mail: { type: 'email', label: 'Email', required: false },
    kind: { type: 'enum', label: 'Jenis', required: false, values: ['a', 'b'], default: 'a' },
  };
  test('lolos dan membersihkan nilai', () => {
    expect(validateBody({ name: '  Budi ', age: '30' }, rules)).toEqual({ name: 'Budi', age: 30, mail: null, kind: 'a' });
  });
  test('mengumpulkan semua error', () => {
    try {
      validateBody({ name: 'Bu', age: 'abc', mail: 'x', kind: 'z' }, rules);
      throw new Error('seharusnya gagal');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpError);
      expect(e.status).toBe(422);
      expect(Object.keys(e.details).sort()).toEqual(['age', 'kind', 'mail', 'name']);
    }
  });
  test('body bukan objek dianggap kosong', () => {
    expect(() => validateBody(null, rules)).toThrow(HttpError);
    expect(() => validateBody([1, 2], rules)).toThrow(HttpError);
  });
});

describe('pagination', () => {
  test('parsePage default dan batas', () => {
    expect(parsePage({}, 10)).toEqual({ page: 1, limit: 10, offset: 0 });
    expect(parsePage({ page: '3', limit: '500' }, 10)).toEqual({ page: 3, limit: 100, offset: 200 });
    expect(parsePage({ page: '-1', limit: 'x' }, 5)).toEqual({ page: 1, limit: 5, offset: 0 });
  });
  test('buildMeta', () => {
    expect(buildMeta({ page: 1, limit: 10 }, 25).totalPages).toBe(3);
    expect(buildMeta({ page: 1, limit: 10 }, 0).totalPages).toBe(1);
  });
  test('parseId menolak nilai tidak valid', () => {
    expect(parseId('5')).toBe(5);
    expect(() => parseId('abc')).toThrow(HttpError);
    expect(() => parseId('0')).toThrow(HttpError);
  });
});
