# 09-followup: Test Cases

Derived from [spec.md](spec.md) and scenarios 10, 11 and 12 in [REQUIREMENTS.md](../../REQUIREMENTS.md). Status shows whether a case is automated in `tests/followup/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

Fixture store (today = `2026-11-24`), with `people.json` containing `Karan Joshi` only:

| id | owner | status | due | first source |
|---|---|---|---|---|
| 1 | Karan Joshi | open | 2026-10-20 | `b.md` |
| 2 | Karan Joshi | open | 2026-10-10 | `a.md` |
| 3 | Karan Joshi | open | 2026-12-01 | `c.md` |
| 4 | Karan Joshi | open | null | `d.md` |
| 5 | Karan Joshi | done | 2026-10-01 | `e.md` |
| 6 | Karan Joshi | open | 2026-11-24 | `f.md` |
| 7 | Priya Nair | open | 2026-10-05 | `g.md` |
| 8 | Priya Shah | open | null | `g.md` |
| 9 | unassigned | open | 2026-10-01 | `h.md` |
| 10 | ambiguous `Priya` | open | 2026-10-01 | `i.md` |

## Owner resolution

| ID | Case | Command | Expected | Status |
|---|---|---|---|---|
| OR-01 | Full name | `followup "Karan Joshi"` | proceeds | GAP |
| OR-02 | Full name case-insensitive | `followup "karan joshi"` | proceeds | GAP |
| OR-03 | First name, one person | `followup Karan` | proceeds | GAP |
| OR-04 | Ambiguous first name (scenario 12) | `followup Priya` | stdout/stderr `"Priya" is ambiguous: Priya Nair, Priya Shah. Use the full name.`; exit 2; no payload written | GAP |
| OR-05 | Unknown owner | `followup Dave` | `NotFoundError` `no items for owner "Dave"`, exit 1 | GAP |
| OR-06 | Only unresolved items exist for the name | `followup unassigned`, `followup ambiguous` | exit 1 `no items for owner ...` (only resolved owners are matched) | GAP |
| OR-07 | Owner known only through done items | owner with only done items | proceeds to selection; result is `has no open items` (not a not-found error) | GAP |
| OR-08 | Missing owner argument | `followup` | exit 2 usage | GAP |
| OR-09 | Empty owner | `followup ""` | exit 2 | GAP |
| OR-10 | Matching rules equal `list --owner` | same inputs through both | same set of items | GAP |
| OR-11 | Ambiguity message lists candidates in a stable order | run twice | same text | GAP |

## Item selection and ordering

| ID | Case | Expected | Status |
|---|---|---|---|
| IS-01 | Only open items | item 5 (done) is excluded | GAP |
| IS-02 | Overdue section | items 2 (2026-10-10) then 1 (2026-10-20), ascending by due | GAP |
| IS-03 | Due today is in OPEN, not OVERDUE | item 6 sits in the OPEN section | GAP |
| IS-04 | Open section order | item 6 (2026-11-24), item 3 (2026-12-01), then item 4 (no date) last | GAP |
| IS-05 | Tie on due date | ordered by id | GAP |
| IS-06 | Other people's items excluded | items 7, 8 never appear in Karan's email | GAP |
| IS-07 | Unassigned never appear (scenario 8) | item 9 absent from every email | GAP |
| IS-08 | Ambiguous never appear | item 10 absent from every email | GAP |
| IS-09 | `--today` shifts overdue | `--today 2026-10-15` moves item 2 to OVERDUE and item 1 to OPEN | GAP |
| IS-10 | Each item shows its first source | item with sources `b.md`, `c.md` | line shows `b.md` only | GAP |
| IS-11 | Everyone-expanded items | a person's item that came from "Everyone to ..." | included like any other | GAP |

## Nothing to send

| ID | Case | Expected | Status |
|---|---|---|---|
| NS-01 | No open items | stdout `Karan Joshi has no open items.`; exit 0 | GAP |
| NS-02 | No payload written | `outbox/` has no new file | GAP |
| NS-03 | No warning about email when nothing to send | no `people.json` warning | GAP |

## Email content

| ID | Case | Expected | Status |
|---|---|---|---|
| EC-01 | Subject | `Follow-up: your open action items (N open, M overdue)` with the real counts (pin whether N includes the overdue items, spec example implies N is all open items) | GAP |
| EC-02 | Greeting | `Hi Karan,` (first name) | GAP |
| EC-03 | Intro line | `Here are your open action items from recent meetings.` | GAP |
| EC-04 | OVERDUE heading | `OVERDUE (2)` with count | GAP |
| EC-05 | OPEN heading | `OPEN (3)` with count of non-overdue open items | GAP |
| EC-06 | Item line with due | `- <task> (due 2026-10-10, from a.md)` | GAP |
| EC-07 | Item line without due | `- <task> (no due date, from d.md)` | GAP |
| EC-08 | Overdue section omitted when empty | no `OVERDUE` text at all | GAP |
| EC-09 | Open section omitted when empty | no `OPEN` text at all | GAP |
| EC-10 | Closing lines | `Reply to me if any of these are already done or need a new date.` then `Thanks` | GAP |
| EC-11 | Plain text | no Markdown, no HTML, `\n` line breaks | GAP |
| EC-12 | Blank-line layout | blank line between greeting, intro, each section and closing | GAP |
| EC-13 | Counts match lines | headings' counts equal the number of bullet lines in each section | GAP |
| EC-14 | Task text with special characters | quotes, ampersands, non-ASCII, em dash | preserved verbatim; JSON stays valid | GAP |
| EC-15 | Long task | not truncated in the email | GAP |
| EC-16 | Single-token owner name | `Hi Karan,` uses the first token of the full name | GAP |

## Payload file

| ID | Case | Expected | Status |
|---|---|---|---|
| PF-01 | Path and name | `outbox/karan-joshi-2026-11-24.json` (slug of the full name plus today's date) | GAP |
| PF-02 | Fields | `to`, `subject`, `body`, `owner`, `generatedFor`, `itemIds` all present | GAP |
| PF-03 | `to` from people.json | `karan.joshi@example.com` | GAP |
| PF-04 | `owner` is the full name | `Karan Joshi` | GAP |
| PF-05 | `generatedFor` is today | `2026-11-24`, follows `--today` | GAP |
| PF-06 | `itemIds` | ids of items in the email, overdue then open order | GAP |
| PF-07 | Valid JSON, pretty-printed, trailing newline | `JSON.parse` succeeds | GAP |
| PF-08 | Outbox folder created | `outbox/` missing before the call | created | GAP |
| PF-09 | Existing file | second `followup` the same day | exit 2, `outbox file exists, use --force to overwrite`; file unchanged | GAP |
| PF-10 | `--force` overwrites | same, with `--force` | file replaced; exit 0 | GAP |
| PF-11 | Different day | `--today` changed | new file name, no conflict | GAP |
| PF-12 | Slug safety | owner with spaces, accents or apostrophes (e.g. `Anita D'Souza`) | filesystem-safe slug | GAP |
| PF-13 | Path override | `--outbox <dir>` | file written there | GAP |
| PF-14 | No partial file on failure | write error | no half-written payload | GAP |

