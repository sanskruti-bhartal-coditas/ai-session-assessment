# 04-owners: Test Cases

Derived from [spec.md](spec.md). Status shows whether a case is automated in `tests/owners/` today. `GAP` means the spec requires it but no test covers it yet (module not implemented yet).

Attendee sets used below:
- **Offsite (9):** Priya Nair, Rahul Mehta, Anita Desai, Sam Okafor, Meera Iyer, Karan Joshi, Lena Fischer, Priya Shah, Rahul Verma
- **Go/no-go:** a meeting that includes only Priya Nair (not Priya Shah)
- **Small:** Karan Joshi, Sam Okafor

## `resolveOwner`: rule order

| ID | Case | Input (`ownerRaw`, attendees, knownPeople) | Expected | Status |
|---|---|---|---|---|
| R-01 | `null` owner | `(null, Small, [])` | `unassigned`, `owners: []`, `candidates: []` | GAP |
| R-02 | Empty string owner | `("", Small, [])`, `("   ", ...)` | `unassigned` | GAP |
| R-03 | `Everyone` | `("Everyone", Offsite, [])` | `resolved`, `owners` = all 9 attendees | GAP |
| R-04 | `All`, `Team` | `("All", ...)`, `("Team", ...)` | same as R-03 | GAP |
| R-05 | Everyone case-insensitive | `("everyone", ...)`, `("EVERYONE", ...)` | same as R-03 | GAP |
| R-06 | Everyone, no attendees | `("Everyone", [], [])` | `unassigned` with a warning | GAP |
| R-07 | Exact full name | `("Karan Joshi", Small, [])` | `resolved`, `owners: ["Karan Joshi"]` | GAP |
| R-08 | Full name case-insensitive | `("karan joshi", Small, [])` | `resolved`, canonical `Karan Joshi` | GAP |
| R-09 | Name plus initial, one match | `("Priya N.", Offsite, [])` | `resolved`, `Priya Nair` | GAP |
| R-10 | Name plus initial, go/no-go | `("Priya N.", Go/no-go, [])` | `resolved`, `Priya Nair` (acceptance) | GAP |
| R-11 | Name plus initial, other initial | `("Priya S.", Offsite, [])` | `resolved`, `Priya Shah` | GAP |
| R-12 | Initial without a dot | `("Priya N", Offsite, [])` | `resolved`, `Priya Nair` | GAP |
| R-13 | Initial matches several | `("Rahul M.", ...)` where two Rahuls share the initial | `ambiguous` with both as candidates | GAP |
| R-14 | Initial matches none | `("Priya Z.", Offsite, [])` | falls through to rule 6 | GAP |
| R-15 | First name, one match | `("Karan", Small, [])` | `resolved`, `Karan Joshi` | GAP |
| R-16 | First name, several (offsite) | `("Priya", Offsite, [])` | `ambiguous`, `candidates: ["Priya Nair", "Priya Shah"]`, `owners: []` (acceptance) | GAP |
| R-17 | `Rahul` in offsite | `("Rahul", Offsite, [])` | `ambiguous`, candidates `Rahul Mehta`, `Rahul Verma` | GAP |
| R-18 | First name case-insensitive | `("karan", Small, [])` | `resolved` | GAP |
| R-19 | Ambiguous has no owners | any ambiguous result | `owners` is empty; `status` is `ambiguous` | GAP |
| R-20 | Candidates ordering stable | `("Priya", Offsite, [])` run twice | same candidate order both times | GAP |

## `resolveOwner`: fallback to `knownPeople` (rule 6)

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| K-01 | Not in attendees, one known match | `("Lena", Small, ["Lena Fischer"])` | `resolved`, `Lena Fischer`, warning `owner not in attendee list` | GAP |
| K-02 | Not in attendees, several known | `("Priya", Small, ["Priya Nair","Priya Shah"])` | `unassigned` with warning `owner "Priya" not recognised` | GAP |
| K-03 | Unknown name (acceptance) | `("Dave", Small, ["Anita Desai"])` | `unassigned`, warning `owner "Dave" not recognised` | GAP |
| K-04 | Attendees win over known people | `("Priya", [Priya Nair], [Priya Nair, Priya Shah])` | `resolved`, `Priya Nair`, no warning | GAP |
| K-05 | Known people with initial | `("Priya S.", Small, [Priya Shah])` | `resolved`, warning `owner not in attendee list` | GAP |
| K-06 | Known people empty | `("Dave", Small, [])` | `unassigned` with the `not recognised` warning | GAP |
| K-07 | Placeholder owners from notes | `("Someone", ...)`, `("TBD", ...)` | `unassigned`, warning `owner "<raw>" not recognised` | GAP |
| K-08 | Joint owner text (sample note) | `("Anita & Rahul", ...)`, `("Lena (with Priya)", ...)` | defined, non-throwing outcome (decide: unassigned with warning, or split); never guesses | GAP |
| K-09 | `@anita` raw (sample note) | `("anita", Offsite, [])` | `resolved`, `Anita Desai` | GAP |

## Ambiguity is final

| ID | Case | Expected | Status |
|---|---|---|---|
| A-01 | Ambiguous item is stored with `owner: null`, `ownerStatus: "ambiguous"`, candidates set | verified in ingest (06) tests; here: resolution object has everything 06 needs | GAP |
| A-02 | No auto-resolution by frequency or recency | resolving `Priya` never picks a candidate even if one attended more meetings | GAP |
| A-03 | Display form `? Priya (Nair\|Shah)` | produced from `ownerRaw` plus candidates (tested with 07-list) | GAP |

## `loadPeople`

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| P-01 | Valid file | `{ "Priya Nair": "priya.nair@example.com" }` | map with that entry | GAP |
| P-02 | Missing file | path does not exist | `{}` (no error) | GAP |
| P-03 | Invalid JSON | file contains `{nope` | `UsageError` whose message names the file | GAP |
| P-04 | Wrong shape | file contains `[]` or `"x"` | `UsageError` naming the file | GAP |
| P-05 | Non-string email | `{ "A B": 5 }` | `UsageError` (or entry rejected); never a silent wrong type | GAP |
| P-06 | Empty object | `{}` | `{}` | GAP |
| P-07 | Starter `people.json` | repo file | contains all 9 sample-note people, every email on `example.com` | GAP |
| P-08 | Unreadable path | path is a directory | does not crash with a raw fs error | GAP |

## Acceptance (from the spec)

| ID | Scenario | Expected | Status |
|---|---|---|---|
| AC-01 | Offsite: "Priya to own the hiring plan" | `ambiguous`, candidates `Priya Nair`, `Priya Shah` | GAP |
| AC-02 | Go/no-go: "Priya N." | `resolved` to `Priya Nair` | GAP |
| AC-03 | "Everyone to submit goals" in the 9-person meeting | 9 owners | GAP |
| AC-04 | Unknown "Dave" with no match | `unassigned` with a warning | GAP |
