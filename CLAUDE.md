# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`actiontrack` is a Node/TypeScript CLI that reads markdown meeting notes, tracks action items, and prepares follow-up emails. **No application code exists yet.** Only the project setup (`package.json`, `tsconfig.json`) and the design docs are in place. The design is awaiting user approval, so do not start implementing until the user approves it.

Source of truth, in this order:
- [REQUIREMENTS.md](REQUIREMENTS.md): decisions, edge-case rules, and 12 acceptance scenarios.
- `modules/<NN>-<name>/{plan,spec,tasks}.md`: one folder per module (01-core to 10-cli). `modules/README.md` has the dependency table and build order (01, then 02/03/04, then 05, 06, then 07/08/09, then 10).

Implementation is meant to follow the `tasks.md` checklists. Tick the boxes as tasks complete.

## Commands

- `npm run dev -- <command> [args]`: run the CLI from TypeScript (tsx on `src/cli.ts`)
- `npm run build`: compile `src` to `dist/` (`dist/cli.js` is the `actiontrack` bin)
- `npm run typecheck`: `tsc --noEmit`
- `npm test`: run vitest once
- Single test file: `npx vitest run tests/<file>.test.ts`. Single test by name: `npx vitest run -t "<name>"`.

There is no linter configured.

## Architecture (planned)

Pipeline for `ingest`: **parser** (raw header and items, no interpretation) → **dates** (meeting date, due phrases) → **owners** (full-name resolution against attendees) → **dedupe** (match and merge against the store) → **store** (one JSON file, saved once at the end). `list`, `done` and `followup` are thin commands over the store. `cli.ts` only wires commands, and business logic lives in the modules so it is testable without the CLI.

Decisions that span modules and are easy to get wrong:
- **Gmail is never called from the CLI.** `followup` writes a payload (`to`, `subject`, `body`) to `outbox/<slug>-<date>.json`. Claude then creates the draft through the Gmail MCP `create_draft`. Never call `send_message`.
- **Overdue is computed at read time** (`open` and `due < today`, strict), never stored. "Today" comes from `core/clock`, overridable with `--today` so tests and demos are deterministic. The sample date context is 2026-11-24.
- **Ambiguity is never guessed.** A bare "Priya" (Nair or Shah) or "Rahul" (Mehta or Verma) in a meeting with both is stored as `ownerStatus: "ambiguous"` with candidates, and is excluded from follow-ups. "Priya N." resolves through the attendee list.
- **Local state beats notes.** Re-ingest is idempotent, and a `done` item is never reopened. A `[x]` in a later note does not close a locally open item, it only adds an ingest-report note.
- **Dedupe** matches on same owner plus token-set Jaccard similarity of normalised task text (`SIMILARITY_THRESHOLD`, initially 0.8, to be tuned against the sample notes with the user). Merged items keep every source (file and line).
- **Storage:** a single JSON file at `.actiontrack/store.json`, written atomically (temp file, then rename). Ids are stable integers that are never reused (`nextId` is persisted).
- **Errors map to exit codes:** 0 success (including skipped notes), 1 not found, 2 usage/ambiguous/existing outbox file, 3 store problem, 4 unexpected.
- Dates use UTC calendar arithmetic with no date library. Relative weekdays resolve to the next occurrence strictly after the meeting date.

## Sample data

`notes/` holds 36 files and is deliberately messy: items in `-`, `*`, `+` bullets, nested checkboxes, a markdown table, and `ACTION:` lines. Dates appear as `Date:`, `date:`, `9 September 2026`, or `sometime last week`. Malformed or non-note files include a binary `scratch.md`, an empty `2026-09-09-notes-final-v2.md`, a header-less `untitled.md`, and a `.txt` draft (only `.md` is ingested). Check changes to the parser against these files rather than hand-written fixtures alone.

`people.json` (full name to email) is planned with placeholder `example.com` addresses. The user must replace them before any real drafts are created.
