# 05-dedupe: Spec

## API (`src/dedupe/`)
```ts
normaliseTask(task: string): string               // the taskKey
similarity(keyA: string, keyB: string): number    // 0..1
findMatch(candidate: NewItem, existing: Item[]): Item | null
mergeInto(existing: Item, incoming: NewItem): { changed: boolean; notes: string[] }
const SIMILARITY_THRESHOLD = 0.8
```

## normaliseTask
Lowercase, strip punctuation and markdown emphasis, remove stop words (`the`, `a`, `an`, `to`, `of`, `for`, `by`, `and`), collapse whitespace, keep the remaining tokens. Due phrases are already removed by the parser, so they do not affect the key.

## similarity
Token-set Jaccard index on the key tokens: `|A ∩ B| / |A ∪ B|`.

## findMatch
An existing item matches when both hold:
1. Same owner. For resolved owners the full names are equal. Unassigned items match only other unassigned items. Ambiguous items match only ambiguous items with the same `ownerRaw` and candidates.
2. `similarity(keys) >= SIMILARITY_THRESHOLD`.
If several match, choose the highest similarity, then the lowest id.

## mergeInto (existing item kept, id unchanged)
| Field | Rule |
|---|---|
| `sources` | add the incoming source unless the same `file` and `line` is already there |
| `status` | if existing is `done`, stay `done` (local state wins). If existing is `open` and the incoming is checked, stay `open` and add the note `marked done in <file>, still open locally` |
| `due` | keep the existing due. If the existing has none and the incoming has one, take the incoming |
| `owner` | keep existing. If the existing is ambiguous and the incoming is resolved to one of the candidates, upgrade to resolved |
| `task` | keep the existing wording |

`changed` is false when nothing was added (an idempotent re-ingest).

## First-ingest status
A new item with a checked box (`[x]`) is stored as `done`, with `doneAt` set to the ingest time.

## Acceptance
- "Send the revised quote to Acme" and "Send Acme the revised quote" (same owner) merge.
- The same wording with different owners does not merge.
- Re-ingesting an identical file adds no sources and returns `changed: false`.
- A done item is never reopened by a later `[ ]` mention.
