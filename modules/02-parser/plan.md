# 02-parser: Plan

## Purpose
Turn the text of one meeting note into a structured result: meeting header (title, date, attendees) and a list of raw action items. It does no date resolution, owner resolution, or dedupe.

## Scope
- Read header fields in the variants seen in the sample notes.
- Extract action items from all the formats in the sample notes.
- Classify a file as parsed or skipped, with a reason.

## Out of scope
Resolving "Friday" to a date (03-dates), mapping "Priya" to a full name (04-owners), merging duplicates (05-dedupe), writing to the store (06-ingest).

## Depends on
01-core (errors).

## Approach
A line-based parser, because the notes are loosely structured markdown. The parser returns raw strings and line numbers. Each item keeps the raw owner text and raw due phrase, split from the task text by a small set of patterns ("X to <task> by <phrase>").

## Risks
- Messy notes have items outside an "Action items" section (the offsite note has items under several headings). Mitigation: scan the whole file for item lines rather than relying on a section heading.
- Binary or empty files. Mitigation: detect NUL bytes and empty content before parsing.
- False positives such as checkboxes in a non-meeting draft. Mitigation: require a recognisable meeting header (date or attendees).
- Splitting owner from task wrongly on unusual phrasing. Mitigation: if no "<Name> to" pattern is found, owner is null and the full text is the task.

## Done when
All sample files classify as expected (see spec) and tests pass.
