import type { TimetableDaySchedule, TimetablePeriod, Weekday } from '@/types';

export const WEEKDAYS: { value: Weekday; label: string; short: string }[] = [
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
];

export const TIMETABLE_PERIOD_COUNT = 8;

/** Typical Sri Lankan school period times (display only). */
export const PERIOD_TIME_LABELS: Record<number, string> = {
  1: '07:45 – 08:25',
  2: '08:25 – 09:05',
  3: '09:05 – 09:45',
  4: '09:45 – 10:25',
  5: '10:45 – 11:25',
  6: '11:25 – 12:05',
  7: '12:05 – 12:45',
  8: '12:45 – 13:25',
};

export const TIMETABLE_SUBJECT_OPTIONS = [
  'Assembly',
  'Mathematics',
  'Science',
  'Sinhala',
  'English',
  'Tamil',
  'History',
  'Geography',
  'Civics',
  'Buddhism',
  'Christianity',
  'Islam',
  'Hinduism',
  'Art',
  'Music',
  'Drama',
  'Physical Education',
  'ICT',
  'Agriculture',
  'Commerce',
  'Accounting',
  'Economics',
  'Business Studies',
  'Physics',
  'Chemistry',
  'Biology',
  'Combined Mathematics',
  'Health Science',
  'Engineering Technology',
  'Bio Systems Technology',
  'Interval',
  'Lunch',
  'Library',
  'Club Activity',
] as const;

export function createEmptyPeriod(period: number): TimetablePeriod {
  return { period, subject: '' };
}

export function createEmptyDaySchedule(day: Weekday): TimetableDaySchedule {
  return {
    day,
    periods: Array.from({ length: TIMETABLE_PERIOD_COUNT }, (_, i) => createEmptyPeriod(i + 1)),
  };
}

export function createEmptySchedule(): TimetableDaySchedule[] {
  return WEEKDAYS.map((d) => createEmptyDaySchedule(d.value));
}
