import type { ParseOutcome, ParsedNote, RawItem } from "./types.js";

export type { ParseOutcome, ParsedNote, RawItem } from "./types.js";

const CHECKBOX = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/;
const ACTION_LINE = /^\s*ACTION:\s*(.*)$/i;
const DATE_LINE = /^\s*date:\s*(.*?)\s*$/i;
const ATTENDEES_LINE = /^\s*attendees:\s*(.*?)\s*$/i;
const TITLE_LINE = /^#\s+(.*?)\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/;

// A name: one or two capitalised tokens ("Priya", "Priya N.").
const NAME = String.raw`[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*)?`;
// "Priya", "Anita & Rahul", "Lena (with Priya)".
const OWNER_PHRASE = String.raw`${NAME}(?:\s+(?:&|and)\s+${NAME}|\s+\([^)]*\))?`;
const OWNER_TO = new RegExp(String.raw`^(${OWNER_PHRASE})\s+to\s+(\S.*)$`);
const OWNER_AT = /^@([A-Za-z][\w.'-]*)\s*:\s*(\S.*)$/;

const RESULTS_DUE = /^(.*?)\s*,\s*results due\s+(\S.*)$/i;
const TRAILING_DUE = /^(.*)\s+(?:by|due|from)\s+(\S.*)$/i;
const DATE_WORDS =
  /\d|\b(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(?:today|tomorrow|tonight|eod|eow|eom|next|end|mid|week|month|quarter|weekend)\b/i;

function skipped(file: string, reason: string): ParseOutcome {
  return { kind: "skipped", file, reason };
}

function cleanText(s: string): string {
  return s.trim().replace(/[\s.,;—–-]+$/, "").trim();
}

function looksLikeDue(phrase: string): boolean {
  return phrase.split(/\s+/).length <= 5 && DATE_WORDS.test(phrase);
}

/** Splits a trailing due phrase off the task text. */
function splitDue(text: string): { task: string; dueRaw: string | null } {
  const results = RESULTS_DUE.exec(text);
  if (results && looksLikeDue(results[2])) {
    return { task: cleanText(results[1]), dueRaw: cleanText(results[2]) };
  }
  const m = TRAILING_DUE.exec(text);
  if (m && looksLikeDue(m[2])) {
    return { task: cleanText(m[1]), dueRaw: cleanText(m[2]) };
  }
  return { task: cleanText(text), dueRaw: null };
}

/** Splits free text ("Priya to send X by Friday") into owner, task and due. */
function splitItemText(text: string): { ownerRaw: string | null; task: string; dueRaw: string | null } {
  const trimmed = text.trim();
  let ownerRaw: string | null = null;
  let rest = trimmed;
  const at = OWNER_AT.exec(trimmed);
  const to = at ? null : OWNER_TO.exec(trimmed);
  if (at) {
    ownerRaw = at[1];
    rest = at[2];
  } else if (to) {
    ownerRaw = to[1];
    rest = to[2];
  }
  const { task, dueRaw } = splitDue(rest);
  return { ownerRaw, task, dueRaw };
}

function splitCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function indentWidth(ws: string): number {
  let w = 0;
  for (const ch of ws) w += ch === "\t" ? 4 : 1;
  return w;
}

function decode(content: Buffer | string): string | null {
  if (typeof content === "string") return content.includes("\0") ? null : content;
  if (content.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    return null;
  }
}

function parseInner(file: string, content: Buffer | string): ParseOutcome {
  const decoded = decode(content);
  if (decoded === null) return skipped(file, "binary or non-text content");
  const text = decoded.replace(/^﻿/, "");
  if (text.trim() === "") return skipped(file, "empty file");

  const lines = text.split(/\r?\n/);
  let title: string | null = null;
  let dateRaw: string | null = null;
  let dateSeen = false;
  let attendees: string[] | null = null;
  const items: RawItem[] = [];

  const indentStack: number[] = [];
  let tableCols: { owner: number; action: number; due: number } | null = null;
  let inCodeFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) continue;

    // Tables
    if (TABLE_ROW.test(line)) {
      if (TABLE_SEPARATOR.test(line)) continue;
      const cells = splitCells(line);
      const lower = cells.map((c) => c.toLowerCase());
      if (!tableCols) {
        const owner = lower.indexOf("owner");
        const action = lower.indexOf("action");
        if (owner >= 0 && action >= 0) {
          tableCols = { owner, action, due: lower.indexOf("due") };
        }
        continue;
      }
      const task = (cells[tableCols.action] ?? "").trim();
      if (task) {
        const owner = (cells[tableCols.owner] ?? "").trim();
        const due = tableCols.due >= 0 ? (cells[tableCols.due] ?? "").trim() : "";
        items.push({
          line: lineNo,
          checked: false,
          ownerRaw: owner && owner !== "-" ? owner : null,
          task: cleanText(task),
          dueRaw: due && due !== "-" ? due : null,
          indent: 0,
        });
      }
      continue;
    }
    tableCols = null;

    const cb = CHECKBOX.exec(line);
    if (cb) {
      const width = indentWidth(cb[1]);
      while (indentStack.length && indentStack[indentStack.length - 1] >= width) indentStack.pop();
      const depth = indentStack.length;
      indentStack.push(width);
      if (cb[3].trim() === "") continue;
      items.push({ line: lineNo, checked: cb[2] !== " ", indent: depth, ...splitItemText(cb[3]) });
      continue;
    }

    const act = ACTION_LINE.exec(line);
    if (act) {
      if (act[1].trim() !== "") {
        items.push({ line: lineNo, checked: false, indent: 0, ...splitItemText(act[1]) });
      }
      continue;
    }

    if (line.trim() === "" || !/^\s*[-*+]\s/.test(line)) indentStack.length = 0;

    // Header fields (first occurrence wins).
    if (title === null) {
      const t = TITLE_LINE.exec(line);
      if (t) {
        title = t[1].replace(/^meeting:\s*/i, "").trim() || null;
        continue;
      }
    }
    if (!dateSeen) {
      const d = DATE_LINE.exec(line);
      if (d) {
        dateSeen = true;
        dateRaw = d[1] === "" ? null : d[1];
        continue;
      }
    }
    if (attendees === null) {
      const a = ATTENDEES_LINE.exec(line);
      if (a) {
        attendees = a[1]
          .replace(/^\[/, "")
          .replace(/\]$/, "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        continue;
      }
    }
  }

  if (!dateSeen && attendees === null) {
    return skipped(file, "no meeting header (date/attendees missing)");
  }

  const warnings: string[] = [];
  if (!dateSeen) warnings.push("date line missing");
  if (attendees === null) warnings.push("attendees missing");
  if (items.length === 0) warnings.push("no action items found");

  const note: ParsedNote = { file, title, dateRaw, attendees: attendees ?? [], items };
  return { kind: "parsed", note, warnings };
}

/** Parses one meeting note. Never throws. */
export function parseNote(file: string, content: Buffer | string): ParseOutcome {
  try {
    return parseInner(file, content);
  } catch (err) {
    return skipped(file, `unexpected parse error: ${(err as Error).message}`);
  }
}
