import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UsageError } from "../../src/core/errors.js";
import { emptyStore } from "../../src/core/store.js";
import { formatReport, ingestFolder, runIngest } from "../../src/ingest/index.js";
import { loadPeople } from "../../src/owners/index.js";

const NOTES = join(process.cwd(), "notes");
const ctx = {
  now: new Date("2026-11-24T00:00:00Z"),
  knownPeople: Object.keys(loadPeople(join(process.cwd(), "people.json"))),
};

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "ingest-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("folder validation (I1, I9)", () => {
  it("nonexistent folder is a UsageError and writes nothing", () => {
    let saved = false;
    expect(() =>
      runIngest(join(tmp, "nope"), { load: emptyStore, save: () => (saved = true), ctx }),
    ).toThrow(UsageError);
    expect(saved).toBe(false);
  });

  it("a file path is a UsageError", () => {
    writeFileSync(join(tmp, "a.md"), "x");
    expect(() => ingestFolder(join(tmp, "a.md"), emptyStore(), ctx)).toThrow(UsageError);
  });

  it("empty folder gives a zero report", () => {
    const r = ingestFolder(tmp, emptyStore(), ctx);
    expect(r).toMatchObject({ filesSeen: 0, filesParsed: 0, itemsAdded: 0, filesIgnored: [] });
  });

  it("lists only .md, others ignored", () => {
    writeFileSync(join(tmp, "b.txt"), "x");
    mkdirSync(join(tmp, "sub"));
    const r = ingestFolder(tmp, emptyStore(), ctx);
    expect(r.filesIgnored).toEqual(["b.txt"]);
    expect(r.filesSeen).toBe(0);
  });
});

describe("pipeline (I2-I4)", () => {
  function note(name: string, body: string) {
    writeFileSync(join(tmp, name), body);
  }

  it("expands Everyone to one item per attendee", () => {
    note(
      "2026-09-01-sync.md",
      "# Sync\nDate: 2026-09-01\nAttendees: Anita Desai, Karan Joshi\n\n- [ ] Everyone to submit timesheets by Friday\n",
    );
    const store = emptyStore();
    const r = ingestFolder(tmp, store, ctx);
    expect(r.itemsAdded).toBe(2);
    expect(store.items.map((i) => i.owner).sort()).toEqual(["Anita Desai", "Karan Joshi"]);
  });

  it("skips a note with no usable date", () => {
    note("nodate.md", "# T\nDate: sometime\nAttendees: Anita Desai\n\n- [ ] Anita: do x\n");
    const r = ingestFolder(tmp, emptyStore(), ctx);
    expect(r.filesSkipped).toEqual([{ file: "nodate.md", reason: "no usable meeting date" }]);
  });

  it("merges the same task across notes with all sources kept", () => {
    const head = (d: string) => `# W\nDate: ${d}\nAttendees: Anita Desai\n\n`;
    note("2026-09-01-a.md", head("2026-09-01") + "- [ ] Anita: send revised quote to Acme\n");
    note("2026-09-08-a.md", head("2026-09-08") + "- [ ] Anita: send the revised quote to Acme\n");
    note("2026-09-15-a.md", head("2026-09-15") + "- [ ] Anita: Send revised quote to Acme\n");
    const store = emptyStore();
    const r = ingestFolder(tmp, store, ctx);
    expect(r.itemsAdded).toBe(1);
    expect(r.itemsMerged).toBe(2);
    expect(store.items[0]!.sources).toHaveLength(3);
  });
});

describe("sample notes (I7, I8)", () => {
  it("reports skipped files and ambiguous items (scenarios 7, 8, 9)", () => {
    const store = emptyStore();
    const r = ingestFolder(NOTES, store, ctx);
    const skipped = r.filesSkipped.map((s) => s.file);
    expect(skipped).toEqual(
      expect.arrayContaining(["scratch.md", "untitled.md", "2026-09-09-notes-final-v2.md"]),
    );
    expect(r.filesIgnored).toContain("2026-09-19-offsite-draft.txt");
    expect(r.filesParsed + r.filesSkipped.length).toBe(r.filesSeen);
    expect(r.filesParsed).toBeGreaterThan(25);
    expect(r.itemsAdded).toBeGreaterThan(0);
    expect(r.itemsMerged).toBeGreaterThan(0);

    const inFile = (f: string) => store.items.filter((i) => i.sources.some((s) => s.file === f));
    const offsite = inFile("2026-09-30-q4-offsite.md");
    expect(offsite.some((i) => i.ownerStatus === "ambiguous" && i.ownerRaw === "Priya")).toBe(true);
    expect(offsite.some((i) => i.ownerStatus === "ambiguous" && i.ownerRaw === "Rahul")).toBe(true);
    const gonogo = inFile("2026-10-08-billing-go-no-go.md");
    expect(gonogo.some((i) => i.ownerRaw === "Priya N." && i.owner === "Priya Nair")).toBe(true);
    expect(r.unassigned).toBeGreaterThan(0);
    expect(r.noDueDate).toBeGreaterThan(0);
    expect(formatReport(r)).toMatch(/^Ingested \d+ files: \d+ parsed, \d+ skipped, \d+ ignored/);
  });

  it("is idempotent, and done survives re-ingest (scenario 2)", () => {
    const store = emptyStore();
    ingestFolder(NOTES, store, ctx);
    const target = store.items.find((i) => i.status === "open")!;
    target.status = "done";
    target.doneAt = "2026-11-01T00:00:00.000Z";
    const count = store.items.length;
    const nextId = store.nextId;

    const r2 = ingestFolder(NOTES, store, ctx);
    expect(r2.itemsAdded).toBe(0);
    expect(r2.itemsMerged).toBe(0);
    expect(store.items).toHaveLength(count);
    expect(store.nextId).toBe(nextId);
    expect(store.items.find((i) => i.id === target.id)).toMatchObject({
      status: "done",
      doneAt: "2026-11-01T00:00:00.000Z",
    });
  });

  it("saves exactly once", () => {
    let saves = 0;
    runIngest(NOTES, { load: emptyStore, save: () => saves++, ctx });
    expect(saves).toBe(1);
  });
});
