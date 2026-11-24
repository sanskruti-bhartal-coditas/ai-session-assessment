export interface RawItem {
  /** 1-based line number in the file. */
  line: number;
  /** True for [x] or [X]. */
  checked: boolean;
  ownerRaw: string | null;
  task: string;
  dueRaw: string | null;
  /** Nesting level (0 = top). */
  indent: number;
}

export interface ParsedNote {
  file: string;
  title: string | null;
  /** Date value as written. */
  dateRaw: string | null;
  attendees: string[];
  items: RawItem[];
}

export type ParseOutcome =
  | { kind: "parsed"; note: ParsedNote; warnings: string[] }
  | { kind: "skipped"; file: string; reason: string };
