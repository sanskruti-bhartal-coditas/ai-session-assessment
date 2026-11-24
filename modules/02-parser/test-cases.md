# 02-parser: Test Cases

Derived from [spec.md](spec.md). Status shows whether a case is automated. `Auto` means covered in `tests/parser/parseNote.test.ts`. `GAP` means the spec requires it but no test covers it yet.

All cases call `parseNote(file, content)`. Unless stated, "header" means `# Meeting: Sync`, `Date: 2026-09-01`, `Attendees: A B, C D`.

## Input guards and skip rules

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| G-01 | Empty content | `""` | `skipped`, reason `empty file` | Auto |
| G-02 | Whitespace only | `" \n\t\n"` | `skipped`, reason `empty file` | Auto |
| G-03 | NUL byte (Buffer) | bytes `23 20 00 01` | `skipped`, reason `binary or non-text content` | Auto |
| G-04 | NUL byte (string) | string containing `\0` | `skipped`, reason `binary or non-text content` | GAP |
| G-05 | Invalid UTF-8 | bytes `ff fe 41` | `skipped`, reason `binary or non-text content` | Auto |
| G-06 | No date and no attendees | `- [ ] Sam to do it` | `skipped`, reason `no meeting header (date/attendees missing)` | Auto |
| G-07 | Only a date | header with `Date:` and no attendees | `parsed`, warning `attendees missing` | Auto |
| G-08 | Only attendees | `Attendees:` line, no date | `parsed`, warning `date line missing` | Auto |
| G-09 | Header, no items | header only | `parsed`, `items: []`, warning `no action items found` | Auto |
| G-10 | Never throws | `"\|\n\| \| \|\n```\n- [ ]"` | returns an outcome, no exception | Auto |
| G-11 | UTF-8 BOM | BOM then a valid note | `parsed`, header read correctly | GAP |
| G-12 | Unexpected exception | force an internal failure (e.g. non-string, non-Buffer input cast) | `skipped` with the error message, no throw | GAP |
| G-13 | Buffer and string equivalence | same text as Buffer and as string | identical outcome | GAP |

## Header

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| H-01 | Title with `Meeting:` prefix | `# Meeting: Sync` | `title` is `Sync` | Auto |
| H-02 | Title without prefix | `# Plain title` | `title` is `Plain title` | Auto |
| H-03 | No title | no `# ` line | `title` is `null` | GAP |
| H-04 | First `# ` line wins | two `# ` lines | `title` from the first | GAP |
| H-05 | `Date:` key | `Date: 2026-09-01` | `dateRaw` is `2026-09-01` | Auto |
| H-06 | `date:` key | `date: 2026-09-01` | `dateRaw` is `2026-09-01` | Auto |
| H-07 | Free-text date kept raw | `Date: sometime last week` | `dateRaw` is `sometime last week` (no interpretation) | Auto |
| H-08 | Verbose date kept raw | `Date: Monday, 14 September 2026` | `dateRaw` is exactly that string | GAP |
| H-09 | Plain attendees | `Attendees: A B, C D` | `["A B", "C D"]` | Auto |
| H-10 | Bracketed attendees | `attendees: [A B, C D]` | `["A B", "C D"]` | Auto |
| H-11 | Extra spaces and empty entries | `Attendees:  A B ,, C D ` | `["A B", "C D"]` | GAP |
| H-12 | Date missing, attendees present | see G-08 | `dateRaw` is `null` | Auto |
| H-13 | Empty `Date:` value | `Date:` with nothing after | `dateRaw` is `null` | GAP |

## Item formats

| ID | Case | Input | Expected | Status |
|---|---|---|---|---|
| I-01 | `-` bullet unchecked | `- [ ] Sam to a` | one item, `checked: false`, correct 1-based `line` | Auto |
| I-02 | `*` and `+` bullets | `* [x] Sam to b`, `+ [X] Sam to c` | both items, both `checked: true` | Auto |
| I-03 | `[x]` and `[X]` | lowercase and uppercase | both `checked: true` | Auto |
| I-04 | Nested checkbox | 2-space indented `- [ ]` under a parent | separate item, `indent` 1 | Auto |
| I-05 | Three levels | 0, 2 and 4 space indents | `indent` 0, 1, 2 | Auto |
| I-06 | Table row | `\| Owner \| Action \| Due \|` header, separator, one row | one item with owner, task, due; header and separator are not items | Auto |
| I-07 | Table without Due | header `Owner \| Action` | item with `dueRaw: null` | Auto |
| I-08 | Table with empty owner/due cells | `\| \| Orphan task \| \|` | `ownerRaw: null`, `dueRaw: null` | Auto |
| I-09 | Non-action table | header `Name \| Score` | no items | Auto |
| I-10 | `ACTION:` line | `ACTION: Karan to send it by Friday` | item with owner `Karan`, task `send it`, due `Friday` | Auto |
| I-11 | `ACTION:` case-insensitive | `action: Sam to ping` | item produced | Auto |
| I-12 | Plain bullet and prose ignored | `- just a bullet`, `Sam will do something` | no items | Auto |
| I-13 | CRLF line endings | note with `\r\n` | same result as LF | Auto |
| I-14 | Checkbox with empty text | `- [ ]` and `- [ ] ` | no item | GAP |
| I-15 | Items under any heading | items under `## Afternoon`, not only under an action-items heading | all extracted | GAP |
| I-16 | Checkbox inside a code fence | fenced block containing `- [ ] Sam to x` | ignored | GAP |
| I-17 | Line numbers | items at known lines | `line` is the 1-based file line (including header lines) | Auto |
| I-18 | Table after prose | prose, blank, then table | rows still read; `tableCols` reset after the table ends | GAP |

