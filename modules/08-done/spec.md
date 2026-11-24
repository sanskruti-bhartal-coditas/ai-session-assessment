# 08-done: Spec

## Command
`actiontrack done <id>`

## Behaviour
- `<id>` must be a positive integer, otherwise `UsageError` (exit 2): `id must be a positive integer`.
- No item with that id: `NotFoundError` (exit 1): `no such item: <id>`.
- Item is open: set `status: "done"` and `doneAt` to the current ISO timestamp, save, and print `Marked done: #<id> <owner>: <task>`.
- Item is already done: print `Already done: #<id>` and exit 0. Do not save.

## Acceptance
- `done 5` then `list --status done` includes item 5.
- `done 5` again prints "Already done" and does not change `doneAt`.
- `done 9999` exits 1 with `no such item: 9999`.
- `done abc` exits 2.
- Re-ingest after `done 5` leaves item 5 done (covered by the 05-dedupe and 06-ingest tests).
