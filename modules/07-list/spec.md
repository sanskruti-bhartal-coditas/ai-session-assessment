# 07-list: Spec

## Command
`actiontrack list [--owner <name>] [--status open|done|overdue] [--due-before <date>]`

## Filters (combined with AND)
- `--owner <name>`: case-insensitive. A full name matches exactly. A single token matches the first or last name of resolved owners. The special values `unassigned` and `ambiguous` match items with that `ownerStatus`.
- `--status`:
  - `open`: status is open (includes overdue items).
  - `done`: status is done.
  - `overdue`: open and due strictly before today.
  Any other value is a `UsageError`.
- `--due-before <date>`: items with a due date strictly before the date. Items with no due date are excluded. The date must be ISO (`YYYY-MM-DD`), otherwise `UsageError`.

## Sorting
Overdue first, then by due date ascending, items with no due date last, then by id.

## Output
Table with columns `ID`, `OWNER`, `TASK`, `DUE`, `STATUS`, `SOURCE`.
- `OWNER`: full name; `UNASSIGNED`; or `? Priya (Nair|Shah)` for ambiguous.
- `DUE`: ISO date, or `no date`.
- `STATUS`: `open`, `done`, or `overdue`.
- `SOURCE`: first source file, plus `+N more` when the item appeared in several notes.
- Long tasks are truncated with an ellipsis (width from the terminal, default 100).
- A footer line `N items`. An empty result prints `No items match.` and exits 0.

## Exit codes
0 on success (including no matches), 2 for bad arguments.

## Acceptance
- Scenario 4: with `--today 2026-11-24`, an open item due 2026-10-10 shows `overdue`, and a done item with the same date shows `done`.
- Scenario 5: `list --owner "Karan Joshi" --status overdue --due-before 2026-10-15` returns only items meeting all three.
- Scenario 8: unowned and undated items appear, labelled.
