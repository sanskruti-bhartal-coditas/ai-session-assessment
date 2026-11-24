# 10-cli: Test Cases

Derived from [spec.md](spec.md) and the 12 scenarios in [REQUIREMENTS.md](../../REQUIREMENTS.md). Status shows whether a case is automated in `tests/cli/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

CLI tests run the built entry (`node dist/cli.js`) or `tsx src/cli.ts` as a child process, with a temp working directory, `--store`, `--people` and `--outbox` pointed at temp paths, and `--today 2026-11-24`. They assert exit code, stdout and stderr separately.

## Help, version and unknown input

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| HV-01 | No arguments | `actiontrack` | help on stdout (or stderr), exit 2 | GAP |
| HV-02 | `--help` | `actiontrack --help` | help listing the four commands and global options; exit 0 | GAP |
| HV-03 | Per-command help | `actiontrack list --help` | usage for `list`; exit 0 | GAP |
| HV-04 | `--version` | `actiontrack --version` | version from `package.json`; exit 0 | GAP |
| HV-05 | Unknown command | `actiontrack frobnicate` | `error: ...` on stderr, exit 2 | GAP |
| HV-06 | Unknown option | `actiontrack list --bogus` | exit 2 | GAP |
| HV-07 | Missing required argument | `actiontrack ingest`, `done`, `followup` | exit 2 each | GAP |
| HV-08 | Help does not touch the store | `--help` with a corrupt store | exit 0 | GAP |

## Global options

| ID | Case | Expected | Status |
|---|---|---|---|
| GO-01 | `--today` | overrides today for `list` overdue and `followup` | GAP |
| GO-02 | `--today` invalid | `--today 2026-13-01` gives exit 2 with the format in the message | GAP |
| GO-03 | `--store <path>` | store read and written at that path; the default `.actiontrack/store.json` is untouched | GAP |
| GO-04 | `--people <path>` | emails read from that file | GAP |
| GO-05 | `--outbox <dir>` | payload written under that directory | GAP |
| GO-06 | Defaults | with no overrides, paths come from 01-core config (`.actiontrack/store.json`, `people.json`, `outbox/`) | GAP |
| GO-07 | Options before or after the command | `--today X list` and `list --today X` | same result | GAP |
| GO-08 | `--today` absent | uses the system date | GAP |
| GO-09 | Global options accepted by every command | `ingest`, `list`, `done`, `followup` | GAP |

## Exit codes

| ID | Case | Trigger | Expected | Status |
|---|---|---|---|---|
| EC-01 | 0 on success | `list` on a valid store | 0 | GAP |
| EC-02 | 0 on no matches | `list --owner Dave` | 0, `No items match.` | GAP |
| EC-03 | 0 with skipped notes | `ingest notes/` | 0 | GAP |
| EC-04 | 1 unknown id | `done 9999` | 1 | GAP |
| EC-05 | 1 unknown owner | `followup Dave` | 1 | GAP |
| EC-06 | 2 bad argument | `done abc` | 2 | GAP |
| EC-07 | 2 ambiguous owner | `followup Priya` | 2 | GAP |
| EC-08 | 2 existing outbox file | second identical `followup` | 2 | GAP |
| EC-09 | 2 bad folder | `ingest ./nope` | 2 | GAP |
| EC-10 | 3 corrupt store | store contains `{nope` | 3 | GAP |
| EC-11 | 3 unsupported store version | `version: 2` | 3 | GAP |
| EC-12 | 4 unexpected error | force an internal exception (e.g. test hook throwing a plain `Error`) | 4 | GAP |

## Error output

| ID | Case | Expected | Status |
|---|---|---|---|
| EO-01 | Errors go to stderr | message on stderr, stdout empty | GAP |
| EO-02 | Format | `error: <message>` | GAP |
| EO-03 | Normal output on stdout | tables and reports on stdout, nothing on stderr | GAP |
| EO-04 | No stack trace by default | stderr has no `at ...` lines | GAP |
| EO-05 | `ACTIONTRACK_DEBUG=1` | stack trace shown | GAP |
| EO-06 | Non-Error throw | `throw "x"` still exits 4 with a message | GAP |
| EO-07 | Warnings are not errors | warning lines do not change the exit code | GAP |

## Build and run

| ID | Case | Expected | Status |
|---|---|---|---|
| BR-01 | `npm run dev -- list` | runs from TypeScript, exit 0 | GAP |
| BR-02 | `npm run build` | compiles to `dist/`, `dist/cli.js` exists | GAP |
| BR-03 | Shebang | first line of `dist/cli.js` is `#!/usr/bin/env node` | GAP |
| BR-04 | `package.json` bin | `actiontrack` maps to `dist/cli.js` | GAP |
| BR-05 | `npm run typecheck` | clean | GAP |
| BR-06 | Built CLI matches dev CLI | same output for the same command | GAP |

## Wiring (cli.ts contains no business logic)

| ID | Case | Expected | Status |
|---|---|---|---|
| WR-01 | Each command delegates | `ingest`, `list`, `done`, `followup` call module functions with parsed options | GAP |
| WR-02 | Typed errors map to codes | `NotFoundError` 1, `UsageError` 2, `StoreError` 3, anything else 4 | GAP |
| WR-03 | Exactly one exit point | the exit code is set in one place | GAP |

## README

| ID | Case | Expected | Status |
|---|---|---|---|
| RM-01 | Install | steps present | GAP |
| RM-02 | Four commands | each documented with an example | GAP |
| RM-03 | Data files | `store.json`, `people.json`, `outbox/` explained | GAP |
| RM-04 | Gmail hand-off | procedure documented, states the CLI never sends | GAP |
| RM-05 | Edge-case rules | table from REQUIREMENTS.md represented | GAP |
| RM-06 | Examples run | every command example in the README works against the sample notes | GAP |

## End-to-end: the 12 acceptance scenarios

Run through the CLI against `notes/`, with `--today 2026-11-24`.

| ID | Scenario | Steps | Expected | Status |
|---|---|---|---|---|
| E2E-01 | 1: ingest sample folder | `ingest notes/` | summary lists parsed, added, merged, skipped; exit 0 | GAP |
| E2E-02 | 2: idempotent, done survives | `ingest`, `done 5`, `ingest` | no duplicates; item 5 stays done; second run adds 0 | GAP |
| E2E-03 | 3: relative weekday | note dated Tuesday 2026-09-01 with "by Friday" | due 2026-09-04 shown in `list` | GAP |
| E2E-04 | 4: overdue | `list` | open item due earlier is `overdue`; a done item with a past due is `done` | GAP |
| E2E-05 | 5: combined filters | `list --owner "Karan Joshi" --status overdue --due-before 2026-10-15` | only matching items | GAP |
| E2E-06 | 6: dedupe across weeks | `list` after ingest | the weekly task appears once, `+2 more` in SOURCE | GAP |
| E2E-07 | 7: ambiguity | `list --owner ambiguous`; `list --owner "Priya Nair"` | offsite `Priya` and `Rahul` flagged ambiguous; go/no-go `Priya N.` is Priya Nair | GAP |
| E2E-08 | 8: no owner or date | `list` | labelled `UNASSIGNED` and `no date`; absent from every follow-up | GAP |
| E2E-09 | 9: malformed notes | `ingest notes/` | `scratch.md`, `untitled.md`, the empty file skipped with reasons; the `.txt` ignored; others processed | GAP |
| E2E-10 | 10: follow-up | `followup "Karan Joshi"` | one payload, overdue first, `Nothing has been sent.`; Claude creates the draft (manual) | GAP + manual |
| E2E-11 | 11: Gmail unavailable | hand-off fails | CLI state unchanged; payload only | GAP |
| E2E-12 | 12: error handling | `done 9999`; `followup Priya` | `no such item: 9999` exit 1; Priyas listed, exit 2, nothing written | GAP |

## Cross-command flows

| ID | Case | Expected | Status |
|---|---|---|---|
| XC-01 | `ingest` then `list` | every stored item is listed | GAP |
| XC-02 | `done` then `followup` | done item absent from the email | GAP |
| XC-03 | `ingest` twice then `followup` twice | second `followup` exits 2 without `--force`, succeeds with it | GAP |
| XC-04 | Fresh directory, no store | `list` and `followup` behave as empty, not as errors | GAP |
| XC-05 | Concurrent runs | two `done` calls at once do not corrupt the store (atomic rename) | GAP |
| XC-06 | Working directory independence | run from a different cwd with absolute `--store` | GAP |
