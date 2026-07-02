import { getClinicToday, addDays, isValidDateKey, DEFAULT_CLINIC_TIMEZONE } from '../../src/utils/date';

describe('utils/date', () => {
  it('adds days across month/year boundaries as strings', () => {
    expect(addDays('2026-07-02', 7)).toBe('2026-07-09');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('validates real calendar dates', () => {
    expect(isValidDateKey('2026-07-02')).toBe(true);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('2026-02-30')).toBe(false);
    expect(isValidDateKey('2026-7-2')).toBe(false);
  });

  it('returns today in the clinic timezone as YYYY-MM-DD', () => {
    const today = getClinicToday(DEFAULT_CLINIC_TIMEZONE);
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Asia/Tashkent (UTC+5) is never behind UTC, so its date is >= the UTC date.
    const utcDate = new Date().toISOString().slice(0, 10);
    expect(today >= utcDate).toBe(true);
  });
});
