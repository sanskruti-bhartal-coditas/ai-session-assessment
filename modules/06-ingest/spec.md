# 06-ingest: Spec

## Command
`actiontrack ingest <folder>`

## Behaviour
1. If `<folder>` does not exist or is not a directory: `UsageError` (exit 2). Nothing is written.
2. List files ending in `.md`, sorted by name. Other files are listed in the report as `ignored`.
3. For each file, read the bytes and call `parseNote`. If `skipped`, record `{file, reason}` and continue.
4. Resolve the meeting date with `parseMeetingDate(dateRaw, filename)`. If it is null, record the file as skipped with reason `no usable meeting date`.
5. For each raw item:
   - `resolveOwner(ownerRaw, attendees, knownPeople)`. `knownPeople` is the union of all attendees seen so far in the run.
   - `resolveDue(dueRaw, meetingDate)`.
   - For "Everyone", expand to one candidate item per owner.
   - Build a `NewItem` with its `Source` (file, meetingDate, line) and `checked`.
   - `findMatch` against the store. If found, `mergeInto`. Otherwise allocate an id and insert.
6. Save the store once, after all files are processed.

## Report
```ts
interface IngestReport {
  filesSeen: number; filesParsed: number;
  filesSkipped: { file: string; reason: string }[];
  filesIgnored: string[];
  itemsAdded: number; itemsMerged: number; itemsUnchanged: number;
  unassigned: number; ambiguous: number; noDueDate: number;
  warnings: { file: string; message: string }[];
  notes: string[];
}
```

## Output format (stdout)
```
Ingested 36 files: 33 parsed, 3 skipped, 1 ignored
Items: 84 added, 41 merged, 0 unchanged
Needs attention: 6 unassigned, 9 ambiguous owner, 12 no due date

Skipped:
  scratch.md: binary or non-text content
  ...
Warnings:
  2026-09-14-onboarding-flow-design.md: date "sometime last week" not parseable, used filename date
```
The counts shown are illustrative. Real numbers come from the run.

## Exit codes
- 0: completed, even if some notes were skipped.
- 2: bad folder argument.
- 3: store unreadable.

## Idempotency
Running `ingest` twice on the same folder gives `itemsAdded: 0` the second time and changes no existing item's `status`.

## Acceptance
Scenarios 1, 2, 6, 8 and 9 from REQUIREMENTS.md.