## Missing email

| ID | Case | Expected | Status |
|---|---|---|---|
| ME-01 | Person not in people.json | `to` is `""`; stderr/stdout `warning: no email for Priya Nair in people.json; the draft's To field will be empty`; exit 0; payload still written | GAP |
| ME-02 | people.json missing | same warning; `to: ""` | GAP |
| ME-03 | people.json invalid | `UsageError` naming the file, exit 2, no payload | GAP |
| ME-04 | Email matching by full name | lookup uses the canonical full name (case as stored in the store) | GAP |

## Gmail hand-off (outside the CLI)

| ID | Case | Expected | Status |
|---|---|---|---|
| GH-01 | Final CLI line | `Payload written to <path>. Ask Claude to create the Gmail draft from it. Nothing has been sent.` | GAP |
| GH-02 | CLI never calls Gmail | no network access and no import of any Gmail client in `src/` | GAP |
| GH-03 | CLI never sends | no code path references `send_message` | GAP |
| GH-04 | Scenario 11: Gmail unavailable at hand-off | the payload file is the only artefact; store unchanged; no other state | GAP |
| GH-05 | Store is not modified | store bytes identical before and after `followup` | GAP |
| GH-06 | Manual check (scenario 10) | Claude reads the payload and calls `create_draft` with `to`, `subject`, `body`; one draft; draft id reported; nothing sent | manual |

## Exit codes

| ID | Case | Expected | Status |
|---|---|---|---|
| EX-01 | Success | 0 | GAP |
| EX-02 | Nothing to do | 0 | GAP |
| EX-03 | Unknown owner | 1 | GAP |
| EX-04 | Ambiguous owner | 2 | GAP |
| EX-05 | Existing outbox file | 2 | GAP |
| EX-06 | Bad arguments | 2 | GAP |
| EX-07 | Corrupt store | 3 | GAP |

## Acceptance

| ID | Scenario | Expected | Status |
|---|---|---|---|
| AC-01 | 10: `followup "Karan Joshi"` | one payload, overdue first; draft via MCP; nothing sent | GAP + manual |
| AC-02 | 11: Gmail unavailable | no CLI state changed | GAP |
| AC-03 | 12: `followup Priya` | both Priyas listed; nothing written | GAP |
| AC-04 | Unassigned and ambiguous never in any email | see IS-07, IS-08 | GAP |
