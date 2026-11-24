import { NotFoundError, UsageError } from "../core/errors.js";
import type { Item, Store } from "../core/types.js";

export type MarkDoneResult =
  | { kind: "marked"; item: Item }
  | { kind: "already"; item: Item }
  | { kind: "missing" };

/** Parses a CLI id argument; throws UsageError unless it is a positive integer. */
export function parseId(raw: string): number {
  if (!/^\d+$/.test(raw.trim())) throw new UsageError("id must be a positive integer");
  const id = Number(raw.trim());
  if (!Number.isSafeInteger(id) || id < 1) throw new UsageError("id must be a positive integer");
  return id;
}

/** Marks an item done. Mutates only when the item is open; an already-done item is left untouched. */
export function markDone(store: Store, id: number, now: Date): MarkDoneResult {
  const item = store.items.find((i) => i.id === id);
  if (!item) return { kind: "missing" };
  if (item.status === "done") return { kind: "already", item };
  item.status = "done";
  item.doneAt = now.toISOString();
  return { kind: "marked", item };
}

/** Command logic: returns the line to print. Saves only when something changed. */
export function runDone(
  idArg: string,
  deps: { load: () => Store; save: (s: Store) => void; now: Date },
): string {
  const id = parseId(idArg);
  const store = deps.load();
  const res = markDone(store, id, deps.now);
  if (res.kind === "missing") throw new NotFoundError(`no such item: ${id}`);
  if (res.kind === "already") return `Already done: #${id}`;
  deps.save(store);
  return `Marked done: #${id} ${res.item.owner ?? "unassigned"}: ${res.item.task}`;
}
