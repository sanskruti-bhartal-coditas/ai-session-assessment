import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const failRename = vi.hoisted(() => ({ on: false }));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    renameSync: (...args: Parameters<typeof actual.renameSync>) => {
      if (failRename.on) throw new Error("simulated rename failure");
      return actual.renameSync(...args);
    },
  };
});

const { loadStore, saveStore } = await import("../../src/core/store.js");
const { StoreError } = await import("../../src/core/errors.js");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "actiontrack-rename-"));
  failRename.on = false;
});
afterEach(() => {
  failRename.on = false;
  rmSync(dir, { recursive: true, force: true });
});

describe("saveStore when the rename step fails", () => {
  it("keeps the original file, removes the temp file, and throws StoreError", () => {
    const path = join(dir, "store.json");
    saveStore(path, { version: 1, nextId: 1, items: [] });
    const before = readFileSync(path, "utf8");

    failRename.on = true;
    expect(() => saveStore(path, { version: 1, nextId: 9, items: [] })).toThrow(StoreError);
    expect(() => saveStore(path, { version: 1, nextId: 9, items: [] })).toThrow(/simulated rename failure/);

    failRename.on = false;
    expect(readFileSync(path, "utf8")).toBe(before);
    expect(existsSync(`${path}.tmp`)).toBe(false);
    expect(loadStore(path).nextId).toBe(1);
  });
});
