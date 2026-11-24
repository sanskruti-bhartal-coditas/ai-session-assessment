# 10-cli: Spec

## Commands
```
actiontrack ingest <folder>
actiontrack list [--owner <name>] [--status open|done|overdue] [--due-before <date>]
actiontrack done <id>
actiontrack followup <owner> [--force]
```

## Global options
- `--today <YYYY-MM-DD>`: override today's date (for demos and tests).
- `--store <path>`, `--people <path>`, `--outbox <path>`: override the defaults from 01-core config.
- `--help`, `--version`.

## Exit codes
| Code | Meaning |
|---|---|
| 0 | success, including "no items match" and skipped notes during ingest |
| 1 | not found (unknown id or owner) |
| 2 | usage error (bad argument, ambiguous owner, existing outbox file) |
| 3 | store unreadable or corrupt |
| 4 | unexpected internal error |

## Error output
- Errors go to stderr as `error: <message>`. Normal output goes to stdout.
- A stack trace is shown only with `ACTIONTRACK_DEBUG=1`.

## Build and run
- `npm run dev -- <command>` runs from TypeScript via tsx.
- `npm run build` compiles to `dist/`. `dist/cli.js` has a `#!/usr/bin/env node` shebang so the `actiontrack` bin works after `npm link`.

## README
Covers install, the four commands with examples, the data files (`store.json`, `people.json`, `outbox/`), the Gmail hand-off procedure, and the edge-case rules.

## Acceptance
- Every scenario 1 to 12 in REQUIREMENTS.md passes end to end through the CLI.
- `actiontrack` with no arguments prints help and exits 2.
- An unknown command exits 2.
