# 03-dates: Spec

## API (`src/dates/`)
```ts
parseMeetingDate(dateRaw: string | null, filename: string):
  { date: ISODate; warning?: string } | { date: null; warning: string }

resolveDue(dueRaw: string | null, meetingDate: ISODate):
  { due: ISODate | null; warning?: string }

isOverdue(item: { status: string; due: ISODate | null }, today: ISODate): boolean
```

## Meeting date formats accepted
- `2026-09-01` (ISO)
- `9 September 2026`
- `Monday, 14 September 2026`
- Anything else (e.g. `sometime last week`): fall back to a leading `YYYY-MM-DD` in the filename and return the warning `date "<raw>" not parseable, used filename date`.
- If the filename has no date either: `date: null`. 06-ingest then skips the note with reason `no usable meeting date`.

## Due phrase resolution (relative to meeting date M)
| Phrase | Result |
|---|---|
| `2026-09-08` | that date |
| `Friday` (any weekday name) | the next such weekday strictly after M |
| `tomorrow` | M + 1 day |
| `today`, `EOD`, `end of day` | M |
| `Oct 3rd`, `7 Oct`, `15 October`, `9 Oct` | that day and month in M's year (next year if more than 6 months before M) |
| `mid-October`, `mid October` | the 15th of that month |
| `next week` | the next Monday after M |
| anything else | `due: null`, warning `due phrase "<raw>" not resolved` |

Month names and 3-letter abbreviations are case-insensitive. Ordinal suffixes (st, nd, rd, th) are accepted.

## Overdue
`isOverdue` is true only when `status === "open"`, `due !== null`, and `due < today`. Strict comparison, so an item due today is not overdue. It is computed on read and never stored.

## Rules
- All arithmetic uses UTC calendar dates, so there are no local timezone effects.
- An invalid calendar date (e.g. 31 Feb) is unresolved, not rolled over.

## Acceptance
- A meeting on Tuesday 2026-09-01 with "by Friday" gives 2026-09-04.
- A meeting on Friday 2026-09-04 with "by Friday" gives 2026-09-11.
- `isOverdue` is false for done items and for items due today.
