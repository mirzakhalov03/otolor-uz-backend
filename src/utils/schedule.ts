import { isValidDateKey, addDays } from './date';
import { AppError } from './AppError';

export const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RANGE_REGEX = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

export interface WeeklySchedule {
  [date: string]: string;
}

/** Pure structural check for the Mongoose model validator. */
export const isValidWeeklySchedule = (schedule: unknown): boolean => {
  if (!schedule || typeof schedule !== 'object') return false;
  const entries = Object.entries(schedule as Record<string, unknown>);
  if (entries.length === 0) return false;
  for (const [key, time] of entries) {
    if (!DATE_KEY_REGEX.test(key)) return false;
    if (typeof time !== 'string' || !TIME_RANGE_REGEX.test(time)) return false;
  }
  return true;
};

/** Throwing validator for the express-validator layer (messages surface to the client). */
export const assertValidWeeklySchedule = (schedule: Record<string, string>): true => {
  for (const [dateKey, time] of Object.entries(schedule)) {
    if (!DATE_KEY_REGEX.test(dateKey)) {
      throw new Error(`Invalid date key: ${dateKey}. Use YYYY-MM-DD format.`);
    }
    if (!TIME_RANGE_REGEX.test(time)) {
      throw new Error(`Invalid time range for ${dateKey}. Use "HH:MM-HH:MM" format.`);
    }
  }
  return true;
};

/** Ensures every key is a real date within [today, today+7) — caller supplies clinic-tz today. */
export const assertScheduleWithinWindow = (schedule: WeeklySchedule, today: string): void => {
  const maxDate = addDays(today, 7);
  for (const dateKey of Object.keys(schedule)) {
    if (!isValidDateKey(dateKey)) {
      throw new AppError(`Invalid date: ${dateKey}. Use YYYY-MM-DD format.`, 400);
    }
    if (dateKey < today) {
      throw new AppError(`Date ${dateKey} is in the past. Only future dates are allowed.`, 400);
    }
    if (dateKey >= maxDate) {
      throw new AppError(
        `Date ${dateKey} is too far ahead. You can only set availability for the next 7 days.`,
        400
      );
    }
  }
};
