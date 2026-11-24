# 08-done: Test Cases

Derived from [spec.md](spec.md) and scenario 12 in [REQUIREMENTS.md](../../REQUIREMENTS.md). Status shows whether a case is automated in `tests/done/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

Fixture store: item 5 (`Priya Nair`, task `send the deck`, open), item 6 (unassigned, task `write changelog`, open), item 7 (`Sam Okafor`, done, `doneAt` `2026-10-01T09:00:00.000Z`).

## Argument validation (exit 2, `UsageError`)

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| AV-01 | Non-numeric | `done abc` | exit 2, `id must be a positive integer` | GAP |
| AV-02 | Zero | `done 0` | exit 2, same message | GAP |
| AV-03 | Negative | `done -1` | exit 2, same message | GAP |
| AV-04 | Decimal | `done 1.5` | exit 2, same message | GAP |
| AV-05 | Numeric with suffix | `done 5x` | exit 2 (not parsed as 5) | GAP |
| AV-06 | Hex or exponent | `done 0x5`, `done 1e1` | exit 2 | GAP |
| AV-07 | Missing argument | `done` | exit 2 (usage) | GAP |
| AV-08 | Extra arguments | `done 5 6` | exit 2 or defined behaviour; never marks both silently | GAP |
| AV-09 | Leading zeros | `done 05` | decide (accept as 5 or reject); documented | GAP |
| AV-10 | Whitespace | `done " 5 "` | decide; documented | GAP |
| AV-11 | Huge number | `done 99999999999999999999` | exit 1 `no such item` or exit 2; never a crash or wrong id | GAP |
| AV-12 | Validation precedes store access | `done abc` with a corrupt store | exit 2, not 3 | GAP |
| AV-13 | No write on bad argument | any AV case | store file unchanged | GAP |

## Not found (exit 1, `NotFoundError`)

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| NF-01 | Unknown id (scenario 12) | `done 9999` | exit 1, stderr `error: no such item: 9999` | GAP |
| NF-02 | Empty store | `done 1` | exit 1, `no such item: 1` | GAP |
| NF-03 | Missing store file | `done 1` | exit 1 (empty store), no store file created | GAP |
| NF-04 | Id was never reused | an id removed from `items` | `no such item`, not a different item | GAP |
| NF-05 | No write on not found | NF-01 | store file unchanged | GAP |

## Marking done

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| MD-01 | Open item | `done 5` | `status: "done"`, `doneAt` is a valid ISO timestamp, store saved | GAP |
| MD-02 | Output line | `done 5` | stdout `Marked done: #5 Priya Nair: send the deck` | GAP |
| MD-03 | Unassigned item output | `done 6` | `Marked done: #6 UNASSIGNED: write changelog` (decide label; documented) | GAP |
| MD-04 | Ambiguous item output | done on an ambiguous item | owner label consistent with `list` (`? Priya (Nair\|Shah)`) | GAP |
| MD-05 | `doneAt` uses the real clock | `done 5` | `doneAt` is current time (not the `--today` date); within a few seconds of now | GAP |
| MD-06 | Other items untouched | `done 5` | every other item byte-identical | GAP |
| MD-07 | Fields preserved | `done 5` | `due`, `sources`, `owner`, `task`, `taskKey` unchanged | GAP |
| MD-08 | Exit code | `done 5` | 0 | GAP |
| MD-09 | `nextId` unchanged | `done 5` | `nextId` unchanged | GAP |
| MD-10 | Overdue item | done on an overdue item | becomes done; no longer overdue in `list` | GAP |

## Already done

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| AD-01 | Repeat | `done 5` twice | second prints `Already done: #5`, exit 0 | GAP |
| AD-02 | `doneAt` unchanged | after the second call | equal to the first call's `doneAt` | GAP |
| AD-03 | No save | second call | store file not rewritten (mtime and bytes unchanged) | GAP |
| AD-04 | Item done from a note (`[x]`) | `done 7` | `Already done: #7`; `doneAt` unchanged | GAP |

## Store failures

| ID | Case | Setup | Expected | Status |
|---|---|---|---|---|
| SF-01 | Corrupt store | file contains `{nope` | exit 3; file untouched | GAP |
| SF-02 | Unwritable store | save fails | exit 3; error on stderr; original file intact | GAP |
| SF-03 | Atomic write | mid-write failure | old store still valid | GAP |

## Integration

| ID | Case | Expected | Status |
|---|---|---|---|
| IN-01 | `done 5` then `list --status done` | includes item 5 | GAP |
| IN-02 | `done 5` then `ingest` again (scenario 2) | item 5 still done; no duplicates | GAP |
| IN-03 | `done 5` then `followup` for the owner | item 5 absent from the email | GAP |
