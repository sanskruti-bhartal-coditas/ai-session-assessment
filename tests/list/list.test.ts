import { describe, expect, it } from "vitest";
import { UsageError } from "../../src/core/errors.js";
import type { Item } from "../../src/core/types.js";
import { filterItems, formatTable, runList } from "../../src/list/index.js";

const T = "2026-11-24";
const mk = (id: number, over: Partial<Item>): Item => ({
  id, owner: "Karan Joshi", ownerRaw: "Karan", ownerStatus: "resolved", ownerCandidates: [],
  task: `task ${id}`, taskKey: `task ${id}`, due: null, dueRaw: null, status: "open",
  sources: [{ file: "a.md", meetingDate: "2026-10-01", line: 1 }], createdAt: "", doneAt: null, ...over,
});
const items: Item[] = [
  mk(1, { due: "2026-10-10" }),
  mk(2, { due: "2026-10-10", status: "done" }),
  mk(3, { due: "2026-10-20", sources: ["b.md", "c.md", "d.md"].map((file) => ({ file, meetingDate: "2026-10-01", line: 1 })) }),
  mk(4, { owner: "Priya Nair", ownerRaw: "Priya", due: "2026-11-24" }),
  mk(5, { owner: "Priya Nair", ownerRaw: "Priya", due: "2026-12-01" }),
  mk(6, { owner: null, ownerRaw: null, ownerStatus: "unassigned" }),
  mk(7, { owner: null, ownerRaw: "Priya", ownerStatus: "ambiguous", ownerCandidates: ["Priya Nair", "Priya Shah"], due: "2026-10-01" }),
  mk(8, { owner: "Sam Okafor", ownerRaw: "Sam" }),
];
const ids = (f = {}) => filterItems(items, f, T).map((i) => i.id);

describe("filters", () => {
  it("status overdue / open / done", () => {
    expect(ids({ status: "overdue" })).toEqual([7, 1, 3]);
    expect(ids({ status: "open" })).toEqual([7, 1, 3, 4, 5, 6, 8]);
    expect(ids({ status: "done" })).toEqual([2]);
  });
  it("owner full, case-insensitive, token, trimmed", () => {
    expect(ids({ owner: "karan joshi" })).toEqual([1, 3, 2]);
    expect(ids({ owner: "Joshi" })).toEqual([1, 3, 2]);
    expect(ids({ owner: " Karan " })).toEqual([1, 3, 2]);
    expect(ids({ owner: "Kar" })).toEqual([]);
    expect(ids({ owner: "Priya" })).toEqual([4, 5]);
  });
  it("unassigned and ambiguous", () => {
    expect(ids({ owner: "UNASSIGNED" })).toEqual([6]);
    expect(ids({ owner: "ambiguous" })).toEqual([7]);
  });
  it("due-before is strict and excludes no-date", () => {
    expect(ids({ dueBefore: "2026-10-20" })).toEqual([7, 1, 2]);
    expect(ids({ dueBefore: "2027-01-01" })).not.toContain(6);
  });
  it("combined (scenario 5) and empty", () => {
    expect(ids({ owner: "Karan Joshi", status: "overdue", dueBefore: "2026-10-15" })).toEqual([1]);
    expect(ids({ owner: "Karan", status: "done" })).toEqual([2]);
    expect(ids({ owner: "Sam", status: "overdue" })).toEqual([]);
  });
  it("sort order", () => expect(ids()).toEqual([7, 1, 3, 2, 4, 5, 6, 8]));
  it("due today is not overdue; today shifts overdue", () => {
    expect(ids({ status: "overdue" })).not.toContain(4);
    expect(filterItems(items, { status: "overdue" }, "2026-10-05").map((i) => i.id)).toEqual([7]);
  });
  it("does not mutate", () => {
    const copy = JSON.stringify(items);
    ids({ status: "overdue" });
    expect(JSON.stringify(items)).toBe(copy);
  });
  it("rejects invalid status and dates", () => {
    for (const status of ["late", "", "OPEN"]) expect(() => ids({ status })).toThrow(UsageError);
    for (const dueBefore of ["24-11-2026", "2026-02-30", "tomorrow", ""]) {
      expect(() => ids({ dueBefore })).toThrow(UsageError);
    }
  });
});

describe("formatTable", () => {
  const out = runList({ version: 1, nextId: 9, items }, {}, T);
  it("labels (scenarios 4 and 8)", () => {
    expect(out.split("\n")[0]).toMatch(/^ID\s+OWNER\s+TASK\s+DUE\s+STATUS\s+SOURCE$/);
    expect(out).toContain("UNASSIGNED");
    expect(out).toContain("no date");
    expect(out).toContain("? Priya (Nair|Shah)");
    expect(out).toMatch(/^1\s+Karan Joshi\s+task 1\s+2026-10-10\s+overdue/m);
    expect(out).toMatch(/^2\s+Karan Joshi\s+task 2\s+2026-10-10\s+done/m);
    expect(out).toMatch(/^4\s.*\sopen\s/m);
    expect(out).toContain("b.md +2 more");
    expect(out.endsWith("8 items")).toBe(true);
  });
  it("empty result", () => expect(runList({ version: 1, nextId: 1, items: [] }, {}, T)).toBe("No items match."));
  it("singular footer", () => expect(formatTable([items[0]], T).endsWith("1 item")).toBe(true));
  it("truncates long tasks to width, one line, unicode safe", () => {
    const long = mk(9, { task: "word\n\t" + "\u{1F600}".repeat(200) });
    const txt = formatTable([long], T, 60);
    for (const l of txt.split("\n")) expect(Array.from(l).length).toBeLessThanOrEqual(60);
    expect(txt).toContain("…");
    expect(txt.split("\n")).toHaveLength(4);
  });
});
