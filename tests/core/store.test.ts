import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StoreError } from "../../src/core/errors.js";
import { allocateId, emptyStore, loadStore, saveStore } from "../../src/core/store.js";
import type { Item, Store } from "../../src/core/types.js";

let dir: string;
let path: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "actiontrack-"));
  path = join(dir, ".actiontrack", "store.json");
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const item = (id: number): Item => ({
  id,
  owner: "Karan Joshi",
  ownerRaw: "Karan",
  ownerStatus: "resolved",
  ownerCandidates: [],
  task: "do it",
  taskKey: "do it",
  due: null,
  dueRaw: null,
  status: "open",
  sources: [{ file: "a.md", meetingDate: "2026-09-01", line: 3 }],
  createdAt: "2026-09-01T00:00:00.000Z",
  doneAt: null,
});

describe("store", () => {
  it("returns an empty store when the file is missing", () => {
    expect(loadStore(path)).toEqual({ version: 1, nextId: 1, items: [] });
  });

  it("round-trips and creates the parent directory", () => {
    const s: Store = { version: 1, nextId: 3, items: [item(1), item(2)] };
    saveStore(path, s);
    expect(loadStore(path)).toEqual(s);
  });

  it("leaves no temp file behind", () => {
    saveStore(path, emptyStore());
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  it("rejects invalid JSON, naming the path", () => {
    saveStore(path, emptyStore());
    writeFileSync(path, "{nope");
    expect(() => loadStore(path)).toThrow(StoreError);
    expect(() => loadStore(path)).toThrow(path);
  });

  it("rejects an unsupported version", () => {
    saveStore(path, emptyStore());
    writeFileSync(path, JSON.stringify({ version: 2, nextId: 1, items: [] }));
    expect(() => loadStore(path)).toThrow(/unsupported version/);
  });

  it("rejects a wrong shape", () => {
    saveStore(path, emptyStore());
    writeFileSync(path, JSON.stringify({ version: 1, items: [] }));
    expect(() => loadStore(path)).toThrow(/unexpected shape/);
    writeFileSync(path, "[]");
    expect(() => loadStore(path)).toThrow(/unexpected shape/);
  });

  it("rejects a nextId that would reuse an existing id", () => {
    saveStore(path, emptyStore());
    writeFileSync(path, JSON.stringify({ version: 1, nextId: 2, items: [item(2)] }));
    expect(() => loadStore(path)).toThrow(/nextId/);
  });

  it("keeps the original file intact when saving fails", () => {
    const good: Store = { version: 1, nextId: 2, items: [item(1)] };
    saveStore(path, good);
    const before = readFileSync(path, "utf8");
    // A BigInt cannot be serialised, so this fails before any file is touched.
    const bad = { version: 1, nextId: 5, items: [{ ...item(4), id: 10n }] } as unknown as Store;
    expect(() => saveStore(path, bad)).toThrow();
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  it("wraps filesystem failures in StoreError", () => {
    const blocker = join(dir, "file");
    writeFileSync(blocker, "x");
    expect(() => saveStore(join(blocker, "store.json"), emptyStore())).toThrow(StoreError);
  });

  it("rejects items that is not an array", () => {
    saveStore(path, emptyStore());
    writeFileSync(path, JSON.stringify({ version: 1, nextId: 1, items: {} }));
    expect(() => loadStore(path)).toThrow(/unexpected shape/);
  });

  it.each([0, 1.5, "2", -1, null])("rejects nextId %j", (bad) => {
    saveStore(path, emptyStore());
    writeFileSync(path, JSON.stringify({ version: 1, nextId: bad, items: [] }));
    expect(() => loadStore(path)).toThrow(StoreError);
  });

  it.each([{}, { id: 0 }, { id: "1" }, { id: 1.5 }, null])("rejects an item without a valid id: %j", (bad) => {
    saveStore(path, emptyStore());
    writeFileSync(path, JSON.stringify({ version: 1, nextId: 5, items: [bad] }));
    expect(() => loadStore(path)).toThrow(/valid id/);
  });

  it("wraps an unreadable path (a directory) in StoreError", () => {
    mkdirSync(path, { recursive: true });
    expect(() => loadStore(path)).toThrow(StoreError);
    expect(() => loadStore(path)).toThrow(/cannot read store/);
  });

  it("writes pretty-printed JSON with 2-space indent and a trailing newline", () => {
    const s: Store = { version: 1, nextId: 2, items: [item(1)] };
    saveStore(path, s);
    expect(readFileSync(path, "utf8")).toBe(JSON.stringify(s, null, 2) + "\n");
  });

  it("replaces the previous content when saving twice", () => {
    saveStore(path, { version: 1, nextId: 2, items: [item(1)] });
    const second: Store = { version: 1, nextId: 4, items: [item(3)] };
    saveStore(path, second);
    expect(loadStore(path)).toEqual(second);
  });

  it("does not reuse an id after its item is removed", () => {
    const s: Store = { version: 1, nextId: 4, items: [item(1), item(2), item(3)] };
    s.items = s.items.filter((i) => i.id !== 3);
    saveStore(path, s);
    expect(allocateId(loadStore(path))).toBe(4);
  });

  it("allocates strictly increasing ids across save/load", () => {
    const s = emptyStore();
    const a = allocateId(s);
    const b = allocateId(s);
    saveStore(path, s);
    const loaded = loadStore(path);
    const c = allocateId(loaded);
    expect([a, b, c]).toEqual([1, 2, 3]);
  });
});
