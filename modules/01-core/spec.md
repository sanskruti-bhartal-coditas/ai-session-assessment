# 01-core: Spec

## Types (`src/core/types.ts`)
```ts
type ISODate = string;              // "YYYY-MM-DD"
type ItemStatus = "open" | "done";
type OwnerStatus = "resolved" | "unassigned" | "ambiguous";

interface Source { file: string; meetingDate: ISODate; line: number; }

interface Item {
  id: number;                       // stable, never reused
  owner: string | null;             // full name, or null if unassigned/ambiguous
  ownerRaw: string | null;          // text as written ("Priya", "Priya N.")
  ownerStatus: OwnerStatus;
  ownerCandidates: string[];        // populated when ambiguous
  task: string;                     // cleaned display text
  taskKey: string;                  // normalised key used for dedupe
  due: ISODate | null;
  dueRaw: string | null;            // phrase as written ("by Friday")
  status: ItemStatus;
  sources: Source[];                // all meetings the item appeared in
  createdAt: string;                // ISO timestamp
  doneAt: string | null;
}

interface Store { version: 1; nextId: number; items: Item[]; }
```

## Store (`src/core/store.ts`)
- `loadStore(path): Store`. A missing file returns an empty store (`version: 1`, `nextId: 1`, `items: []`). Invalid JSON or a wrong shape throws `StoreError` naming the path. An unknown `version` also throws `StoreError`.
- `saveStore(path, store): void`. Writes `<path>.tmp` then renames over `<path>`. Creates the parent directory if needed. Output is pretty-printed JSON (2 spaces).
- `allocateId(store): number`. Returns `store.nextId` and increments it.

## Clock (`src/core/clock.ts`)
- `today(override?: string): ISODate`. Returns the override if given and valid, otherwise the system local date. An invalid override throws `UsageError`.

## Config (`src/core/config.ts`)
- Defaults: store `.actiontrack/store.json`, people `people.json`, outbox `outbox/`, all relative to the current working directory.
- Each can be overridden by an environment variable (`ACTIONTRACK_STORE`, `ACTIONTRACK_PEOPLE`, `ACTIONTRACK_OUTBOX`) or a CLI flag (see 10-cli).

## Errors (`src/core/errors.ts`)
- `UsageError` (exit code 2), `StoreError` (3), `NotFoundError` (1).

## Acceptance
- Saving then loading returns an equal store.
- A simulated failure between the temp write and the rename leaves the original file intact.
- Ids are strictly increasing across save/load cycles.
