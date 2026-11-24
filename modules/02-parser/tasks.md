# 02-parser: Tasks

- [ ] P1. Create `src/parser/types.ts` (`RawItem`, `ParsedNote`, `ParseOutcome`).
- [ ] P2. Implement the input guards: empty, NUL bytes, invalid UTF-8.
- [ ] P3. Implement header parsing: title, `Date:`/`date:`, `Attendees:` in plain and bracket forms.
- [ ] P4. Implement checkbox item extraction for `-`, `*`, `+` and `[ ]`/`[x]`/`[X]`, with indent depth.
- [ ] P5. Implement table-row item extraction (detect the header, skip the separator).
- [ ] P6. Implement `ACTION:` line extraction.
- [ ] P7. Implement owner / task / due splitting, including initials ("Priya N.") and "Everyone".
- [ ] P8. Wrap the whole function in a try/catch that returns `skipped`.
- [ ] P9. Tests: one per header variant, one per item format, one per skip reason.
- [ ] P10. Test: run `parseNote` over every file in `notes/` and assert the expected table in the spec.