## Owner / task / due splitting

| ID | Case | Input text | Expected `[ownerRaw, task, dueRaw]` | Status |
|---|---|---|---|---|
| O-01 | Simple owner and due | `Priya to send the deck by Friday` | `["Priya", "send the deck", "Friday"]` | Auto |
| O-02 | Owner with initial | `Priya N. to notify customers by 2026-10-05` | `["Priya N.", "notify customers", "2026-10-05"]` | Auto |
| O-03 | Everyone | `Everyone to submit goals by 7 Oct` | `["Everyone", "submit goals", "7 Oct"]` | Auto |
| O-04 | No owner pattern | `write the changelog` | `[null, "write the changelog", null]` | Auto |
| O-05 | `due` keyword | `Sam to finish the audit due Friday` | due `Friday` | Auto |
| O-06 | `from` keyword | `Karan to freeze edits from 9 Oct` | `["Karan", "freeze edits", "9 Oct"]` | Auto |
| O-07 | `, results due` | `Lena to run the survey, results due 15 October` | `["Lena", "run the survey", "15 October"]` | Auto |
| O-08 | No due phrase | `Sam to chase the vendor` | `dueRaw: null` | Auto |
| O-09 | Last due phrase wins | `Priya to collect feedback from Acme by 2026-10-20` | task keeps `from Acme`, due `2026-10-20` | Auto |
| O-10 | Non-date `from` / `by` stay in task | `Sam to collect feedback from Acme`, `Sam to review the doc by the team` | `dueRaw: null`, full text in task | Auto |
| O-11 | `@name:` form (sample note) | `@anita: audit contrast by Mon` | `["anita", "audit contrast", "Mon"]` | Auto |
| O-12 | Joint owners (sample note) | `Anita & Rahul to agree on the API by Wednesday` | owner `Anita & Rahul`, due `Wednesday` | Auto |
| O-13 | Parenthetical owner (sample note) | `Lena (with Priya) to collect feedback` | owner `Lena (with Priya)` | Auto |
| O-14 | Dangling dash | `Priya N. to send quote to Acme — by Friday` | task has no trailing `—` | Auto |
| O-15 | Trailing period | `Sam to ping the vendor.` | task `ping the vendor` | GAP |
| O-16 | Owner phrase longer than 3 capitalised tokens | `Alpha Beta Gamma Delta to do x` | no owner, whole text is the task | GAP |
| O-17 | Lowercase name before `to` | `someone to fix it` | no owner (names must be capitalised) | GAP |
| O-18 | `TBD` owner (sample note) | `TBD to write the changelog` | `ownerRaw: "TBD"` (resolution is module 04) | GAP |

## Sample folder (`notes/`)

| ID | Case | Expected | Status |
|---|---|---|---|
| F-01 | `scratch.md` | skipped, `binary or non-text content` | Auto |
| F-02 | `2026-09-09-notes-final-v2.md` | skipped, `empty file` | Auto |
| F-03 | `untitled.md` | skipped, `no meeting header (date/attendees missing)` | Auto |
| F-04 | `2026-09-19-offsite-draft.txt` | not considered (only `.md` files are read) | Auto |
| F-05 | Every other `.md` | `parsed` with at least one item | Auto |
| F-06 | `2026-09-30-q4-offsite.md` | 9 items: `*` and `+` bullets, one nested (indent 1), one table row (line 22), one `ACTION:` line (line 24), `Everyone` task | Auto |
| F-07 | `2026-09-23-standup.md` | parsed with warning `attendees missing` | GAP |
| F-08 | `2026-10-03-sales-pipeline.md` | parsed; `dateRaw` is `sometime last week` | GAP |
| F-09 | `2026-09-18-design-review.md` | 5 items including `@anita:`, `Anita & Rahul`, `Lena (with Priya)`, `TBD` | GAP |

## Open questions (spec is silent)
- Should `dueRaw` such as `tomorrow` at the end of a sentence with no `by`/`due`/`from` be split? Today it stays in the task (offsite `ACTION:` line).
- Should an item whose checkbox text is only an owner (`- [ ] Sam to`) produce an item with an empty task? Current behaviour: owner pattern needs a non-empty task, so the whole text becomes the task.
