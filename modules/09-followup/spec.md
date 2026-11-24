# 09-followup: Spec

## Command
`actiontrack followup <owner> [--force]`

## Owner resolution
- `<owner>` is matched against the owners of stored items (resolved owners only) using the same rules as `list --owner`.
- Exactly one distinct person: proceed.
- Several people (e.g. `Priya`): print `"Priya" is ambiguous: Priya Nair, Priya Shah. Use the full name.`, write nothing, exit 2.
- No one: `NotFoundError`, `no items for owner "<owner>"`, exit 1.

## Item selection
- The person's items with `status: "open"`, split by `isOverdue` into overdue and open (not yet due, or no date).
- If there are none: print `<Name> has no open items.`, write nothing, exit 0.

## Email content
- Subject: `Follow-up: your open action items (<N> open, <M> overdue)`
- Body (plain text):
```
Hi <FirstName>,

Here are your open action items from recent meetings.

OVERDUE (<M>)
- <task> (due <date>, from <file>)

OPEN (<K>)
- <task> (due <date> | no due date, from <file>)

Reply to me if any of these are already done or need a new date.

Thanks
```
- Each item shows its first source file. Overdue items are sorted by due date ascending. Open items are sorted by due date, with no-date items last.
- The OVERDUE or OPEN heading is omitted when its section is empty.

## Payload file
`outbox/<slug>-<YYYY-MM-DD>.json`:
```json
{
  "to": "karan.joshi@example.com",
  "subject": "Follow-up: ...",
  "body": "Hi Karan, ...",
  "owner": "Karan Joshi",
  "generatedFor": "2026-11-24",
  "itemIds": [3, 17, 22]
}
```
- `to` comes from `people.json`. If missing, `to` is `""` and the CLI prints `warning: no email for <Name> in people.json; the draft's To field will be empty`.
- If the file already exists, exit 2 with `outbox file exists, use --force to overwrite`.

## Gmail hand-off (outside the CLI)
After `followup` prints the payload path, Claude reads the file and calls the Gmail MCP `create_draft` with `to`, `subject` and `body`. It never calls `send_message`. The CLI output ends with:
`Payload written to <path>. Ask Claude to create the Gmail draft from it. Nothing has been sent.`

## Exit codes
0 for success or nothing to do, 1 for an unknown owner, 2 for an ambiguous owner, an existing file, or bad arguments.

## Acceptance
- Scenario 10: `followup "Karan Joshi"` writes one payload with overdue items first. The draft is created through the Gmail MCP. Nothing is sent.
- Scenario 11: if Gmail is unavailable during the hand-off step, no CLI state has changed (the payload file is the only artefact).
- Scenario 12: `followup Priya` lists both Priyas and writes nothing.
- Unassigned and ambiguous items never appear in any email.
