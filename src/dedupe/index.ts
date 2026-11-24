import type { ISODate, Item, OwnerStatus, Source } from "../core/types.js";

/** Minimum token-set Jaccard similarity for two task keys to match. */
export const SIMILARITY_THRESHOLD = 0.8;

const STOP_WORDS = new Set(["the", "a", "an", "to", "of", "for", "by", "and"]);

/** An item produced by parsing + owner/date resolution, not yet in the store. */
export interface NewItem {
  owner: string | null;
  ownerRaw: string | null;
  ownerStatus: OwnerStatus;
  ownerCandidates: string[];
  task: string;
  due: ISODate | null;
  dueRaw: string | null;
  /** True when the note had a checked box. */
  checked: boolean;
  source: Source;
}

/** Normalise task text into the taskKey. */
export function normaliseTask(task: string): string {
  return task
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t))
    .join(" ");
}

function tokens(key: string): Set<string> {
  return new Set(key.split(/\s+/).filter((t) => t.length > 0));
}

/** Token-set Jaccard index of two keys, 0..1. */
export function similarity(keyA: string, keyB: string): number {
  const a = tokens(keyA);
  const b = tokens(keyB);
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function sameOwner(a: NewItem | Item, b: NewItem | Item): boolean {
  if (a.ownerStatus !== b.ownerStatus) return false;
  if (a.ownerStatus === "resolved") return a.owner !== null && a.owner === b.owner;
  if (a.ownerStatus === "unassigned") return true;
  const ca = [...a.ownerCandidates].sort().join("|");
  const cb = [...b.ownerCandidates].sort().join("|");
  return a.ownerRaw === b.ownerRaw && ca === cb;
}

/** Best matching existing item (highest similarity, then lowest id), or null. */
export function findMatch(candidate: NewItem, existing: Item[]): Item | null {
  const key = normaliseTask(candidate.task);
  let best: Item | null = null;
  let bestScore = -1;
  for (const item of existing) {
    if (!sameOwner(candidate, item)) continue;
    const score = similarity(key, item.taskKey);
    if (score < SIMILARITY_THRESHOLD) continue;
    if (score > bestScore || (score === bestScore && best !== null && item.id < best.id)) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

/** Merge an incoming item into an existing one in place. */
export function mergeInto(existing: Item, incoming: NewItem): { changed: boolean; notes: string[] } {
  const notes: string[] = [];
  let changed = false;

  const seen = existing.sources.some(
    (s) => s.file === incoming.source.file && s.line === incoming.source.line,
  );
  if (!seen) {
    existing.sources.push({ ...incoming.source });
    changed = true;
    if (incoming.checked && existing.status === "open") {
      notes.push(`marked done in ${incoming.source.file}, still open locally`);
    }
  }

  if (existing.due === null && incoming.due !== null) {
    existing.due = incoming.due;
    existing.dueRaw = incoming.dueRaw;
    changed = true;
  }

  if (
    existing.ownerStatus === "ambiguous" &&
    incoming.ownerStatus === "resolved" &&
    incoming.owner !== null &&
    existing.ownerCandidates.includes(incoming.owner)
  ) {
    existing.owner = incoming.owner;
    existing.ownerStatus = "resolved";
    existing.ownerCandidates = [];
    changed = true;
  }

  return { changed, notes };
}

/** Build a new store item from a first-seen incoming item. A checked box is stored done. */
export function createItem(incoming: NewItem, id: number, nowIso: string): Item {
  return {
    id,
    owner: incoming.owner,
    ownerRaw: incoming.ownerRaw,
    ownerStatus: incoming.ownerStatus,
    ownerCandidates: [...incoming.ownerCandidates],
    task: incoming.task,
    taskKey: normaliseTask(incoming.task),
    due: incoming.due,
    dueRaw: incoming.dueRaw,
    status: incoming.checked ? "done" : "open",
    sources: [{ ...incoming.source }],
    createdAt: nowIso,
    doneAt: incoming.checked ? nowIso : null,
  };
}
