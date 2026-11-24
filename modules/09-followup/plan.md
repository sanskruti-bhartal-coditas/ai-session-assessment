# 09-followup: Plan

## Purpose
Implement `followup <owner>`: build one email per owner covering their open and overdue items, and hand it off for Gmail drafting. The CLI never sends and never talks to Gmail.

## Scope
- Resolve the `<owner>` argument to exactly one person.
- Select that person's open items and split overdue from open.
- Render subject and body.
- Look up the email in `people.json`.
- Write a JSON payload to `outbox/`.
- A documented procedure for creating the Gmail draft from the payload via the Gmail MCP.

## Out of scope
Sending email. Calling Gmail from Node. Scheduling.

## Depends on
01-core, 03-dates (`isOverdue`), 04-owners (`loadPeople`).

## Approach
(Option A, agreed.) The CLI writes a payload file `outbox/<slug>-<date>.json` with `to`, `subject`, `body`. In the Claude session, the Gmail MCP `create_draft` tool turns that payload into a draft. Keeping the Gmail call outside the CLI means the CLI has no credentials and cannot send mail.

## Risks
- Ambiguous owner argument (`Priya`). Mitigation: list the candidates and exit non-zero without writing a file.
- No email in `people.json`. Mitigation: write the payload with `to: ""` and print a warning.
- A draft created twice for the same owner. Mitigation: the payload filename includes the date, and the CLI refuses to overwrite an existing file without `--force`.
- Unassigned and ambiguous items have no recipient. Mitigation: they are excluded, and their count is mentioned in the CLI output.

## Done when
Scenarios 10, 11 and 12 (the `followup` part) pass, and one real draft has been created in Gmail from a payload (a draft only, never sent).
