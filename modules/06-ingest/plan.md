# 06-ingest: Plan

## Purpose
Implement `ingest <folder>`: orchestrate parser, dates, owners and dedupe over a folder, update the store, and print a report.

## Scope
- List `.md` files in the folder (non-recursive).
- Per file: parse, resolve date, resolve owners, resolve due, then dedupe or insert.
- Produce and print an ingest report.
- Persist the store once at the end.

## Out of scope
The logic inside parser, dates, owners and dedupe. Other commands.

## Depends on
01-core, 02-parser, 03-dates, 04-owners, 05-dedupe.

## Approach
A single function `ingestFolder(folder, store, ctx)` returns a report object, and the CLI layer prints it. Files are processed in filename order so ids are stable between runs. One bad file never stops the run.

## Risks
- A partial failure leaves the store half-updated. Mitigation: mutate in memory and save once at the end, atomically (01-core).
- Order-dependence changes dedupe results. Mitigation: sort files by name (the filenames start with the date).

## Done when
Acceptance scenarios 1, 2, 6, 8 and 9 in REQUIREMENTS.md pass against the sample notes.
