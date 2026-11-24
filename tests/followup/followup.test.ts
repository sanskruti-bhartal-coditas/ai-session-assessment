import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, UsageError } from "../../src/core/errors.js";
import type { Item, Store } from "../../src/core/types.js";
import { renderEmail, runFollowup, slugify } from "../../src/followup/index.js";

const src = (file: string) => [{ file, meetingDate: "2026-09-01", line: 1 }];
const item = (id: number, over: Partial<Item>): Item => ({
  id, owner: "Karan Joshi", ownerRaw: "Karan", ownerStatus: "resolved", ownerCandidates: [],
  task: `task ${id}`, taskKey: `task ${id}`, due: null, dueRaw: null, status: "open",
  sources: src("x.md"), createdAt: "2026-09-01T00:00:00.000Z", doneAt: null, ...over,
});
const store = (): Store => ({
  version: 1, nextId: 20,
  items: [
    item(1, { due: "2026-10-20", sources: src("b.md") }),
    item(2, { due: "2026-10-10", sources: src("a.md") }),
    item(3, { due: "2026-12-01", sources: src("c.md") }),
    item(4, { due: null, sources: src("d.md") }),
    item(5, { status: "done", due: "2026-10-01" }),
    item(6, { due: "2026-11-24", sources: src("f.md") }),
    item(7, { owner: "Priya Nair", due: "2026-10-05" }),
    item(8, { owner: "Priya Shah" }),
    item(9, { owner: null, ownerStatus: "unassigned" }),
    item(10, {
      owner: null, ownerStatus: "ambiguous", ownerRaw: "Priya",
      ownerCandidates: ["Priya Nair", "Priya Shah"],
    }),
    item(11, { owner: "Dev Done", status: "done" }),
  ],
});

let dir: string, outbox: string, people: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "followup-"));
  outbox = join(dir, "outbox");
  people = join(dir, "people.json");
  writeFileSync(people, JSON.stringify({ "Karan Joshi": "karan.joshi@example.com" }));
});
const run = (owner: string, extra: Record<string, unknown> = {}) =>
  runFollowup(store(), { owner, today: "2026-11-24", peoplePath: people, outboxDir: outbox, ...extra });
const read = (p: string | undefined) => JSON.parse(readFileSync(p!, "utf8"));

describe("followup", () => {
  it("writes a payload for an unambiguous owner, overdue first", () => {
    const r = run("Karan Joshi");
    expect(r.payloadPath).toBe(join(outbox, "karan-joshi-2026-11-24.json"));
    const p = read(r.payloadPath);
    expect(p.to).toBe("karan.joshi@example.com");
    expect(p.owner).toBe("Karan Joshi");
    expect(p.generatedFor).toBe("2026-11-24");
    expect(p.itemIds).toEqual([2, 1, 6, 3, 4]);
    expect(p.subject).toBe("Follow-up: your open action items (5 open, 2 overdue)");
    expect(r.output.at(-1)).toContain("Nothing has been sent.");
  });
  it("accepts case-insensitive and first-name matches", () => {
    expect(run("karan").payloadPath).toBeDefined();
  });
  it("ambiguous owner is a usage error listing candidates and writes nothing", () => {
    expect(() => run("Priya")).toThrow(UsageError);
    expect(() => run("Priya")).toThrow(
      '"Priya" is ambiguous: Priya Nair, Priya Shah. Use the full name.',
    );
    expect(existsSync(outbox)).toBe(false);
  });
  it("unknown, unassigned and ambiguous names are not found", () => {
    for (const n of ["Dave", "unassigned", "ambiguous"]) {
      expect(() => run(n)).toThrow(NotFoundError);
    }
    expect(() => run("Dave")).toThrow('no items for owner "Dave"');
  });
  it("empty owner is a usage error", () => expect(() => run("")).toThrow(UsageError));
  it("no open items writes nothing", () => {
    const r = run("Dev Done");
    expect(r.output).toEqual(["Dev Done has no open items."]);
    expect(r.warnings).toEqual([]);
    expect(existsSync(outbox)).toBe(false);
  });
  it("missing email gives blank To and a warning", () => {
    const r = run("Priya Nair");
    expect(read(r.payloadPath).to).toBe("");
    expect(r.warnings).toEqual([
      "warning: no email for Priya Nair in people.json; the draft's To field will be empty",
    ]);
  });
  it("missing people.json also gives a warning", () => {
    expect(run("Karan", { peoplePath: join(dir, "nope.json") }).warnings).toHaveLength(1);
  });
  it("existing file needs --force", () => {
    run("Karan");
    expect(() => run("Karan")).toThrow("outbox file exists, use --force to overwrite");
    expect(() => run("Karan", { force: true })).not.toThrow();
    expect(() => run("Karan", { today: "2026-11-25" })).not.toThrow();
    expect(readdirSync(outbox).sort()).toEqual([
      "karan-joshi-2026-11-24.json",
      "karan-joshi-2026-11-25.json",
    ]);
  });
  it("--today shifts overdue", () => {
    const p = read(run("Karan", { today: "2026-10-15" }).payloadPath);
    expect(p.subject).toContain("(5 open, 1 overdue)");
    expect(p.itemIds).toEqual([2, 1, 6, 3, 4]);
  });
  it("never includes unassigned, ambiguous, done or other people's items", () => {
    const p = read(run("Karan").payloadPath);
    for (const id of [5, 7, 8, 9, 10]) expect(p.itemIds).not.toContain(id);
  });
  it("slugifies safely", () => expect(slugify("Anita D'Souza")).toBe("anita-d-souza"));
});

describe("renderEmail golden", () => {
  const s = store();
  const by = (...ids: number[]) => ids.map((id) => s.items.find((i) => i.id === id)!);
  it("renders both sections", () => {
    expect(renderEmail("Karan Joshi", by(2, 1), by(6, 4)).body).toBe(
      [
        "Hi Karan,",
        "",
        "Here are your open action items from recent meetings.",
        "",
        "OVERDUE (2)",
        "- task 2 (due 2026-10-10, from a.md)",
        "- task 1 (due 2026-10-20, from b.md)",
        "",
        "OPEN (2)",
        "- task 6 (due 2026-11-24, from f.md)",
        "- task 4 (no due date, from d.md)",
        "",
        "Reply to me if any of these are already done or need a new date.",
        "",
        "Thanks",
      ].join("\n"),
    );
  });
  it("omits empty sections", () => {
    expect(renderEmail("Karan Joshi", [], by(4)).body).not.toContain("OVERDUE");
    expect(renderEmail("Karan Joshi", by(2), []).body).not.toContain("OPEN");
  });
});
