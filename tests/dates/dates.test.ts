import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isOverdue, parseMeetingDate, resolveDue } from "../../src/dates/index.js";
import { addDays, formatISO, parseISO, weekday } from "../../src/dates/utc.js";
import { parseNote } from "../../src/parser/parseNote.js";

const due = (raw: string | null, m: string) => resolveDue(raw, m).due;

describe("utc helpers", () => {
  it("round-trips, adds days across month/year, gives weekday", () => {
    expect(formatISO(addDays(parseISO("2026-12-31")!, 1))).toBe("2027-01-01");
    expect(weekday(parseISO("2026-09-01")!)).toBe(2);
    expect(parseISO("2026-02-31")).toBeNull();
    expect(parseISO("2028-02-29")).not.toBeNull();
  });
});

describe("parseMeetingDate", () => {
  it("parses ISO, long and weekday-prefixed formats", () => {
    expect(parseMeetingDate("2026-09-01", "x.md")).toEqual({ date: "2026-09-01" });
    expect(parseMeetingDate("9 September 2026", "x.md")).toEqual({ date: "2026-09-09" });
    expect(parseMeetingDate("Monday, 14 September 2026", "x.md")).toEqual({ date: "2026-09-14" });
  });
  it("falls back to the filename with a warning", () => {
    expect(parseMeetingDate("sometime last week", "notes/2026-09-18-design-review.md")).toEqual({
      date: "2026-09-18",
      warning: 'date "sometime last week" not parseable, used filename date',
    });
    expect(parseMeetingDate(null, "2026-09-18-x.md").date).toBe("2026-09-18");
  });
  it("returns null when neither header nor filename has a date", () => {
    const r = parseMeetingDate("sometime last week", "untitled.md");
    expect(r.date).toBeNull();
    expect(r.warning).toBeTruthy();
  });
  it("treats an invalid calendar date as unparseable", () => {
    expect(parseMeetingDate("31 February 2026", "2026-03-01-a.md").date).toBe("2026-03-01");
    expect(parseMeetingDate("2026-02-31", "a.md").date).toBeNull();
  });
});

describe("resolveDue table", () => {
  const M = "2026-09-01"; // Tuesday
  it.each([
    ["2026-09-08", "2026-09-08"],
    ["Friday", "2026-09-04"],
    ["friday", "2026-09-04"],
    ["Wed", "2026-09-02"],
    ["Mon", "2026-09-07"],
    ["tomorrow", "2026-09-02"],
    ["today", M],
    ["EOD", M],
    ["end of day", M],
    ["Oct 3rd", "2026-10-03"],
    ["7 Oct", "2026-10-07"],
    ["15 October", "2026-10-15"],
    ["9 Oct", "2026-10-09"],
    ["mid-October", "2026-10-15"],
    ["mid October", "2026-10-15"],
    ["next week", "2026-09-07"],
  ])("%s -> %s", (raw, expected) => {
    expect(due(raw, M)).toBe(expected);
  });
  it("unresolved phrases give null plus warning", () => {
    expect(resolveDue("after the cutover", M)).toEqual({ due: null, warning: 'due phrase "after the cutover" not resolved' });
    expect(resolveDue(null, M)).toEqual({ due: null });
  });
});

describe("edge cases", () => {
  it("weekday on same day goes to next week; Tuesday meeting gives Friday", () => {
    expect(due("Friday", "2026-09-04")).toBe("2026-09-11");
    expect(due("Tuesday", "2026-09-01")).toBe("2026-09-08");
  });
  it("invalid calendar dates are unresolved, not rolled over", () => {
    expect(resolveDue("2026-02-31", "2026-02-01").due).toBeNull();
    expect(resolveDue("31 Feb", "2026-02-01").due).toBeNull();
    expect(resolveDue("Feb 30th", "2026-02-01").warning).toContain("not resolved");
  });
  it("year inference rolls to next year when more than 6 months before", () => {
    expect(due("Jan 5", "2026-12-20")).toBe("2027-01-05");
    expect(due("mid-January", "2026-12-20")).toBe("2027-01-15");
    expect(due("Sep 1", "2026-10-01")).toBe("2026-09-01");
    expect(due("Jan 5", "2026-07-05")).toBe("2026-01-05"); // exactly 6 months: kept
    expect(due("Jan 4", "2026-07-05")).toBe("2027-01-04"); // 6 months + 1 day: next year
  });
  it("leap day resolves in a leap year only", () => {
    expect(due("29 Feb", "2028-02-01")).toBe("2028-02-29");
    expect(due("29 Feb", "2026-02-01")).toBeNull();
  });
  it("friday across year end", () => {
    expect(due("Friday", "2026-12-31")).toBe("2027-01-01");
  });
});

