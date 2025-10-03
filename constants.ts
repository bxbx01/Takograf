import { AppSettings, ActivityType } from './types';

// Durations in milliseconds
export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// Driving Time Limits
export const CONTINUOUS_DRIVING_LIMIT = 4.5 * HOUR;
export const DAILY_DRIVING_LIMIT_NORMAL = 9 * HOUR;
export const DAILY_DRIVING_LIMIT_EXTENDED = 10 * HOUR;
export const WEEKLY_DRIVING_LIMIT = 56 * HOUR;
export const BI_WEEKLY_DRIVING_LIMIT = 90 * HOUR;

// Work Period Limits
export const DAILY_WORK_PERIOD_NORMAL = 13 * HOUR;
export const DAILY_WORK_PERIOD_EXTENDED = 15 * HOUR;

// Break and Rest Times
export const MINIMUM_BREAK_AFTER_CONTINUOUS_DRIVING = 45 * MINUTE;
export const MINIMUM_SPLIT_BREAK_1 = 15 * MINUTE;
export const MINIMUM_SPLIT_BREAK_2 = 30 * MINUTE;

export const DAILY_REST_NORMAL = 11 * HOUR;
export const DAILY_REST_REDUCED = 9 * HOUR;
export const WEEKLY_REST_NORMAL = 45 * HOUR;
export const WEEKLY_REST_REDUCED = 24 * HOUR;

export const MAX_WORK_PERIOD_BEFORE_WEEKLY_REST = 6 * DAY;

export const DEFAULT_SETTINGS: AppSettings = {
  [ActivityType.DRIVING]: { hours: 4, minutes: 30 },
  [ActivityType.BREAK]: { hours: 0, minutes: 45 },
  [ActivityType.REST]: { hours: 11, minutes: 0 },
  [ActivityType.OTHER_WORK]: { hours: 2, minutes: 0 },
};