# 05-dedupe: Plan

## Purpose
Decide whether a newly parsed item is the same as one already in the store, and merge them if so, so a task repeated across meetings shows once with all its sources.

## Scope
- Normalise task text into a `taskKey`.
- Match new items against existing ones.
- Merge rules for sources, status, due date and owner.

## Out of scope
Parsing, resolving owners, persistence (06-ingest calls this module and does the saving).

## Depends on
01-core (types).

## Approach
Deterministic matching, no machine learning. Two items match when the owner is the same and the normalised task keys are equal or very similar (token-set similarity above a threshold). The threshold is a named constant so it can be tuned against the sample data.

## Risks
- Wrongly merging two different tasks. Mitigation: require the same owner and a high threshold. A merge keeps all sources visible so a human can see why.
- Missing a duplicate that is worded differently. Mitigation: token-set comparison that ignores word order and stop words.
- Re-ingesting the same file double-counts sources. Mitigation: a source (file plus line) already recorded is ignored.

## Done when
The spec's cases pass and the sample folder yields a sensible duplicate count, which we review together.