describe("isOverdue", () => {
  it("is strict, open-only and needs a due date", () => {
    expect(isOverdue({ status: "open", due: "2026-11-23" }, "2026-11-24")).toBe(true);
    expect(isOverdue({ status: "open", due: "2026-11-24" }, "2026-11-24")).toBe(false);
    expect(isOverdue({ status: "done", due: "2026-11-01" }, "2026-11-24")).toBe(false);
    expect(isOverdue({ status: "open", due: null }, "2026-11-24")).toBe(false);
  });
});

describe("real notes", () => {
  const dir = "notes";
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const parsedNotes = files.flatMap((f) => {
    const r = parseNote(f, readFileSync(`${dir}/${f}`));
    return r.kind === "parsed" ? [{ f, note: r.note }] : [];
  });

  it("header or filename yields the filename date for every dated note", () => {
    let checked = 0;
    for (const { f, note } of parsedNotes) {
      const res = parseMeetingDate(note.dateRaw, f);
      const fn = /^(\d{4}-\d{2}-\d{2})/.exec(f)?.[1];
      if (fn) {
        expect(res.date, f).toBe(fn);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
  it("odd real header strings", () => {
    const raws = parsedNotes
      .filter(({ note }) => note.dateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(note.dateRaw))
      .map(({ f, note }) => [f, note.dateRaw as string] as const);
    const vals = raws.map(([, r]) => r);
    expect(vals).toContain("9 September 2026");
    expect(vals).toContain("Monday, 14 September 2026");
    expect(vals).toContain("sometime last week");
    for (const [f, raw] of raws) {
      const r = parseMeetingDate(raw, f);
      if (raw === "sometime last week") expect(r.warning).toContain("used filename date");
      else expect(r.warning).toBeUndefined();
    }
  });
  it("real due phrases resolve or warn, and resolved dates are valid", () => {
    let resolved = 0;
    let unresolved = 0;
    for (const { f, note } of parsedNotes) {
      const md = parseMeetingDate(note.dateRaw, f).date;
      if (!md) continue;
      for (const it of note.items) {
        if (it.dueRaw === null) continue;
        const res = resolveDue(it.dueRaw, md);
        if (res.due) {
          resolved++;
          expect(parseISO(res.due)).not.toBeNull();
          expect(res.due >= md).toBe(true);
        } else {
          unresolved++;
          expect(res.warning).toBe(`due phrase "${it.dueRaw}" not resolved`);
        }
      }
    }
    expect(resolved).toBeGreaterThan(30);
    expect(unresolved).toBeGreaterThan(0);
  });
  it("sample real phrases", () => {
    expect(due("Friday", "2026-09-01")).toBe("2026-09-04");
    expect(due("tomorrow", "2026-09-08")).toBe("2026-09-09");
    expect(due("Oct 3rd", "2026-09-24")).toBe("2026-10-03");
    expect(due("mid-October", "2026-09-30")).toBe("2026-10-15");
    expect(due("<date>", "2026-09-01")).toBeNull();
    for (const p of ["next Tuesday", "end of next week", "end of month", "EOD tomorrow", "Wed 16 Sep", "before the end of the week"]) {
      expect(resolveDue(p, "2026-09-01").due, p).toBeNull();
    }
  });
});
