# 05-dedupe: Tasks

- [ ] E1. Implement `normaliseTask` with the stop-word list.
- [ ] E2. Implement `similarity` (token-set Jaccard) and the `SIMILARITY_THRESHOLD` constant.
- [ ] E3. Implement `findMatch` with the owner rules and the tie-breaking.
- [ ] E4. Implement `mergeInto` for sources, status, due, owner, and the notes output.
- [ ] E5. Handle first-ingest `[x]` items (stored done).
- [ ] E6. Tests: the four acceptance cases and the same-source idempotency case.
- [ ] E7. Tests: ambiguous-to-resolved upgrade, due backfill, unassigned items.
- [ ] E8. Run over the sample notes, print the merge groups, and review them with the user to tune the threshold.
