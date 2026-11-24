# 07-list: Plan

## Purpose
Implement `list`: show tracked items with filters and a readable table.

## Scope
- Filters: `--owner`, `--status open|done|overdue`, `--due-before <date>`, combinable.
- Table output.
- Overdue calculation at read time.

## Out of scope
Changing data. Sorting options beyond the default.

## Depends on
01-core, 03-dates (`isOverdue`).

## Approach
A pure `filterItems(items, filters, today)` function plus a formatter. The owner filter handles first-name input sensibly.

## Risks
- `--owner priya` matches two people. Mitigation: it matches both by first name and the table shows full names, so the user can tell them apart. A full name narrows it.
- Ambiguous and unassigned items vanish from owner-filtered views. Mitigation: `--owner unassigned` and `--owner ambiguous` select them.

## Done when
Scenarios 4, 5 and 8 pass.
