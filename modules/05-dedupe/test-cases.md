# 05-dedupe: Test Cases

Derived from [spec.md](spec.md). Status shows whether a case is automated in `tests/dedupe/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

## `normaliseTask`

| ID | Case | Input | Expected key | Status |
|---|---|---|---|---|
| N-01 | Lowercase | `Send Quote` | `send quote` | GAP |
| N-02 | Stop words removed | `Send the revised quote to Acme` | `send revised quote acme` | GAP |
| N-03 | All stop words | `the a an to of for by and` | empty key | GAP |
| N-04 | Punctuation stripped | `Send quote, now!` | `send quote now` | GAP |
| N-05 | Markdown emphasis stripped | `**Send** the _quote_` | `send quote` | GAP |
| N-06 | Whitespace collapsed | `send   the \t quote` | `send quote` | GAP |
| N-07 | Idempotent | `normaliseTask(normaliseTask(x))` | equals `normaliseTask(x)` | GAP |
| N-08 | Word order preserved or not | `Send Acme the revised quote` | tokens `send acme revised quote` (order irrelevant to similarity) | GAP |
| N-09 | Numbers and symbols kept sensibly | `Cut costs by 10%` | `cut costs 10` (decide whether `%` is dropped) | GAP |
| N-10 | Apostrophes | `Pull Acme's usage report` | stable key; same input always the same key | GAP |
| N-11 | Unicode (sample note dashes) | `Send quote — now` | em dash treated as punctuation | GAP |
| N-12 | Empty input | `""` | `""`, no throw | GAP |

## `similarity` (token-set Jaccard)

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| S-01 | Identical keys | `("a b c", "a b c")` | `1` | GAP |
| S-02 | Disjoint keys | `("a b", "c d")` | `0` | GAP |
| S-03 | Same tokens, different order | `("send acme quote", "send quote acme")` | `1` | GAP |
| S-04 | 4 of 5 shared | `("a b c d", "a b c d e")` | `0.8` | GAP |
| S-05 | 3 of 5 shared | `("a b c", "a b c d e")` | `0.6` | GAP |
| S-06 | Duplicate tokens count once | `("a a b", "a b")` | `1` | GAP |
| S-07 | Symmetric | `similarity(x, y)` vs `similarity(y, x)` | equal | GAP |
| S-08 | Both empty | `("", "")` | defined value (decide `0` or `1`), never `NaN` | GAP |
| S-09 | One empty | `("", "a b")` | `0` | GAP |
| S-10 | Range | any pair | result between 0 and 1 inclusive | GAP |

## `findMatch`

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| F-01 | Reworded task, same owner (acceptance) | existing `Send the revised quote to Acme`, candidate `Send Acme the revised quote`, owner Priya Nair both | returns the existing item | GAP |
| F-02 | Same wording, different owner | existing owner Priya Nair, candidate owner Rahul Mehta | `null` | GAP |
| F-03 | Below threshold | similarity 0.6 (S-05 tokens), same owner | `null` | GAP |
| F-04 | Exactly at threshold | similarity 0.8, same owner | match (`>=`) | GAP |
| F-05 | Unassigned only matches unassigned | existing unassigned, candidate unassigned | match | GAP |
| F-06 | Unassigned vs resolved | existing owned, candidate unassigned (same text) | `null` | GAP |
| F-07 | Ambiguous matches same ambiguous | both `ownerRaw: "Priya"`, same candidates | match | GAP |
| F-08 | Ambiguous with different `ownerRaw` or candidates | `Priya` vs `Rahul`, or different candidate lists | `null` | GAP |
| F-09 | Ambiguous vs resolved | existing ambiguous `Priya`, candidate resolved `Priya Nair` | `null` from `findMatch` (upgrade happens only inside `mergeInto` of an already matched item) | GAP |
| F-10 | Several matches, highest similarity wins | two existing items at 0.8 and 1.0 | the 1.0 item | GAP |
| F-11 | Tie on similarity, lowest id wins | two existing items at equal similarity | the lower id | GAP |
| F-12 | Empty store | `existing: []` | `null` | GAP |
| F-13 | Done items still match | existing item is `done` | match (so a later `[ ]` mention cannot create a duplicate) | GAP |
| F-14 | Owner compare is full-name equality | `Priya Nair` vs `priya nair` stored with different case | defined behaviour (owners come from 04, so canonical) | GAP |
| F-15 | Sample weekly notes (scenario 6) | `Send the revised quote to Acme`, `Send revised quote to Acme`, `Send the revised quote to Acme` across three notes | all three map to one item | GAP |

