# Module breakdown

Each module folder holds `plan.md` (why and how), `spec.md` (exact behaviour and API), and `tasks.md` (checklist). Requirements live in `../REQUIREMENTS.md`.

| # | Module | Responsibility | Depends on |
|---|---|---|---|
| 01 | core | types, JSON store, ids, clock, config, errors | none |
| 02 | parser | one note's text into header and raw items | 01 |
| 03 | dates | meeting date, due phrase resolution, overdue | 01 |
| 04 | owners | owner resolution, same-first-name handling, people.json | 01 |
| 05 | dedupe | normalise, match and merge duplicate items | 01 |
| 06 | ingest | `ingest` command orchestration and report | 01 to 05 |
| 07 | list | `list` command and filters | 01, 03 |
| 08 | done | `done` command | 01 |
| 09 | followup | `followup` command, payload, Gmail hand-off | 01, 03, 04 |
| 10 | cli | entry point, wiring, exit codes, README | all |

## Suggested build order
01, then 03 / 04 / 02 (independent), then 05, 06, then 07 / 08 / 09, then 10.

## Requirement coverage
| Requirement | Module(s) |
|---|---|
| ingest, malformed notes | 02, 06 |
| due date resolution | 03 |
| duplicates | 05 |
| no owner, no date | 02, 04, 06, 07 |
| same first name | 04 |
| list and filters, overdue | 03, 07 |
| done | 08 |
| followup, never sends | 09 |
