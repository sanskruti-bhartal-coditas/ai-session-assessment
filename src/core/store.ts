import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { StoreError } from "./errors.js";
import type { Store } from "./types.js";

export function emptyStore(): Store {
  return { version: 1, nextId: 1, items: [] };
}

/** Loads the store. A missing file yields an empty store; anything else invalid throws StoreError. */
export function loadStore(path: string): Store {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyStore();
    throw new StoreError(`cannot read store ${path}: ${(err as Error).message}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new StoreError(`store ${path} is not valid JSON`);
  }
  return validateStore(data, path);
}

function validateStore(data: unknown, path: string): Store {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new StoreError(`store ${path} has an unexpected shape`);
  }
  const s = data as Record<string, unknown>;
  if (s.version !== 1) {
    throw new StoreError(`store ${path} has unsupported version ${String(s.version)}`);
  }
  if (!Number.isInteger(s.nextId) || (s.nextId as number) < 1 || !Array.isArray(s.items)) {
    throw new StoreError(`store ${path} has an unexpected shape`);
  }
  let maxId = 0;
  for (const item of s.items) {
    const id = (item as { id?: unknown } | null)?.id;
    if (!Number.isInteger(id) || (id as number) < 1) {
      throw new StoreError(`store ${path} contains an item without a valid id`);
    }
    maxId = Math.max(maxId, id as number);
  }
  if ((s.nextId as number) <= maxId) {
    throw new StoreError(
      `store ${path} has nextId ${String(s.nextId)} not above its highest item id ${maxId}`,
    );
  }
  return data as Store;
}

/**
 * Atomically saves the store: serialise first, write a temp file, then rename over the target.
 * A failure at any step leaves the previous file untouched.
 */
export function saveStore(path: string, store: Store): void {
  const json = JSON.stringify(store, null, 2) + "\n"; // may throw before any file is touched
  const tmp = `${path}.tmp`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmp, json, "utf8");
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw new StoreError(`cannot write store ${path}: ${(err as Error).message}`);
  }
}

/** Returns the next id and advances the counter. Ids are never reused. */
export function allocateId(store: Store): number {
  return store.nextId++;
}
