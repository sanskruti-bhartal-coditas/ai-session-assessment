import type { ISODate } from "../core/types.js";

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Builds a UTC date, returning null when the calendar date is invalid (no rollover). */
export function makeDate(year: number, month: number, day: number): Date | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d;
}

export function parseISO(s: string): Date | null {
  const m = ISO_RE.exec(s);
  if (!m) return null;
  return makeDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

export function formatISO(d: Date): ISODate {
  const y = String(d.getUTCFullYear()).padStart(4, "0");
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

/** 0 = Sunday ... 6 = Saturday. */
export function weekday(d: Date): number {
  return d.getUTCDay();
}

/** The next given weekday (0-6) strictly after d. */
export function nextWeekdayAfter(d: Date, target: number): Date {
  const diff = ((target - weekday(d) + 6) % 7) + 1; // 1..7
  return addDays(d, diff);
}

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Month number 1-12 from a full name or 3-letter abbreviation, else null. */
export function monthNumber(name: string): number | null {
  const n = name.toLowerCase();
  const i = MONTHS.findIndex((m) => m === n || (n.length === 3 && m.startsWith(n)));
  return i === -1 ? null : i + 1;
}

export const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Weekday number 0-6 from a full name or 3-letter abbreviation, else null. */
export function weekdayNumber(name: string): number | null {
  const n = name.toLowerCase();
  const i = WEEKDAYS.findIndex((w) => w === n || (n.length === 3 && w.startsWith(n)));
  return i === -1 ? null : i;
}
