import {
  isValidWeeklySchedule,
  assertValidWeeklySchedule,
  assertScheduleWithinWindow,
} from '../../src/utils/schedule';

describe('utils/schedule', () => {
  it('accepts a valid date-keyed schedule', () => {
    expect(isValidWeeklySchedule({ '2026-07-03': '09:00-17:00' })).toBe(true);
  });

  it('rejects empty, non-object, and malformed schedules', () => {
    expect(isValidWeeklySchedule({})).toBe(false);
    expect(isValidWeeklySchedule(null)).toBe(false);
    expect(isValidWeeklySchedule({ Monday: '09:00-17:00' })).toBe(false);
    expect(isValidWeeklySchedule({ '2026-07-03': '9-5' })).toBe(false);
  });

  it('assertValidWeeklySchedule throws on bad time range', () => {
    expect(() => assertValidWeeklySchedule({ '2026-07-03': '25:00-26:00' })).toThrow();
  });

  it('assertScheduleWithinWindow rejects past and too-far dates relative to given today', () => {
    const today = '2026-07-02';
    expect(() => assertScheduleWithinWindow({ '2026-07-03': '09:00-17:00' }, today)).not.toThrow();
    expect(() => assertScheduleWithinWindow({ '2026-07-01': '09:00-17:00' }, today)).toThrow(/past/);
    expect(() => assertScheduleWithinWindow({ '2026-07-09': '09:00-17:00' }, today)).toThrow(/too far/);
  });
});
