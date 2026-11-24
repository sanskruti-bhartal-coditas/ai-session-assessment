# 04-owners: Spec

## API (`src/owners/`)
```ts
interface OwnerResolution {
  status: "resolved" | "unassigned" | "ambiguous";
  owners: string[];       // resolved full names (several only for "Everyone")
  candidates: string[];   // populated when ambiguous
  warning?: string;
}

resolveOwner(ownerRaw: string | null, attendees: string[], knownPeople: string[]): OwnerResolution

loadPeople(path: string): Record<string, string>   // full name -> email
```

## Matching rules (in order)
1. `ownerRaw` null or empty gives `unassigned`.
2. `Everyone`, `All`, `Team` (case-insensitive) gives `resolved` with `owners` = all attendees, so 06-ingest creates one item per attendee. With no attendees: `unassigned` with a warning.
3. Exact full-name match (case-insensitive) in attendees gives `resolved`.
4. First name plus initial (`Priya N.`): attendees whose first name matches and whose last name starts with the initial. Exactly one gives `resolved`. More than one gives `ambiguous`.
5. First name only (`Priya`): attendees with that first name. Exactly one gives `resolved`. More than one gives `ambiguous` with `candidates` set (the same-first-name rule).
6. No attendee matches: apply the same rules to `knownPeople`. Exactly one gives `resolved` with warning `owner not in attendee list`. Otherwise `unassigned` with warning `owner "<raw>" not recognised`.

## Ambiguity is final
An ambiguous item is stored with `owner: null`, `ownerStatus: "ambiguous"`, and `ownerCandidates`. It never appears in a follow-up. `list` shows it as `? Priya (Nair|Shah)`. It can become resolved only through a dedupe merge (05) with a later, clearer mention.

## people.json
```json
{ "Priya Nair": "priya.nair@example.com", "Karan Joshi": "karan.joshi@example.com" }
```
- A missing file returns an empty map (not an error).
- Invalid JSON throws `UsageError` naming the file.
- A starter `people.json` for the 9 people in the sample notes is part of the tasks (placeholder emails on `example.com`; you replace them with real addresses).

## Acceptance
- Offsite note: "Priya to own the hiring plan" is `ambiguous` with candidates `Priya Nair`, `Priya Shah`.
- Go/no-go note: "Priya N." resolves to Priya Nair.
- "Everyone to submit goals" in a 9-person meeting gives 9 owners.
- An unknown "Dave" with no match is `unassigned` with a warning.
