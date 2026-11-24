import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
