export const timeToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export interface TimeRange {
  start: string;
  end: string;
  startMin: number;
  endMin: number;
}

export const parseTimeRange = (range: string): TimeRange => {
  const [start, end] = range.split('-');
  return { start, end, startMin: timeToMinutes(start), endMin: timeToMinutes(end) };
};

export const generateSlots = (start: string, end: string, stepMinutes = 30): string[] => {
  const slots: string[] = [];
  const endMin = timeToMinutes(end);
  for (let cur = timeToMinutes(start); cur < endMin; cur += stepMinutes) {
    slots.push(minutesToTime(cur));
  }
  return slots;
};
