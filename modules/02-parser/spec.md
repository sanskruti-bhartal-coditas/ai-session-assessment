# 02-parser: Spec

## Public API (`src/parser/parseNote.ts`)
```ts
interface RawItem {
  line: number;
  checked: boolean;            // [x] or [X]
  ownerRaw: string | null;
  task: string;
  dueRaw: string | null;
  indent: number;              // nesting level (0 = top)
}
interface ParsedNote {
  file: string;
  title: string | null;
  dateRaw: string | null;      // as written
  attendees: string[];
  items: RawItem[];
}
type ParseOutcome =
  | { kind: "parsed"; note: ParsedNote; warnings: string[] }
  | { kind: "skipped"; file: string; reason: string };

parseNote(file: string, content: Buffer | string): ParseOutcome
```

## Input selection
Only files ending in `.md` are considered. Everything else is ignored by 06-ingest and does not count as a malformed note.

## Skip rules (kind: "skipped", reason required)
| Condition | Reason text |
|---|---|
| Empty or whitespace only | `empty file` |
| Contains NUL bytes or invalid UTF-8 | `binary or non-text content` |
| No date line and no attendees line | `no meeting header (date/attendees missing)` |

A note with a header but zero action items is `parsed` with an empty `items` list and a warning `no action items found`.

## Header formats
- Title: first `# ` line, with an optional `Meeting:` prefix removed.
- Date: `Date: <text>` or `date: <text>` (case-insensitive key). Value stored raw.
- Attendees: `Attendees: A, B, C` or `attendees: [A, B, C]`. Split on commas, trim, strip brackets.

## Item line formats
All of these produce a `RawItem`:
1. `- [ ] text`, `- [x] text`, `- [X] text`
2. `* [ ] text` and `+ [ ] text`
3. Nested (indented) checkbox lines. `indent` records depth. Nested items are separate items.
4. Markdown table rows under a header containing Owner and Action (Due optional). The header and separator rows are not items.
5. Lines starting with `ACTION:` (case-insensitive).

Other lines are ignored.

## Owner / task / due splitting
- Owner: a leading name phrase followed by ` to ` (e.g. `Priya to send...`, `Priya N. to notify...`, `Everyone to submit...`). The name phrase is 1 to 3 capitalised tokens (a trailing initial like `N.` is allowed). Stored raw in `ownerRaw`.
- Due phrase: a trailing ` by <phrase>`, ` due <phrase>`, ` from <phrase>`, or `, results due <phrase>`. Stored raw in `dueRaw` and removed from the task text.
- Table rows: columns map directly to owner, task, due.
- If no owner pattern matches, `ownerRaw` is null and the whole text is the task.

## Warnings (non-fatal)
`no action items found`, `date line missing`, `attendees missing`.

## Expected results on the sample folder
| File | Expected |
|---|---|
| `scratch.md` | skipped, `binary or non-text content` |
| `2026-09-09-notes-final-v2.md` | skipped, `empty file` |
| `untitled.md` | skipped, `no meeting header (date/attendees missing)` |
| `2026-09-19-offsite-draft.txt` | not considered (not `.md`) |
| `2026-09-30-q4-offsite.md` | parsed: `*` and `+` bullets, nested item, table row, `ACTION:` line, "Everyone to..." |
| All other `.md` | parsed |

(The exact set will be confirmed by running the parser over all files during implementation, since I have only read some of them.)

## Acceptance
No input makes `parseNote` throw. Unexpected exceptions are caught and returned as `skipped` with the message.
