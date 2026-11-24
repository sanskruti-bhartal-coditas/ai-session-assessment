# 01-core: Plan

## Purpose
Shared foundation for all other modules: types, the JSON store, id allocation, and the clock ("today").

## Scope
- Domain types (`Item`, `Source`, `Store`).
- JSON file store: load, save (atomic), schema version.
- Stable id allocation (never reused).
- Clock: `today()` from the system date, overridable by `--today`.
- Config: store path, people.json path, outbox path.
- Typed errors with exit codes.

## Out of scope
Parsing, date logic, command behaviour.

## Depends on
Nothing. Every other module depends on this one.

## Approach
Keep the module small and dependency-free (Node `fs` and `path` only). Types are the contract between modules, so they are agreed first and changed rarely. The store is a plain object loaded fully into memory, because the data is small (hundreds of items).

## Risks
- A crash mid-write corrupts the store. Mitigation: write to a temp file, then rename.
- Id reuse. Mitigation: `nextId` is persisted and only increases.
- A corrupt or hand-edited store. Mitigation: validate on load and give a clear error that includes the path.

## Done when
All tasks in `tasks.md` are complete and the unit tests pass.
