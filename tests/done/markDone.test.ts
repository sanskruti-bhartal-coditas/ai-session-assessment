import { describe, expect, it, vi } from "vitest";
import { NotFoundError, UsageError } from "../../src/core/errors.js";
import type { Item, Store } from "../../src/core/types.js";
import { markDone, parseId, runDone } from "../../src/done/index.js";

const item = (id: number, over: Partial<Item> = {}): Item => ({
  id, owner: "Karan Joshi", ownerRaw: "Karan", ownerStatus: "resolved", ownerCandidates: [],
  task: "send deck", taskKey: "send deck", due: null, dueRaw: null, status: "open",
  sources: [], createdAt: "2026-09-01T00:00:00.000Z", doneAt: null, ...over,
});
const mk = (): Store => ({ version: 1, nextId: 10, items: [item(5)] });
const now = new Date("2026-11-24T10:00:00.000Z");

describe("parseId", () => {
  it("accepts positive integers", () => expect(parseId("5")).toBe(5));
  it.each(["abc", "0", "-1", "1.5", "", "5x"])("rejects %j", (v) => {
    expect(() => parseId(v)).toThrow(UsageError);
    expect(() => parseId(v)).toThrow("id must be a positive integer");
  });
});

describe("markDone", () => {
  it("marks an open item done", () => {
    const s = mk();
    expect(markDone(s, 5, now).kind).toBe("marked");
    expect(s.items[0]).toMatchObject({ status: "done", doneAt: now.toISOString() });
  });
  it("is a no-op when already done, keeping doneAt", () => {
    const s = mk();
    markDone(s, 5, now);
    const r = markDone(s, 5, new Date("2027-01-01T00:00:00Z"));
    expect(r.kind).toBe("already");
    expect(s.items[0].doneAt).toBe(now.toISOString());
  });
  it("reports missing ids", () => expect(markDone(mk(), 9999, now).kind).toBe("missing"));
});

describe("runDone", () => {
  it("saves and prints on marked; skips save on repeat", () => {
    const s = mk();
    const save = vi.fn();
    const deps = { load: () => s, save, now };
    expect(runDone("5", deps)).toBe("Marked done: #5 Karan Joshi: send deck");
    expect(save).toHaveBeenCalledTimes(1);
    expect(runDone("5", deps)).toBe("Already done: #5");
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("throws NotFoundError for unknown id without saving", () => {
    const save = vi.fn();
    const deps = { load: mk, save, now };
    expect(() => runDone("9999", deps)).toThrow(NotFoundError);
    expect(() => runDone("9999", deps)).toThrow("no such item: 9999");
    expect(save).not.toHaveBeenCalled();
  });
  it("throws UsageError for invalid id", () => {
    expect(() => runDone("abc", { load: mk, save: vi.fn(), now })).toThrow(UsageError);
  });
});
