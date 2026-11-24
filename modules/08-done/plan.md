# 08-done: Plan

## Purpose
Implement `done <id>`: mark an item done.

## Scope
Look up by id, set status and `doneAt`, save, report.

## Out of scope
Un-marking items (not required) and bulk operations.

## Depends on
01-core.

## Approach
Small and self-contained: load the store, find the item, mutate, save.

## Risks
- A non-numeric or unknown id. Mitigation: validate and give clear errors.
- Writing the store when nothing changed. Mitigation: skip the save in the no-op case.

## Done when
Scenario 2 and the `done` part of scenario 12 pass.
