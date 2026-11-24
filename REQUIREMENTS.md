# actiontrack: Requirements and Scenarios

## Decisions
- Node.js with TypeScript.
- Storage is a single JSON file, `.actiontrack/store.json`. Writes are atomic (write to a temp file, then rename).
- Gmail drafts are created through the Gmail MCP connector (`create_draft`). The tool never calls `send_message`.
- "Today" is the system date. A `--today YYYY-MM-DD` override exists for tests and demos.

## Commands
1. `ingest <folder>`
   - Parses `*.md` only.
   - Extracts date, attendees, and items (owner, task, due, source file, status).
   - Resolves relative dates against the meeting date.
   - Dedupes items across meetings.
   - Is idempotent and never resets local `done` state.
   - Prints a summary with skipped notes and reasons.
2. `list [--owner] [--status open|done|overdue] [--due-before <date>]`
   - Filters combine.
   - Overdue is computed at read time (open and due < today).
   - Unowned and undated items are shown, labelled.
3. `done <id>`
   - Marks an item done.
   - Gives a clear error for an unknown id.
   - Is a no-op if the item is already done.
4. `followup <owner>`
   - Builds one email with overdue items first, then open ones.
   - Creates a Gmail draft and never sends.
   - Stops with a clear message if the owner is ambiguous or has no email address.

## Edge-case rules
| Case | Behaviour |
|---|---|
| Duplicates | Normalise the task text. Same owner and matching task is one item, with all source meetings recorded. |
| No owner | Owner is `UNASSIGNED`. It is listed and flagged on ingest, and excluded from follow-ups. |
| No due date | Due is null. It is never overdue and is shown as "no date". |
| Same first name | Resolve with the meeting's attendee list. One match is used. Several matches or none is ambiguous, and the tool never guesses. |
| Malformed note | Skip it, report file and reason, and continue. The tool never crashes. |
| Bad meeting date | Fall back to the filename date and warn. If neither is usable, skip the note. |
| Unresolvable due | "mid-X" is the 15th, "EOD" is the meeting date, anything else is null with a warning. |
| "Everyone to..." | Expands to one item per attendee. |
| Formats | Parses `-`, `*` and `+` checkboxes (`[ ]`, `[x]`, `[X]`), nested items, table rows, and `ACTION:` lines. |
| Status | `[x]` in a note marks done. Local state wins on re-ingest. |
| Ids | Stable integers, never reused. |
| Due today | Not overdue. Overdue means strictly past. |

## Scenarios (acceptance tests)
1. Ingest the sample folder. The summary shows files parsed, items added, duplicates merged, and malformed notes skipped. Exit code is 0.
2. Ingest, run `done 5`, ingest again. There are no duplicates and item 5 stays done.
3. "by Friday" in a note dated Tuesday 2026-09-01 gives due 2026-09-04.
4. With today = 2026-11-24, an open item due earlier is overdue. A done item with a past due date is not.
5. `list --owner "Karan Joshi" --status overdue --due-before 2026-10-15` returns only the matching items.
6. The same task worded differently in three weekly notes appears once, with three sources.
7. In the offsite note, bare "Priya" and "Rahul" are flagged ambiguous. In the go/no-go note, "Priya N." resolves to Priya Nair.
8. Items with no owner or no date are listed and labelled. Unowned items are excluded from follow-ups.
9. `scratch.md` (binary), `untitled.md`, the empty file, and the `.txt` file are skipped and reported. All other files are processed.
10. `followup "Karan Joshi"` creates exactly one Gmail draft, overdue items first. Nothing is sent. The draft id is printed.
11. If Gmail is unavailable, the command exits non-zero with a clear message and no partial state.
12. `done 9999` gives "no such item". `followup Priya` lists the matching Priyas and asks the user to choose.

## Resolved
- **Gmail (option A):** `followup <owner>` writes the email as a JSON payload (`to`, `subject`, `body`) to `outbox/`. Claude then creates the draft through the Gmail MCP `create_draft`. The CLI never talks to Gmail and never sends.
- **Recipient emails:** `people.json` maps full name to email. If a person is missing, the To field is blank and the CLI warns.
