import { describe, expect, it } from "vitest";
import {
  SIMILARITY_THRESHOLD, createItem, findMatch, mergeInto, normaliseTask, similarity,
  type NewItem,
} from "../../src/dedupe/index.js";

function inc(task: string, o: Partial<NewItem> = {}): NewItem {
  return {
    owner: "Karan Joshi", ownerRaw: "Karan", ownerStatus: "resolved", ownerCandidates: [],
    task, due: null, dueRaw: null, checked: false,
    source: { file: "a.md", meetingDate: "2026-09-01", line: 3 }, ...o,
  };
}
const NOW = "2026-11-24T00:00:00.000Z";
const mk = (i: NewItem, id = 1) => createItem(i, id, NOW);
const src = (file: string, line = 1) => ({ file, meetingDate: "2026-09-08", line });
const AMB = {
  owner: null, ownerRaw: "Priya", ownerStatus: "ambiguous" as const,
  ownerCandidates: ["Priya Nair", "Priya Shah"],
};

describe("normaliseTask / similarity", () => {
  it("strips case, punctuation, emphasis and stop words", () => {
    expect(normaliseTask("**Send** the Revised Quote, to Acme!")).toBe("send revised quote acme");
  });
  it("is Jaccard", () => {
    expect(similarity("a b", "a b c d")).toBe(0.5);
    expect(similarity("", "")).toBe(0);
    expect(SIMILARITY_THRESHOLD).toBe(0.8);
  });
});

describe("findMatch", () => {
  it("merges reordered wording with same owner", () => {
    const e = mk(inc("Send the revised quote to Acme"));
    expect(findMatch(inc("Send Acme the revised quote"), [e])).toBe(e);
  });
  it("does not match different owners", () => {
    const e = mk(inc("Send the revised quote to Acme"));
    expect(findMatch(inc("Send the revised quote to Acme", { owner: "Sam Okafor" }), [e])).toBeNull();
  });
  it("matches unassigned only with unassigned", () => {
    const un = { owner: null, ownerRaw: null, ownerStatus: "unassigned" as const };
    const eu = mk(inc("Book room", un), 1);
    const er = mk(inc("Book room"), 2);
    expect(findMatch(inc("Book room", un), [er, eu])).toBe(eu);
    expect(findMatch(inc("Book room"), [eu])).toBeNull();
  });
  it("ambiguous matches only same raw and candidates", () => {
    const e = mk(inc("Draft plan", AMB));
    expect(findMatch(inc("Draft plan", AMB), [e])).toBe(e);
    expect(findMatch(inc("Draft plan", { ...AMB, ownerRaw: "Rahul" }), [e])).toBeNull();
    expect(findMatch(inc("Draft plan"), [e])).toBeNull();
  });
  it("ties go to highest similarity then lowest id", () => {
    const a = mk(inc("one two three four five six"), 5);
    const b = mk(inc("one two three four five six"), 2);
    const c = mk(inc("one two three four five"), 1);
    expect(findMatch(inc("one two three four five six"), [a, b, c])).toBe(b);
  });
});

describe("mergeInto", () => {
  it("re-ingesting the same source is idempotent", () => {
    const e = mk(inc("Send quote"));
    expect(mergeInto(e, inc("Send quote"))).toEqual({ changed: false, notes: [] });
    expect(e.sources).toHaveLength(1);
  });
  it("adds new sources and keeps wording", () => {
    const e = mk(inc("Send quote"));
    const r = mergeInto(e, inc("Quote send", { source: src("b.md") }));
    expect(r.changed).toBe(true);
    expect(e.sources).toHaveLength(2);
    expect(e.task).toBe("Send quote");
  });
  it("never reopens a done item", () => {
    const e = mk(inc("Send quote", { checked: true }));
    expect(e.status).toBe("done");
    expect(e.doneAt).toBe(NOW);
    mergeInto(e, inc("Send quote", { source: src("b.md") }));
    expect(e.status).toBe("done");
    expect(e.doneAt).toBe(NOW);
  });
  it("checked incoming leaves open item open and adds a note", () => {
    const e = mk(inc("Send quote"));
    const r = mergeInto(e, inc("Send quote", { checked: true, source: src("b.md") }));
    expect(e.status).toBe("open");
    expect(e.doneAt).toBeNull();
    expect(r.notes).toEqual(["marked done in b.md, still open locally"]);
  });
  it("backfills due but keeps an existing one", () => {
    const e = mk(inc("Send quote"));
    mergeInto(e, inc("Send quote", { due: "2026-09-04", dueRaw: "by Friday", source: src("b.md") }));
    expect(e.due).toBe("2026-09-04");
    mergeInto(e, inc("Send quote", { due: "2026-10-01", dueRaw: "later", source: src("c.md") }));
    expect(e.due).toBe("2026-09-04");
    expect(e.dueRaw).toBe("by Friday");
  });
  it("upgrades ambiguous to resolved when incoming is a candidate", () => {
    const e = mk(inc("Draft plan", AMB));
    mergeInto(e, inc("Draft plan", { owner: "Priya Nair", source: src("b.md") }));
    expect(e).toMatchObject({ owner: "Priya Nair", ownerStatus: "resolved", ownerCandidates: [] });
    const e2 = mk(inc("Draft plan", AMB));
    mergeInto(e2, inc("Draft plan", { owner: "Sam Okafor", source: src("b.md") }));
    expect(e2.ownerStatus).toBe("ambiguous");
  });
});
