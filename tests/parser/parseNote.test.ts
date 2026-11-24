import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseNote } from "../../src/parser/parseNote.js";
import type { ParsedNote } from "../../src/parser/types.js";

function parsed(content: string | Buffer): { note: ParsedNote; warnings: string[] } {
  const r = parseNote("t.md", content);
  if (r.kind !== "parsed") throw new Error(`expected parsed, got skipped: ${r.reason}`);
  return r;
}

const HEADER = "# Meeting: Sync\nDate: 2026-09-01\nAttendees: A B, C D\n\n";

describe("input guards", () => {
  it("skips empty and whitespace-only content", () => {
    expect(parseNote("a.md", "")).toEqual({ kind: "skipped", file: "a.md", reason: "empty file" });
    expect(parseNote("a.md", " \n\t\n")).toMatchObject({ kind: "skipped", reason: "empty file" });
  });
  it("skips NUL bytes", () => {
    expect(parseNote("a.md", Buffer.from([0x23, 0x20, 0x00, 0x01]))).toMatchObject({
      kind: "skipped",
      reason: "binary or non-text content",
    });
  });
  it("skips invalid UTF-8", () => {
    expect(parseNote("a.md", Buffer.from([0xff, 0xfe, 0x41]))).toMatchObject({
      kind: "skipped",
      reason: "binary or non-text content",
    });
  });
  it("skips notes with no date and no attendees", () => {
    expect(parseNote("a.md", "- [ ] Sam to do it")).toMatchObject({
      kind: "skipped",
      reason: "no meeting header (date/attendees missing)",
    });
  });
  it("never throws on odd input", () => {
    expect(() => parseNote("a.md", "|\n| | |\n```\n- [ ]")).not.toThrow();
  });
});

describe("header", () => {
  it("reads title (Meeting: prefix stripped), Date and Attendees", () => {
    const { note, warnings } = parsed(HEADER + "- [ ] Sam to go\n");
    expect(note.title).toBe("Sync");
    expect(note.dateRaw).toBe("2026-09-01");
    expect(note.attendees).toEqual(["A B", "C D"]);
    expect(warnings).toEqual([]);
  });
  it("accepts lowercase keys and bracketed attendees", () => {
    const { note } = parsed("# Plain title\ndate: 2026-09-01\nattendees: [A B, C D]\n- [ ] Sam to go\n");
    expect(note.title).toBe("Plain title");
    expect(note.dateRaw).toBe("2026-09-01");
    expect(note.attendees).toEqual(["A B", "C D"]);
  });
  it("keeps free-text dates raw", () => {
    expect(parsed("Date: sometime last week\n- [ ] Sam to go").note.dateRaw).toBe("sometime last week");
  });
  it("warns on missing parts", () => {
    expect(parsed("Date: 2026-09-01\n").warnings).toEqual(["attendees missing", "no action items found"]);
    expect(parsed("Attendees: A B\n- [ ] Sam to go").warnings).toEqual(["date line missing"]);
  });
});

describe("item formats", () => {
  it("handles -, * and + bullets with [ ], [x], [X]", () => {
    const { note } = parsed(HEADER + "- [ ] Sam to a\n* [x] Sam to b\n+ [X] Sam to c\n");
    expect(note.items.map((i) => [i.line, i.checked])).toEqual([
      [5, false],
      [6, true],
      [7, true],
    ]);
  });
  it("records nesting depth and keeps nested items separate", () => {
    const { note } = parsed(HEADER + "- [ ] Sam to a\n  - [ ] Karan to b\n    - [ ] Lena to c\n- [ ] Meera to d\n");
    expect(note.items.map((i) => i.indent)).toEqual([0, 1, 2, 0]);
  });
  it("reads table rows, skipping header and separator", () => {
    const { note } = parsed(
      HEADER + "| Owner | Action | Due |\n|---|---|---|\n| Anita | Refresh the kit | 2026-10-09 |\n| | Orphan task | |\n",
    );
    expect(note.items).toEqual([
      { line: 7, checked: false, ownerRaw: "Anita", task: "Refresh the kit", dueRaw: "2026-10-09", indent: 0 },
      { line: 8, checked: false, ownerRaw: null, task: "Orphan task", dueRaw: null, indent: 0 },
    ]);
  });
  it("reads tables without a Due column", () => {
    const { note } = parsed(HEADER + "| Owner | Action |\n|---|---|\n| Anita | Do it |\n");
    expect(note.items[0]).toMatchObject({ ownerRaw: "Anita", task: "Do it", dueRaw: null });
  });
  it("ignores tables that are not action tables", () => {
    expect(parsed(HEADER + "| Name | Score |\n|---|---|\n| Anita | 3 |\n").note.items).toEqual([]);
  });
  it("reads ACTION: lines case-insensitively", () => {
    const { note } = parsed(HEADER + "ACTION: Karan to send it by Friday\naction: Sam to ping\n");
    expect(note.items.map((i) => [i.ownerRaw, i.task, i.dueRaw])).toEqual([
      ["Karan", "send it", "Friday"],
      ["Sam", "ping", null],
    ]);
  });
  it("ignores plain prose and plain bullets", () => {
    expect(parsed(HEADER + "- just a bullet\nSam will do something\n").note.items).toEqual([]);
  });
  it("handles CRLF line endings", () => {
    expect(parsed((HEADER + "- [ ] Sam to go by Friday\n").replace(/\n/g, "\r\n")).note.items[0]).toMatchObject({
      task: "go",
      dueRaw: "Friday",
    });
  });
});

