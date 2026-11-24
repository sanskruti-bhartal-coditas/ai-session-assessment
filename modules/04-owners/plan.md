# 04-owners: Plan

## Purpose
Resolve the owner text in an item ("Priya", "Priya N.", "Everyone") to a full name using the meeting's attendee list, without guessing when it is ambiguous.

## Scope
- Match raw owner text against attendees.
- Classify the result: resolved, unassigned, or ambiguous (with candidates).
- Expand "Everyone".
- Load `people.json` (name to email), which 09-followup also uses.

## Out of scope
Parsing owner text from a line (02-parser), email drafting.

## Depends on
01-core (errors).

## Approach
Pure functions. Matching is case-insensitive and works on name tokens: first name, first name plus last-name initial, or full name. The meeting's attendee list is checked first because it is the most reliable context.

## Risks
- Two attendees share a first name (Priya Nair / Priya Shah, Rahul Mehta / Rahul Verma). Mitigation: more than one match is `ambiguous`, never picked.
- The owner is not in the attendee list. Mitigation: try the known-people set from all meetings, and use it only if exactly one person matches.
- The same name spelled differently across files. Mitigation: normalise whitespace and case before comparing.

## Done when
Every case in the spec behaves as listed and tests pass.
