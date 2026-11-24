# 06-ingest: Tasks

- [x] I1. Implement folder validation and the file listing (sorted, `.md` only, ignored list).
- [x] I2. Implement the per-file pipeline: parse, date, items, owner, due.
- [x] I3. Implement "Everyone" expansion.
- [x] I4. Integrate `findMatch` / `mergeInto` / insert with `allocateId`.
- [x] I5. Build the `IngestReport` and the stdout formatter.
- [x] I6. Save the store once at the end, only if the run completed.
- [x] I7. Integration tests against the sample `notes/` folder: counts, skipped files, ambiguous items.
- [x] I8. Integration test: idempotent re-ingest, and `done` survives re-ingest.
- [x] I9. Tests: nonexistent folder and an empty folder.
