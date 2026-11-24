# 07-list: Test Cases

Derived from [spec.md](spec.md) and scenarios 4, 5 and 8 in [REQUIREMENTS.md](../../REQUIREMENTS.md). Status shows whether a case is automated in `tests/list/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

Fixture store (today = `2026-11-24`):

| id | owner | status | due | sources |
|---|---|---|---|---|
| 1 | Karan Joshi | open | 2026-10-10 | `a.md` |
| 2 | Karan Joshi | done | 2026-10-10 | `a.md` |
| 3 | Karan Joshi | open | 2026-10-20 | `b.md`, `c.md`, `d.md` |
| 4 | Priya Nair | open | 2026-11-24 | `e.md` |
| 5 | Priya Nair | open | 2026-12-01 | `e.md` |
| 6 | unassigned | open | null | `f.md` |
| 7 | ambiguous `Priya` (Nair, Shah) | open | 2026-10-01 | `g.md` |
| 8 | Sam Okafor | open | null | `h.md` |

## `--status`

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| ST-01 | Overdue | `--status overdue` | ids 7, 1, 3 shown as `overdue` (open, due strictly before today) | GAP |
| ST-02 | Open includes overdue | `--status open` | ids 1, 3, 4, 5, 6, 7, 8 (overdue ones included) | GAP |
| ST-03 | Done | `--status done` | id 2 only | GAP |
| ST-04 | Due today is not overdue | `--status overdue` | id 4 absent; shown as `open` in other lists | GAP |
| ST-05 | Done item with past due (scenario 4) | `list` | id 1 shows `overdue`, id 2 shows `done` | GAP |
| ST-06 | Invalid status | `--status late` | `UsageError`, exit 2 | GAP |
| ST-07 | Status is case-sensitive or not | `--status OPEN` | decide and document; must not crash | GAP |
| ST-08 | Empty value | `--status ""` | `UsageError` | GAP |

## `--owner`

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| OW-01 | Full name | `--owner "Karan Joshi"` | ids 1, 2, 3 | GAP |
| OW-02 | Full name case-insensitive | `--owner "karan joshi"` | ids 1, 2, 3 | GAP |
| OW-03 | First name token | `--owner Karan` | ids 1, 2, 3 | GAP |
| OW-04 | Last name token | `--owner Joshi` | ids 1, 2, 3 | GAP |
| OW-05 | Token matches several people | `--owner Priya` (Nair and Shah owners exist in the store) | items of every resolved Priya; ambiguous items are not matched by name | GAP |
| OW-06 | `unassigned` | `--owner unassigned` | id 6 | GAP |
| OW-07 | `ambiguous` | `--owner ambiguous` | id 7 | GAP |
| OW-08 | `unassigned` keyword case-insensitive | `--owner UNASSIGNED` | id 6 | GAP |
| OW-09 | No such owner | `--owner Dave` | `No items match.`, exit 0 | GAP |
| OW-10 | Partial token does not match | `--owner Kar` | no match (tokens are whole first or last names) | GAP |
| OW-11 | Resolved-only matching | `--owner Priya` | id 7 (ambiguous) is excluded because only resolved owners match a name | GAP |
| OW-12 | Whitespace around value | `--owner " Karan "` | trimmed and matched | GAP |

## `--due-before`

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| DB-01 | Strictly before | `--due-before 2026-10-20` | ids 1, 2, 7 (id 3 due on the date is excluded) | GAP |
| DB-02 | No-date items excluded | `--due-before 2027-01-01` | ids 6 and 8 absent | GAP |
| DB-03 | Bad format | `--due-before 24-11-2026` | `UsageError`, exit 2 | GAP |
| DB-04 | Invalid calendar date | `--due-before 2026-02-30` | `UsageError`, exit 2 | GAP |
| DB-05 | Not a date | `--due-before tomorrow` | `UsageError`, exit 2 | GAP |
| DB-06 | Missing value | `--due-before` with no argument | `UsageError`, exit 2 | GAP |

## Combined filters (scenario 5)

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| CF-01 | Three filters | `--owner "Karan Joshi" --status overdue --due-before 2026-10-15` | id 1 only | GAP |
| CF-02 | Filters are ANDed | `--owner Karan --status done` | id 2 only | GAP |
| CF-03 | Filters that exclude everything | `--owner Sam --status overdue` | `No items match.`, exit 0 | GAP |
| CF-04 | Option order does not matter | permute the flags in CF-01 | same output | GAP |
| CF-05 | Repeated flag | `--status open --status done` | decide: error or last wins; documented, no crash | GAP |

## Sorting

| ID | Case | Expected | Status |
|---|---|---|---|
| SO-01 | Full order for the fixture | overdue first by due date (7, 1, 3), then the rest by due date (2 done 2026-10-10, 4, 5), then no-date items by id (6, 8): `7, 1, 3, 2, 4, 5, 6, 8` | GAP |
| SO-02 | Done items are not overdue | id 2 (done, due 2026-10-10) sorts among non-overdue items by its due date, not in the overdue group | GAP |
| SO-03 | Tie on due date | ids ordered ascending | GAP |
| SO-04 | All no-date items | ordered by id | GAP |
| SO-05 | Sorting is stable across runs | same output twice | GAP |

## Output format

| ID | Case | Expected | Status |
|---|---|---|---|
| OF-01 | Columns | header `ID  OWNER  TASK  DUE  STATUS  SOURCE` | GAP |
| OF-02 | Resolved owner | full name | GAP |
| OF-03 | Unassigned owner | `UNASSIGNED` | GAP |
| OF-04 | Ambiguous owner | `? Priya (Nair\|Shah)` | GAP |
| OF-05 | Due | ISO date, or `no date` | GAP |
| OF-06 | Source, single | first source file only | GAP |
| OF-07 | Source, several | `b.md +2 more` for id 3 | GAP |
| OF-08 | Long task truncated | task longer than the width ends with an ellipsis and the line fits the width | GAP |
| OF-09 | Default width | non-TTY output uses width 100 | GAP |
| OF-10 | Terminal width respected | `process.stdout.columns` of 60 | lines no wider than 60 | GAP |
| OF-11 | Footer | `8 items` (plural), `1 items` or `1 item` (decide and document) | GAP |
| OF-12 | Empty result | `No items match.` and exit 0 | GAP |
| OF-13 | Empty store | `No items match.` or equivalent; exit 0 | GAP |
| OF-14 | Missing store file | treated as empty store; exit 0 | GAP |
| OF-15 | Corrupt store | exit 3 with `error: ...` on stderr | GAP |
| OF-16 | Unicode/wide characters in a task | no crash; truncation does not split a surrogate pair | GAP |
| OF-17 | Task containing newlines or tabs | rendered on one row | GAP |

## Read-only and `--today`

| ID | Case | Expected | Status |
|---|---|---|---|
| RO-01 | `list` never writes the store | store file bytes and mtime unchanged | GAP |
| RO-02 | `--today` changes overdue | `--today 2026-10-05` makes id 1 `open`, not overdue | GAP |
| RO-03 | Overdue is not stored | store has no `overdue` status value | GAP |
| RO-04 | Invalid `--today` | `UsageError`, exit 2 | GAP |
| RO-05 | Unknown option | `--bogus` | exit 2 | GAP |

## Acceptance

| ID | Scenario | Expected | Status |
|---|---|---|---|
| AC-01 | 4: `--today 2026-11-24` | open item due 2026-10-10 is `overdue`; done item same date is `done` | GAP |
| AC-02 | 5: Karan, overdue, before 2026-10-15 | only items meeting all three | GAP |
| AC-03 | 8: no owner, no date | listed and labelled `UNASSIGNED` and `no date` | GAP |
