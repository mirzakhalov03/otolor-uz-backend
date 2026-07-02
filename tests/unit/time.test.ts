import { timeToMinutes, minutesToTime, parseTimeRange, generateSlots } from '../../src/utils/time';

describe('utils/time', () => {
  it('converts HH:MM to minutes and back', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(600)).toBe('10:00');
  });

  it('parses a time range', () => {
    expect(parseTimeRange('09:00-12:00')).toEqual({
      start: '09:00', end: '12:00', startMin: 540, endMin: 720,
    });
  });

  it('generates 30-min slots, end-exclusive', () => {
    expect(generateSlots('09:00', '11:00')).toEqual(['09:00', '09:30', '10:00', '10:30']);
  });

  it('honors a custom step', () => {
    expect(generateSlots('09:00', '10:00', 15)).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });
});
