# 03-dates: Test Cases

Derived from [spec.md](spec.md). Status shows whether a case is automated in `tests/dates/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

Calendar anchors used below: 2026-09-01 is a Tuesday, 2026-09-04 a Friday, 2026-09-07 a Monday, 2026-09-14 a Monday.

## `parseMeetingDate(dateRaw, filename)`

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| M-01 | ISO date | `("2026-09-01", "x.md")` | `{ date: "2026-09-01" }`, no warning | GAP |
| M-02 | Day-month-year words | `("9 September 2026", "x.md")` | `2026-09-09` | GAP |
| M-03 | Weekday prefix | `("Monday, 14 September 2026", "x.md")` | `2026-09-14` | GAP |
| M-04 | Case-insensitive month | `("9 SEPTEMBER 2026", ...)`, `("9 sep 2026", ...)` | `2026-09-09` | GAP |
| M-05 | Unparseable, filename has date | `("sometime last week", "2026-10-03-sales-pipeline.md")` | `2026-10-03` with warning `date "sometime last week" not parseable, used filename date` | GAP |
| M-06 | Unparseable, no filename date | `("sometime last week", "untitled.md")` | `{ date: null, warning: ... }` | GAP |
| M-07 | `null` raw, filename has date | `(null, "2026-09-23-standup.md")` | `2026-09-23`; a warning is returned | GAP |
| M-08 | `null` raw, no filename date | `(null, "notes.md")` | `{ date: null, warning }` | GAP |
| M-09 | Invalid calendar date in raw | `("2026-02-30", "2026-09-01-x.md")` | treated as unparseable, filename date used with warning | GAP |
| M-10 | Invalid calendar date in filename | `("junk", "2026-13-45-x.md")` | `date: null` | GAP |
| M-11 | Filename date only counts when leading | `("junk", "notes-2026-09-01.md")` | `date: null` | GAP |
| M-12 | Leap day | `("2028-02-29", ...)` valid; `("2026-02-29", ...)` unparseable | as stated | GAP |
| M-13 | Surrounding whitespace | `("  2026-09-01  ", ...)` | `2026-09-01` | GAP |
| M-14 | Sample note dates | all 35 `.md` sample files (raw date + filename) | every file yields a date; only `2026-10-03-sales-pipeline.md` carries the fallback warning | GAP |

## `resolveDue(dueRaw, meetingDate)`

| ID | Case | Input (M = meeting date) | Expected | Status |
|---|---|---|---|---|
| D-01 | `null` due | `(null, "2026-09-01")` | `{ due: null }`, no warning | GAP |
| D-02 | ISO date | `("2026-09-08", M)` | `2026-09-08` | GAP |
| D-03 | Weekday after M (Tue meeting) | `("Friday", "2026-09-01")` | `2026-09-04` (acceptance) | GAP |
| D-04 | Same weekday as M is next week | `("Friday", "2026-09-04")` | `2026-09-11` (acceptance) | GAP |
| D-05 | All weekday names | `Monday` to `Sunday` from `2026-09-01` | 09-07, 09-02, 09-03, 09-04, 09-05, 09-06, 09-08 | GAP |
| D-06 | Weekday abbreviations seen in notes | `Mon`, `Wed` from `2026-09-01` | `2026-09-07`, `2026-09-02` | GAP |
| D-07 | Weekday case-insensitive | `friday`, `FRIDAY` | same as `Friday` | GAP |
| D-08 | `tomorrow` | `("tomorrow", "2026-09-30")` | `2026-10-01` (month rollover) | GAP |
| D-09 | `today` | `("today", M)` | M | GAP |
| D-10 | `EOD` and `end of day` | `("EOD", M)`, `("end of day", M)` | M | GAP |
| D-11 | `EOD tomorrow` (sample note) | `("EOD tomorrow", "2026-09-21")` | not in the spec table; must be `null` with warning `due phrase "EOD tomorrow" not resolved` unless the spec is extended | GAP |
| D-12 | `Oct 3rd` | `("Oct 3rd", "2026-09-30")` | `2026-10-03` | GAP |
| D-13 | `7 Oct` | `("7 Oct", "2026-09-30")` | `2026-10-07` | GAP |
| D-14 | `15 October` | `("15 October", "2026-09-30")` | `2026-10-15` | GAP |
| D-15 | `Oct 5th` | `("Oct 5th", "2026-09-30")` | `2026-10-05` | GAP |
| D-16 | Ordinal suffixes | `1st`, `2nd`, `3rd`, `4th` | days 1 to 4 | GAP |
| D-17 | Month abbreviations | `Jan`, `Feb`, ..., `Dec` | each resolves | GAP |
| D-18 | Month name case-insensitive | `OCT 3RD`, `oct 3rd` | `2026-10-03` | GAP |
| D-19 | Year rollover forward | `("3 Jan", "2026-12-20")` (about 11.5 months before M) | `2027-01-03` | GAP |
| D-20 | Date shortly before M stays in M's year | `("25 Aug", "2026-09-01")` | `2026-08-25` | GAP |
| D-21 | `mid-October` | `("mid-October", M)` | `2026-10-15` | GAP |
| D-22 | `mid October` | `("mid October", M)` | `2026-10-15` | GAP |
| D-23 | `next week` from Tuesday | `("next week", "2026-09-01")` | `2026-09-07` | GAP |
| D-24 | `next week` from Monday | `("next week", "2026-09-07")` | `2026-09-14` (strictly after M) | GAP |
| D-25 | Unresolvable phrase | `("end of next week", M)` | `{ due: null, warning: 'due phrase "end of next week" not resolved' }` | GAP |
| D-26 | Other unresolvable phrases from notes | `end of month`, `next Tuesday`, `Wed 16 Sep`, `mid-October` boundary | each is either resolved per the table or `null` with the exact warning; none throws | GAP |
| D-27 | Invalid day, not rolled over | `("31 Feb", M)`, `("Oct 32", M)`, `("2026-02-30", M)` | `due: null` with warning, never a rolled-over date | GAP |
| D-28 | 31-day month edge | `("31 Oct", M)` valid; `("31 Sep", M)` invalid | as stated | GAP |
| D-29 | Month-end arithmetic | `("tomorrow", "2026-12-31")` | `2027-01-01` | GAP |
| D-30 | Leap-year arithmetic | `("tomorrow", "2028-02-28")` | `2028-02-29` | GAP |
| D-31 | No timezone dependence | run with `TZ` set to `Pacific/Kiritimati` and `Pacific/Pago_Pago` | identical results | GAP |
| D-32 | Empty or whitespace due | `("", M)`, `("   ", M)` | `due: null` (decide: with or without warning) | GAP |

## `isOverdue(item, today)`

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| V-01 | Open, due before today | `{open, 2026-10-10}`, today `2026-11-24` | `true` | GAP |
| V-02 | Open, due today | `{open, 2026-11-24}`, today `2026-11-24` | `false` (strict) | GAP |
| V-03 | Open, due after today | `{open, 2026-12-01}` | `false` | GAP |
| V-04 | Done, due before today | `{done, 2026-10-10}` | `false` | GAP |
| V-05 | Open, no due date | `{open, null}` | `false` | GAP |
| V-06 | Done, no due date | `{done, null}` | `false` | GAP |
| V-07 | Day-before boundary | `{open, 2026-11-23}`, today `2026-11-24` | `true` | GAP |
| V-08 | Year boundary | `{open, 2026-12-31}`, today `2027-01-01` | `true` | GAP |
| V-09 | Purity | call twice, then inspect item | item object unchanged; nothing stored | GAP |
