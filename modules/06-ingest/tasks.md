# 06-ingest: Tasks

- [ ] I1. Implement folder validation and the file listing (sorted, `.md` only, ignored list).
- [ ] I2. Implement the per-file pipeline: parse, date, items, owner, due.
- [ ] I3. Implement "Everyone" expansion.
- [ ] I4. Integrate `findMatch` / `mergeInto` / insert with `allocateId`.
- [ ] I5. Build the `IngestReport` and the stdout formatter.
- [ ] I6. Save the store once at the end, only if the run completed.
- [ ] I7. Integration tests against the sample `notes/` folder: counts, skipped files, ambiguous items.
- [ ] I8. Integration test: idempotent re-ingest, and `done` survives re-ingest.
- [ ] I9. Tests: nonexistent folder and an empty folder.
