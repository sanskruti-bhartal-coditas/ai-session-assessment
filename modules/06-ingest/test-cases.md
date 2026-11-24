# 06-ingest: Test Cases

Derived from [spec.md](spec.md) and scenarios 1, 2, 6, 8 and 9 in [REQUIREMENTS.md](../../REQUIREMENTS.md). Status shows whether a case is automated in `tests/ingest/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

Tests use temporary folders and temporary store paths, and a fixed `--today`. Sample-folder cases use `notes/` (36 files: 35 `.md`, 1 `.txt`).

## Folder argument

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| FA-01 | Folder does not exist | `ingest ./nope` | `UsageError` (exit 2); no store file created | GAP |
| FA-02 | Path is a file | `ingest notes/untitled.md` | `UsageError` (exit 2); nothing written | GAP |
| FA-03 | Empty folder | no files | exit 0; `filesSeen: 0`; store saved (or left empty) without error | GAP |
| FA-04 | Folder with no `.md` files | only `.txt` | exit 0; all files listed as ignored; no items | GAP |
| FA-05 | Files processed in name order | files `b.md`, `a.md` | `a.md` processed first (ids assigned in that order) | GAP |
| FA-06 | Subfolders | `.md` inside a subfolder | not read (spec lists the folder's files only); decide and document | GAP |

## File handling

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| FH-01 | Non-`.md` file ignored | `2026-09-19-offsite-draft.txt` | in `filesIgnored`, not in `filesSkipped`, not parsed | GAP |
| FH-02 | Binary note | `scratch.md` | `filesSkipped` has `binary or non-text content`; run continues | GAP |
| FH-03 | Empty note | `2026-09-09-notes-final-v2.md` | skipped, `empty file` | GAP |
| FH-04 | No header | `untitled.md` | skipped, `no meeting header (date/attendees missing)` | GAP |
| FH-05 | No usable meeting date | note with `Date: junk`, filename without a date | skipped, reason `no usable meeting date` | GAP |
| FH-06 | Date falls back to filename | `2026-10-03-sales-pipeline.md` (`sometime last week`) | parsed; warning `date "sometime last week" not parseable, used filename date` | GAP |
| FH-07 | Header-only note | header, zero items | counted as parsed; warning `no action items found`; 0 items added | GAP |
| FH-08 | Uppercase extension | `NOTES.MD` | decide and document (spec says "ending in `.md`") | GAP |
| FH-09 | Unreadable file | file with no read permission (or a directory named `x.md`) | skipped with a reason; run continues, exit 0 | GAP |
| FH-10 | Sample folder counts | `notes/` | 35 `.md` seen, 32 parsed, 3 skipped, 1 ignored | GAP |
| FH-11 | Skipped are all reported | sample folder | report names `scratch.md`, `2026-09-09-notes-final-v2.md`, `untitled.md` with reasons | GAP |

## Item creation

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| IC-01 | New item fields | one `- [ ] Priya to send X by Friday` in a Tue 2026-09-01 note with Priya Nair attending | stored `owner`, `ownerRaw`, `task`, `taskKey`, `due: 2026-09-04`, `dueRaw`, `status: open`, one source with file, meetingDate, line | GAP |
| IC-02 | Ids allocated in order | two new items | ids 1 and 2; `nextId` 3 | GAP |
| IC-03 | `[x]` item | `- [x] Sam to ...` | stored `done`, `doneAt` set | GAP |
| IC-04 | Everyone expansion | `Everyone to submit goals` with 9 attendees | 9 items, one per attendee, same task, each with its own owner | GAP |
| IC-05 | Everyone with no attendees | no attendees | one unassigned item (or none) plus warning; never a crash | GAP |
| IC-06 | Everyone items dedupe per person | same Everyone line ingested in two meetings | each person's item merges, sources grow | GAP |
| IC-07 | Unassigned item | `- [ ] write the changelog` | `owner: null`, `ownerStatus: unassigned`; counted in `unassigned` | GAP |
| IC-08 | Ambiguous owner | offsite `Priya to own the hiring plan` | `owner: null`, `ownerStatus: ambiguous`, candidates `Priya Nair`, `Priya Shah`; counted in `ambiguous` | GAP |
| IC-09 | `Priya N.` resolves | go/no-go note | `owner: Priya Nair`, resolved | GAP |
| IC-10 | No due date | `- [ ] Sam to chase the vendor` | `due: null`; counted in `noDueDate` | GAP |
| IC-11 | Unresolvable due | `by end of next week` | `due: null`, `dueRaw` kept; warning `due phrase "end of next week" not resolved` with file name | GAP |
| IC-12 | `knownPeople` is the union of attendees seen so far | a name absent from this meeting but present in an earlier file | resolved with warning `owner not in attendee list` | GAP |
| IC-13 | `knownPeople` order dependence | same name in an earlier file vs a later file | defined behaviour (files are processed in name order); document | GAP |
| IC-14 | Table row and `ACTION:` items | offsite note | both become items with correct sources and line numbers | GAP |
| IC-15 | Nested items | offsite nested checkbox | stored as its own item | GAP |
| IC-16 | `ownerRaw` preserved | `Priya N.` | `ownerRaw` is `Priya N.` | GAP |

## Merge and dedupe during a run

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| MG-01 | Same task in three weekly notes (scenario 6) | quote-portal weekly notes | one item, three sources | GAP |
| MG-02 | Merge counted | the case above | `itemsMerged` counts the 2 merges; `itemsAdded` counts 1 | GAP |
| MG-03 | Same wording, different owners | two notes | two items | GAP |
| MG-04 | Merge within the same run, same file | duplicate lines in one note | one item, two sources (different lines) | GAP |
| MG-05 | Later `[x]` on an open local item | second ingest with `[x]` | item stays open; `notes` has `marked done in <file>, still open locally` | GAP |
| MG-06 | Ambiguous then clear mention | `Priya` ambiguous in offsite, later `Priya N.` for the same task | item upgraded to resolved `Priya Nair` | GAP |
| MG-07 | Due filled by a later note | earlier item no due, later same task with due | due taken | GAP |

## Idempotency and local state (scenario 2)

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| ID-01 | Second ingest adds nothing | ingest `notes/` twice | second report `itemsAdded: 0`; `itemsUnchanged` equals the first run's added plus merged candidates | GAP |
| ID-02 | Store content identical | compare `items` after run 1 and run 2 | equal (ignoring any timestamps the spec allows to change; none expected) | GAP |
| ID-03 | Done survives re-ingest | ingest, mark item 5 done, ingest again | item 5 still `done`, `doneAt` unchanged | GAP |
| ID-04 | No duplicates after done | same as above | item count unchanged | GAP |
| ID-05 | Ids stable | ingest twice | same ids on the same items | GAP |
| ID-06 | Ids never reused | ingest, remove nothing, ingest new folder | new ids continue from `nextId` | GAP |
| ID-07 | Added files on second run | add one new note, ingest again | only that file's new items added | GAP |
| ID-08 | Edited note on second run | change a due date in a note | existing item keeps its due; no duplicate | GAP |

## Store writes and failures

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| SW-01 | Saved once at the end | spy on `saveStore` | called exactly once per run | GAP |
| SW-02 | No write on bad folder | FA-01 | store file absent or unchanged | GAP |
| SW-03 | Corrupt store | store file contains `{nope` | `StoreError` (exit 3); file untouched | GAP |
| SW-04 | Unwritable store location | store path under a file | exit 3 with a clear message | GAP |
| SW-05 | Failure mid-run keeps the old store | force an exception after some files | store file unchanged (no partial state) | GAP |
| SW-06 | New store created | no store file yet | created with items and `nextId` | GAP |

## Report and output

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| RP-01 | Header line | sample run | `Ingested <seen> files: <parsed> parsed, <skipped> skipped, <ignored> ignored` | GAP |
| RP-02 | Items line | sample run | `Items: <added> added, <merged> merged, <unchanged> unchanged` | GAP |
| RP-03 | Attention line | sample run | `Needs attention: <n> unassigned, <n> ambiguous owner, <n> no due date` | GAP |
| RP-04 | Skipped section | sample run | lists each skipped file as `  <file>: <reason>` | GAP |
| RP-05 | Warnings section | sample run | lists each warning as `  <file>: <message>` | GAP |
| RP-06 | Empty sections omitted | clean folder | no `Skipped:` or `Warnings:` headings | GAP |
| RP-07 | Counters consistent | any run | `filesParsed + filesSkipped.length` equals the number of `.md` files | GAP |
| RP-08 | `filesSeen` definition | sample run | decide whether ignored files count in `filesSeen` (spec example: 36 files = 33 + 3 + ... + 1 ignored); document | GAP |
| RP-09 | Exit code with skipped notes | sample run | exit 0 | GAP |

## Acceptance (from REQUIREMENTS.md)

| ID | Scenario | Expected | Status |
|---|---|---|---|
| AC-01 | 1: ingest the sample folder | summary shows parsed, added, merged, skipped; exit 0 | GAP |
| AC-02 | 2: ingest, `done 5`, ingest | no duplicates; item 5 stays done | GAP |
| AC-03 | 6: three weekly notes, differently worded | one item, three sources | GAP |
| AC-04 | 8: no owner or no date | listed and labelled, flagged on ingest | GAP |
| AC-05 | 9: `scratch.md`, `untitled.md`, empty file, `.txt` | skipped or ignored and reported; all others processed | GAP |
