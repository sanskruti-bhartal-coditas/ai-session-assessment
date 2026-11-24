import type { ISODate } from "../core/types.js";
import {
  addDays, formatISO, makeDate, monthNumber, nextWeekdayAfter, parseISO, weekdayNumber,
} from "./utc.js";

export type MeetingDateResult = { date: ISODate; warning?: string } | { date: null; warning: string };
export type DueResult = { due: ISODate | null; warning?: string };

const LONG_DATE = /^(?:[A-Za-z]+,?\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/;
const FILENAME_DATE = /^(\d{4}-\d{2}-\d{2})/;

function parseHeaderDate(raw: string): ISODate | null {
  const s = raw.trim();
  const iso = parseISO(s);
  if (iso) return formatISO(iso);
  const m = LONG_DATE.exec(s);
  if (!m) return null;
  const month = monthNumber(m[2]);
  if (month === null) return null;
  const d = makeDate(Number(m[3]), month, Number(m[1]));
  return d ? formatISO(d) : null;
}

export function parseMeetingDate(dateRaw: string | null, filename: string): MeetingDateResult {
  if (dateRaw !== null && dateRaw.trim() !== "") {
    const parsed = parseHeaderDate(dateRaw);
    if (parsed) return { date: parsed };
  }
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const fm = FILENAME_DATE.exec(base);
  const fileDate = fm ? parseISO(fm[1]) : null;
  const shown = dateRaw === null ? "" : dateRaw.trim();
  if (fileDate) {
    return { date: formatISO(fileDate), warning: `date "${shown}" not parseable, used filename date` };
  }
  return { date: null, warning: `date "${shown}" not parseable and filename has no date` };
}

const MONTH_DAY = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)$/;
const DAY_MONTH = /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/;
const MID_MONTH = /^mid[-\s]([A-Za-z]+)$/i;

/** Month/day in the meeting year; next year if more than 6 months before the meeting. */
function monthDay(month: number, day: number, meeting: Date): Date | null {
  const y = meeting.getUTCFullYear();
  const cand = makeDate(y, month, day);
  if (!cand) return null;
  const cutoff = new Date(Date.UTC(y, meeting.getUTCMonth() - 6, meeting.getUTCDate()));
  return cand < cutoff ? makeDate(y + 1, month, day) : cand;
}

function resolve(raw: string, meeting: Date): Date | null {
  const s = raw.trim().replace(/\s+/g, " ");
  const lower = s.toLowerCase();

  const iso = parseISO(s);
  if (iso) return iso;

  if (lower === "tomorrow") return addDays(meeting, 1);
  if (lower === "today" || lower === "eod" || lower === "end of day") return meeting;
  if (lower === "next week") return nextWeekdayAfter(meeting, 1);

  const wd = weekdayNumber(s);
  if (wd !== null) return nextWeekdayAfter(meeting, wd);

  const mid = MID_MONTH.exec(s);
  if (mid) {
    const month = monthNumber(mid[1]);
    return month === null ? null : monthDay(month, 15, meeting);
  }

  let m = MONTH_DAY.exec(s);
  if (m) {
    const month = monthNumber(m[2]);
    return month === null ? null : monthDay(month, Number(m[1]), meeting);
  }
  m = DAY_MONTH.exec(s);
  if (m) {
    const month = monthNumber(m[1]);
    return month === null ? null : monthDay(month, Number(m[2]), meeting);
  }
  return null;
}

export function resolveDue(dueRaw: string | null, meetingDate: ISODate): DueResult {
  if (dueRaw === null || dueRaw.trim() === "") return { due: null };
  const meeting = parseISO(meetingDate);
  const result = meeting ? resolve(dueRaw, meeting) : null;
  if (!result) return { due: null, warning: `due phrase "${dueRaw}" not resolved` };
  return { due: formatISO(result) };
}

export function isOverdue(item: { status: string; due: ISODate | null }, today: ISODate): boolean {
  return item.status === "open" && item.due !== null && item.due < today;
}
