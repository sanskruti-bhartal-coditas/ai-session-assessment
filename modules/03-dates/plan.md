# 03-dates: Plan

## Purpose
Turn raw date text into ISO dates: the meeting date from the header (or filename), and due phrases relative to the meeting date.

## Scope
- Meeting date parsing, with a filename fallback.
- Due phrase resolution relative to the meeting date.
- Overdue calculation helper.

## Out of scope
Reading files, deciding what counts as a due phrase (02-parser), the `--today` flag (01-core clock).

## Depends on
01-core (types).

## Approach
A pure-function module with no I/O, so it can be tested exhaustively. No third-party date library: the phrases in the notes are a small, known set. Date arithmetic is done on UTC calendar dates to avoid timezone and DST drift.

## Risks
- Ambiguity of "Friday" (this week vs next). Mitigation: a fixed rule, the next occurrence strictly after the meeting date, documented in the spec.
- Phrases that cannot be resolved. Mitigation: return null plus a warning, never guess.
- Year inference for "Oct 3rd" and "7 Oct". Mitigation: use the meeting year, and if the result is more than 6 months before the meeting date, use the next year.

## Done when
The table of phrases in the spec resolves as listed and tests pass.
