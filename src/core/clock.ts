import { UsageError } from "./errors.js";
import type { ISODate } from "./types.js";

/** True for a real calendar date written as YYYY-MM-DD. */
export function isValidISODate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Today's date (local) as YYYY-MM-DD, or the validated override. */
export function today(override?: string): ISODate {
  if (override !== undefined) {
    if (!isValidISODate(override)) {
      throw new UsageError(`invalid date "${override}", expected YYYY-MM-DD`);
    }
    return override;
  }
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
