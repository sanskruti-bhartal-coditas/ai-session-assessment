# 01-core: Tasks

- [x] C1. Create `src/core/types.ts` with the types in the spec.
- [x] C2. Create `src/core/errors.ts` (`UsageError`, `StoreError`, `NotFoundError`) with exit codes.
- [x] C3. Create `src/core/store.ts`: `loadStore`, `saveStore` (atomic), `allocateId`.
- [x] C4. Create `src/core/clock.ts`: `today(override?)` with date validation.
- [x] C5. Create `src/core/config.ts`: default paths and env overrides.
- [x] C6. Tests: round-trip, missing file, corrupt JSON, wrong version, atomic write, id monotonicity.
- [x] C7. Tests: `today` with a valid and an invalid override.