## `mergeInto`

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| M-01 | New source added | existing has `a.md:9`; incoming `b.md:10` | `sources` has both; `changed: true` | GAP |
| M-02 | Same file and line | incoming `a.md:9` again | no duplicate source; `changed: false` (idempotent re-ingest) | GAP |
| M-03 | Same file, different line | incoming `a.md:12` | added as a new source | GAP |
| M-04 | Done stays done | existing `done`, incoming `[ ]` | stays `done`, `doneAt` unchanged | GAP |
| M-05 | Open plus incoming checked | existing `open`, incoming checked | stays `open`; notes contain `marked done in <file>, still open locally` | GAP |
| M-06 | Open plus incoming unchecked | existing `open` | stays `open`, no note | GAP |
| M-07 | Done plus incoming checked | existing `done`, incoming checked | stays `done`, no note | GAP |
| M-08 | Existing due kept | existing due `2026-10-01`, incoming `2026-10-09` | due stays `2026-10-01` | GAP |
| M-09 | Missing due filled | existing `null`, incoming `2026-10-09` | due becomes `2026-10-09`; `changed: true`; `dueRaw` follows | GAP |
| M-10 | Incoming has no due | existing has due | unchanged | GAP |
| M-11 | Owner kept | existing `Priya Nair`, incoming same | unchanged | GAP |
| M-12 | Ambiguous upgraded | existing ambiguous with candidates Nair/Shah, incoming resolved `Priya Nair` | `owner`, `ownerStatus: "resolved"`, `ownerCandidates: []`; `changed: true` | GAP |
| M-13 | Upgrade only to a candidate | existing ambiguous (Nair/Shah), incoming resolved `Rahul Mehta` | stays ambiguous | GAP |
| M-14 | Task wording kept | existing `Send the revised quote`, incoming reworded | `task` and `taskKey` unchanged | GAP |
| M-15 | Id unchanged | any merge | `id` unchanged | GAP |
| M-16 | Identical re-ingest | merge identical incoming | `changed: false`, `notes: []` | GAP |
| M-17 | Multiple changes in one merge | new source and due fill | `changed: true`, all applied | GAP |

## First-ingest status

| ID | Case | Expected | Status |
|---|---|---|---|
| FS-01 | New item with `[x]` | stored `done` with `doneAt` set to the ingest time | GAP |
| FS-02 | New item with `[ ]` | stored `open`, `doneAt: null` | GAP |
| FS-03 | `doneAt` format | ISO timestamp | GAP |

## Constants and acceptance

| ID | Case | Expected | Status |
|---|---|---|---|
| C-01 | `SIMILARITY_THRESHOLD` | exported, equals `0.8` initially | GAP |
| AC-01 | Reworded same-owner tasks merge | see F-01 | GAP |
| AC-02 | Same wording, different owners stay separate | see F-02 | GAP |
| AC-03 | Re-ingesting an identical file | adds no sources, `changed: false` | GAP |
| AC-04 | A done item is never reopened by a later `[ ]` mention | see M-04 | GAP |
| AC-05 | Threshold tuning against sample notes | run over `notes/`; review near-miss pairs (0.6 to 0.8) with the user before changing the constant | GAP |
