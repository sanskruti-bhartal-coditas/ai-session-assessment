# 02-parser: Tasks

- [x] P1. Create `src/parser/types.ts` (`RawItem`, `ParsedNote`, `ParseOutcome`).
- [x] P2. Implement the input guards: empty, NUL bytes, invalid UTF-8.
- [x] P3. Implement header parsing: title, `Date:`/`date:`, `Attendees:` in plain and bracket forms.
- [x] P4. Implement checkbox item extraction for `-`, `*`, `+` and `[ ]`/`[x]`/`[X]`, with indent depth.
- [x] P5. Implement table-row item extraction (detect the header, skip the separator).
- [x] P6. Implement `ACTION:` line extraction.
- [x] P7. Implement owner / task / due splitting, including initials ("Priya N.") and "Everyone".
- [x] P8. Wrap the whole function in a try/catch that returns `skipped`.
- [x] P9. Tests: one per header variant, one per item format, one per skip reason.
- [x] P10. Test: run `parseNote` over every file in `notes/` and assert the expected table in the spec.
