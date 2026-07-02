export const DEFAULT_CLINIC_TIMEZONE = 'Asia/Tashkent';

/** Today's date in the given timezone, formatted YYYY-MM-DD (en-CA yields ISO order). */
export const getClinicToday = (timeZone: string = DEFAULT_CLINIC_TIMEZONE): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

/** Adds n days to a YYYY-MM-DD string. UTC math is used purely to derive the calendar date. */
export const addDays = (dateStr: string, n: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

/** True only for a well-formed YYYY-MM-DD that is also a real calendar date. */
export const isValidDateKey = (dateStr: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
