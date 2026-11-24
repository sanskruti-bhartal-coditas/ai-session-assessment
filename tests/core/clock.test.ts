import { afterEach, describe, expect, it, vi } from "vitest";
import { isValidISODate, today } from "../../src/core/clock.js";
import { UsageError } from "../../src/core/errors.js";

describe("today", () => {
  it("returns a valid override", () => {
    expect(today("2026-11-24")).toBe("2026-11-24");
  });

  it.each(["2026-13-01", "2026-02-30", "24-11-2026", "tomorrow", ""])("rejects %j", (bad) => {
    expect(() => today(bad)).toThrow(UsageError);
  });

  it("defaults to the system date in YYYY-MM-DD form", () => {
    const t = today();
    expect(isValidISODate(t)).toBe(true);
    expect(Number(t.slice(0, 4))).toBe(new Date().getFullYear());
  });

  it("accepts leap days only in leap years", () => {
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(isValidISODate("2026-02-29")).toBe(false);
  });

  it("names the bad value and the expected format in the error", () => {
    expect(() => today("tomorrow")).toThrow('invalid date "tomorrow", expected YYYY-MM-DD');
  });

  describe("system date", () => {
    afterEach(() => vi.useRealTimers());

    it.each([new Date(2026, 10, 24, 0, 30), new Date(2026, 10, 24, 23, 30)])(
      "uses the local calendar date, not UTC (%s)",
      (local) => {
        vi.useFakeTimers();
        vi.setSystemTime(local);
        expect(today()).toBe("2026-11-24");
      },
    );
  });
});
