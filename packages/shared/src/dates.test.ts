import { describe, expect, it } from 'vitest';
import { isCalendarDate, todayInIndia, yearInIndia } from './dates';

describe('todayInIndia', () => {
  it('follows India time (UTC+5:30), not the computer time zone', () => {
    // 20:00 UTC on 23 October is 01:30 on 24 October in India.
    expect(todayInIndia(new Date('2026-10-23T20:00:00Z'))).toBe('2026-10-24');
    expect(todayInIndia(new Date('2026-10-23T12:00:00Z'))).toBe('2026-10-23');
  });

  it('turns over to the new day at 18:30 UTC', () => {
    expect(todayInIndia(new Date('2026-10-23T18:29:59Z'))).toBe('2026-10-23');
    expect(todayInIndia(new Date('2026-10-23T18:30:00Z'))).toBe('2026-10-24');
  });

  it('uses today by default', () => {
    expect(todayInIndia()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('yearInIndia', () => {
  it('changes year at midnight in India, not at midnight UTC', () => {
    expect(yearInIndia(new Date('2026-12-31T18:29:59Z'))).toBe(2026);
    expect(yearInIndia(new Date('2026-12-31T18:30:00Z'))).toBe(2027);
  });
});

describe('isCalendarDate', () => {
  it('accepts real dates, including 29 February in a leap year', () => {
    for (const value of ['2026-02-28', '2028-02-29', '2026-12-31', '2026-01-01']) {
      expect(isCalendarDate(value), value).toBe(true);
    }
  });

  it('refuses dates that do not exist', () => {
    for (const value of ['2026-02-29', '2026-02-31', '2026-13-01', '2026-00-10', '2026-04-31']) {
      expect(isCalendarDate(value), value).toBe(false);
    }
  });

  it('refuses anything that is not written as YYYY-MM-DD', () => {
    for (const value of [
      '',
      '2026-1-1',
      '26-01-01',
      '01/02/2026',
      'next week',
      '2026-01-01T00:00',
    ]) {
      expect(isCalendarDate(value), value).toBe(false);
    }
  });
});
