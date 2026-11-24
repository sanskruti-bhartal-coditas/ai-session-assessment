# 01-core: Test Cases

Derived from [spec.md](spec.md). Status shows whether a case is automated in `tests/core/` today. `GAP` means the spec requires it but no test covers it yet.

## Store: `loadStore`

| ID | Case | Input / setup | Expected | Status |
|---|---|---|---|---|
| S-01 | Missing file | path does not exist | returns `{ version: 1, nextId: 1, items: [] }` | `store.test.ts` "returns an empty store..." |
| S-02 | Valid file | saved store with 2 items | returns an equal store | `store.test.ts` "round-trips..." |
| S-03 | Invalid JSON | file contains `{nope` | throws `StoreError`, message contains the path | `store.test.ts` "rejects invalid JSON..." |
| S-04 | Unknown version | `version: 2` | throws `StoreError` matching `unsupported version` | `store.test.ts` "rejects an unsupported version" |
| S-05 | Missing `nextId` | `{ version: 1, items: [] }` | throws `StoreError` matching `unexpected shape` | `store.test.ts` "rejects a wrong shape" |
| S-06 | Top-level not an object | file contains `[]` | throws `StoreError` matching `unexpected shape` | `store.test.ts` "rejects a wrong shape" |
| S-07 | `items` not an array | `items: {}` | throws `StoreError` | `store.test.ts "rejects items that is not an array"` |
| S-08 | `nextId` not a positive integer | `nextId: 0`, `1.5`, `"2"` | throws `StoreError` | `store.test.ts "rejects nextId ..." (0, 1.5, "2", -1, null)` |
| S-09 | `nextId` would reuse an id | `nextId: 2`, an item with `id: 2` | throws `StoreError` matching `nextId` | `store.test.ts` "rejects a nextId..." |
| S-10 | Item without a valid id | item `{}` or `id: 0` | throws `StoreError` matching `valid id` | `store.test.ts "rejects an item without a valid id"` |
| S-11 | Unreadable path | path is a directory | throws `StoreError` (not a raw fs error) | `store.test.ts "wraps an unreadable path..."` |

## Store: `saveStore`

| ID | Case | Input / setup | Expected | Status |
|---|---|---|---|---|
| W-01 | Parent directory missing | path inside a directory that does not exist | directory created, file written | `store.test.ts` "round-trips and creates the parent directory" |
| W-02 | No temp file left | normal save | `<path>.tmp` does not exist afterwards | `store.test.ts` "leaves no temp file behind" |
| W-03 | Serialisation failure keeps original | existing store, then save a store containing a BigInt | throws; original file bytes unchanged; no `.tmp` | `store.test.ts` "keeps the original file intact..." |
| W-04 | Filesystem failure | parent path is a file, not a directory | throws `StoreError` | `store.test.ts` "wraps filesystem failures in StoreError" |
| W-05 | Output format | save any store | file is pretty-printed JSON with 2-space indent and a trailing newline | `store.test.ts "writes pretty-printed JSON..."` |
| W-06 | Overwrite | save twice to the same path | second content replaces the first | `store.test.ts "replaces the previous content..."` |
| W-07 | Rename failure keeps original | simulate `renameSync` throwing | original file unchanged, `.tmp` removed, `StoreError` | `store.rename.test.ts (mocks renameSync)` |

## Store: `allocateId`

| ID | Case | Input / setup | Expected | Status |
|---|---|---|---|---|
| A-01 | First id | empty store | returns 1, `nextId` becomes 2 | `store.test.ts` "allocates strictly increasing ids..." |
| A-02 | Increases across calls | allocate twice | 1 then 2 | same test |
| A-03 | Persists across save/load | allocate, save, load, allocate | next id continues (3), never repeats | same test |
| A-04 | Not reused after removal | allocate ids 1 to 3, remove item 3 from `items`, save, load, allocate | returns 4 | `store.test.ts "does not reuse an id after..."` |

## Clock: `today`

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| T-01 | Valid override | `"2026-11-24"` | returns it unchanged | `clock.test.ts` "returns a valid override" |
| T-02 | Month out of range | `"2026-13-01"` | `UsageError` | `clock.test.ts` (it.each) |
| T-03 | Day out of range | `"2026-02-30"` | `UsageError` | `clock.test.ts` (it.each) |
| T-04 | Wrong format | `"24-11-2026"` | `UsageError` | `clock.test.ts` (it.each) |
| T-05 | Not a date | `"tomorrow"` | `UsageError` | `clock.test.ts` (it.each) |
| T-06 | Empty string override | `""` | `UsageError` (not treated as "no override") | `clock.test.ts` (it.each) |
| T-07 | No override | none | system local date, `YYYY-MM-DD`, valid | `clock.test.ts` "defaults to the system date..." |
| T-08 | Leap day | `2028-02-29` valid, `2026-02-29` invalid | as stated | `clock.test.ts` "accepts leap days..." |
| T-09 | Error message | invalid override | message names the bad value and the expected format | `clock.test.ts "names the bad value..."` |
| T-10 | System date uses local time | fake timers set to local 23:30 on a given date | returns that local date, not the UTC date | `clock.test.ts "uses the local calendar date, not UTC"` |

## Config: `resolveConfig`

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| G-01 | Defaults | no overrides, no env, `cwd = /work` | `.actiontrack/store.json`, `people.json`, `outbox` under `cwd` | `config.test.ts` "uses defaults relative to cwd" |
| G-02 | Override beats env | `store` override and `ACTIONTRACK_STORE` set | override wins | `config.test.ts` "prefers overrides over env..." |
| G-03 | Env beats default | `ACTIONTRACK_PEOPLE` set | env value used | `config.test.ts` "prefers overrides over env..." |
| G-04 | Unset values fall back | only store set | other paths use defaults | `config.test.ts` "prefers overrides over env..." |
| G-05 | `ACTIONTRACK_OUTBOX` env | env set, no override | env value used | `config.test.ts "reads ACTIONTRACK_OUTBOX..."` |
| G-06 | Each override independently | only `people` or only `outbox` override | only that path changes | `config.test.ts "applies each override independently"` |

## Errors

| ID | Case | Expected | Status |
|---|---|---|---|
| E-01 | Exit codes | `NotFoundError` 1, `UsageError` 2, `StoreError` 3 | `config.test.ts` "carry the documented exit codes" |
| E-02 | Error names | `new UsageError("x").name === "UsageError"` | `config.test.ts` |
| E-03 | Instances are `Error` | each is `instanceof Error` and `instanceof ActiontrackError`, message preserved | `config.test.ts "is an Error and an ActiontrackError..."` |

## Spec acceptance criteria

| Acceptance (from spec) | Covered by |
|---|---|
| Saving then loading returns an equal store | S-02 |
| A failure between the temp write and the rename leaves the original file intact | W-03 (serialise step) and W-07 (rename step) |
| Ids are strictly increasing across save/load cycles | A-01 to A-03 |

## Summary

- Automated: 45 tests in 4 files (`store.test.ts`, `store.rename.test.ts`, `clock.test.ts`, `config.test.ts`), all passing.
- Open gaps: none. Every case in this file is covered.
- `store.rename.test.ts` is a separate file because it mocks `node:fs` for the whole module.
- S-08 and S-10 pin down validation behaviour the spec only implies ("wrong shape"), so they document the current implementation.
