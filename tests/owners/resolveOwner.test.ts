import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UsageError } from "../../src/core/errors.js";
import { loadPeople } from "../../src/owners/people.js";
import { resolveOwner } from "../../src/owners/resolveOwner.js";
import { parseNote } from "../../src/parser/parseNote.js";

const ALL9 = [
  "Priya Nair", "Rahul Mehta", "Anita Desai", "Sam Okafor", "Meera Iyer",
  "Karan Joshi", "Lena Fischer", "Priya Shah", "Rahul Verma",
];

function note(file: string) {
  const r = parseNote(file, readFileSync(join("notes", file)));
  if (r.kind !== "parsed") throw new Error("skipped " + file);
  return r.note;
}

describe("resolveOwner rules", () => {
  it("null/empty is unassigned", () => {
    expect(resolveOwner(null, ALL9, []).status).toBe("unassigned");
    expect(resolveOwner("   ", ALL9, []).status).toBe("unassigned");
  });

  it("Everyone/All/Team expand to all attendees, any case", () => {
    for (const w of ["Everyone", "all", "TEAM"]) {
      const r = resolveOwner(w, ALL9, []);
      expect(r.status).toBe("resolved");
      expect(r.owners).toEqual(ALL9);
    }
  });

  it("Everyone with no attendees is unassigned with warning", () => {
    const r = resolveOwner("Everyone", [], []);
    expect(r.status).toBe("unassigned");
    expect(r.warning).toBeTruthy();
  });

  it("exact full name, mixed case and extra whitespace", () => {
    const r = resolveOwner("  pRiYa   nair ", ALL9, []);
    expect(r).toMatchObject({ status: "resolved", owners: ["Priya Nair"] });
  });

  it("first name plus initial, with or without dot", () => {
    expect(resolveOwner("Priya N.", ALL9, []).owners).toEqual(["Priya Nair"]);
    expect(resolveOwner("priya s", ALL9, []).owners).toEqual(["Priya Shah"]);
  });

  it("initial matching two people is ambiguous", () => {
    const r = resolveOwner("Rahul M.", ["Rahul Mehta", "Rahul Marsh"], []);
    expect(r.status).toBe("ambiguous");
  });

  it("bare first name: unique resolves, shared is ambiguous with candidates", () => {
    expect(resolveOwner("sam", ALL9, []).owners).toEqual(["Sam Okafor"]);
    const r = resolveOwner("Rahul", ALL9, []);
    expect(r.status).toBe("ambiguous");
    expect(r.owners).toEqual([]);
    expect(r.candidates).toEqual(["Rahul Mehta", "Rahul Verma"]);
  });

  it("ambiguity in attendees does not fall back to knownPeople", () => {
    const r = resolveOwner("Priya", ["Priya Nair", "Priya Shah"], ["Priya Iyer"]);
    expect(r.status).toBe("ambiguous");
  });

  it("falls back to knownPeople when exactly one matches", () => {
    const r = resolveOwner("Karan", ["Sam Okafor"], ["Karan Joshi", "Sam Okafor"]);
    expect(r).toMatchObject({ status: "resolved", owners: ["Karan Joshi"], warning: "owner not in attendee list" });
  });

  it("knownPeople with several matches is unassigned", () => {
    const r = resolveOwner("Priya", ["Sam Okafor"], ["Priya Nair", "Priya Shah"]);
    expect(r.status).toBe("unassigned");
    expect(r.warning).toBe('owner "Priya" not recognised');
  });

  it("unknown Dave is unassigned with warning", () => {
    const r = resolveOwner("Dave", ALL9, ALL9);
    expect(r).toMatchObject({ status: "unassigned", owners: [], warning: 'owner "Dave" not recognised' });
  });
});

describe("resolveOwner against real notes", () => {
  it("offsite: 'Priya to own the hiring plan' is ambiguous Nair/Shah", () => {
    const n = note("2026-09-30-q4-offsite.md");
    const item = n.items.find((i) => i.task.includes("hiring plan"))!;
    const r = resolveOwner(item.ownerRaw, n.attendees, []);
    expect(r.status).toBe("ambiguous");
    expect([...r.candidates].sort()).toEqual(["Priya Nair", "Priya Shah"]);
  });

  it("go/no-go: 'Priya N.' resolves to Priya Nair, bare 'Priya' is ambiguous", () => {
    const n = note("2026-10-08-billing-go-no-go.md");
    const initial = n.items.find((i) => i.task.includes("notify customers"))!;
    expect(resolveOwner(initial.ownerRaw, n.attendees, []).owners).toEqual(["Priya Nair"]);
    const bare = n.items.find((i) => i.task.includes("go/no-go summary"))!;
    expect(resolveOwner(bare.ownerRaw, n.attendees, []).status).toBe("ambiguous");
  });

  it("offsite: Everyone-style item gives 9 owners when present, else 9 attendees", () => {
    const n = note("2026-09-30-q4-offsite.md");
    expect(n.attendees).toHaveLength(9);
    expect(resolveOwner("Everyone", n.attendees, []).owners).toHaveLength(9);
  });

  it("design review: real 'Everyone' item resolves to the four attendees", () => {
    const n = note("2026-09-18-design-review.md");
    const item = n.items.find((i) => i.task.includes("review the prototype"))!;
    const r = resolveOwner(item.ownerRaw, n.attendees, []);
    expect(r.status).toBe("resolved");
    expect(r.owners).toEqual(n.attendees);
  });

  it("weekly: 'Priya N.' resolves in a note with a single Priya too", () => {
    const n = note("2026-09-08-quote-portal-weekly.md");
    const item = n.items.find((i) => i.ownerRaw === "Priya N.")!;
    expect(resolveOwner(item.ownerRaw, n.attendees, []).owners).toEqual(["Priya Nair"]);
  });
});

describe("loadPeople", () => {
  it("missing file gives empty map", () => {
    expect(loadPeople(join(tmpdir(), "no-such-people.json"))).toEqual({});
  });

  it("invalid JSON throws UsageError naming the file", () => {
    const p = join(mkdtempSync(join(tmpdir(), "ppl-")), "people.json");
    writeFileSync(p, "{ nope");
    expect(() => loadPeople(p)).toThrow(UsageError);
    expect(() => loadPeople(p)).toThrow(/people\.json/);
  });

  it("starter people.json covers the 9 sample attendees", () => {
    const people = loadPeople("people.json");
    expect(Object.keys(people).sort()).toEqual([...ALL9].sort());
    expect(Object.values(people).every((e) => e.endsWith("@example.com"))).toBe(true);
  });
});