describe("owner / task / due splitting", () => {
  const split = (text: string) => {
    const i = parsed(HEADER + `- [ ] ${text}\n`).note.items[0];
    return [i.ownerRaw, i.task, i.dueRaw];
  };
  it("splits a simple owner", () =>
    expect(split("Priya to send the deck by Friday")).toEqual(["Priya", "send the deck", "Friday"]));
  it("keeps initials", () =>
    expect(split("Priya N. to notify customers by 2026-10-05")).toEqual(["Priya N.", "notify customers", "2026-10-05"]));
  it("handles Everyone", () =>
    expect(split("Everyone to submit goals by 7 Oct")).toEqual(["Everyone", "submit goals", "7 Oct"]));
  it("handles @name: form", () =>
    expect(split("@anita: audit contrast by Mon")).toEqual(["anita", "audit contrast", "Mon"]));
  it("handles joint and parenthetical owners", () => {
    expect(split("Anita & Rahul to agree on the API by Wednesday")).toEqual([
      "Anita & Rahul",
      "agree on the API",
      "Wednesday",
    ]);
    expect(split("Lena (with Priya) to collect feedback")).toEqual(["Lena (with Priya)", "collect feedback", null]);
  });
  it("handles due / from / results due", () => {
    expect(split("Sam to finish the audit due Friday")[2]).toBe("Friday");
    expect(split("Karan to freeze edits from 9 Oct")).toEqual(["Karan", "freeze edits", "9 Oct"]);
    expect(split("Lena to run the survey, results due 15 October")).toEqual([
      "Lena",
      "run the survey",
      "15 October",
    ]);
  });
  it("takes the last by-phrase and keeps non-date 'from'/'by' text in the task", () => {
    expect(split("Priya to collect feedback from Acme by 2026-10-20")).toEqual([
      "Priya",
      "collect feedback from Acme",
      "2026-10-20",
    ]);
    expect(split("Sam to collect feedback from Acme")).toEqual(["Sam", "collect feedback from Acme", null]);
    expect(split("Sam to review the doc by the team")).toEqual(["Sam", "review the doc by the team", null]);
  });
  it("strips a dangling dash before the due phrase", () => {
    expect(split("Priya N. to send quote to Acme — by Friday")).toEqual(["Priya N.", "send quote to Acme", "Friday"]);
  });
  it("leaves owner null when there is no pattern", () => {
    expect(split("write the changelog")).toEqual([null, "write the changelog", null]);
  });
});

describe("sample notes folder", () => {
  const dir = "notes";
  const results = new Map(
    readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => [f, parseNote(f, readFileSync(`${dir}/${f}`))] as const),
  );

  it("skips exactly the three malformed notes", () => {
    const skipped = [...results.values()].filter((r) => r.kind === "skipped");
    expect(Object.fromEntries(skipped.map((r) => [r.file, (r as { reason: string }).reason]))).toEqual({
      "scratch.md": "binary or non-text content",
      "2026-09-09-notes-final-v2.md": "empty file",
      "untitled.md": "no meeting header (date/attendees missing)",
    });
  });
  it("does not consider the .txt draft", () => {
    expect(results.has("2026-09-19-offsite-draft.txt")).toBe(false);
  });
  it("parses every other note with at least one item", () => {
    for (const r of results.values()) {
      if (r.kind === "parsed") expect(r.note.items.length, r.note.file).toBeGreaterThan(0);
    }
  });
  it("extracts all offsite formats", () => {
    const r = results.get("2026-09-30-q4-offsite.md")!;
    if (r.kind !== "parsed") throw new Error("offsite skipped");
    expect(r.note.items).toHaveLength(9);
    expect(r.note.items.find((i) => i.line === 10)?.indent).toBe(1);
    expect(r.note.items.find((i) => i.ownerRaw === "Everyone")?.task).toBe("submit their Q4 goals");
    expect(r.note.items.find((i) => i.line === 22)).toMatchObject({ ownerRaw: "Anita", dueRaw: "2026-10-09" });
    expect(r.note.items.find((i) => i.line === 24)?.ownerRaw).toBe("Karan");
  });
});
