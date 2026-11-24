import type { ISODate, Item } from "../core/types.js";
import { displayStatus } from "./filterItems.js";

const HEADERS = ["ID", "OWNER", "TASK", "DUE", "STATUS", "SOURCE"];

function ownerLabel(i: Item): string {
  if (i.ownerStatus === "resolved" && i.owner) return i.owner;
  if (i.ownerStatus === "ambiguous") {
    const raw = i.ownerRaw ?? "?";
    const last = i.ownerCandidates.map((c) => c.split(/\s+/).slice(1).join(" ") || c);
    return `? ${raw} (${last.join("|")})`;
  }
  return "UNASSIGNED";
}

function sourceLabel(i: Item): string {
  if (i.sources.length === 0) return "-";
  const more = i.sources.length > 1 ? ` +${i.sources.length - 1} more` : "";
  return `${i.sources[0].file}${more}`;
}

const len = (s: string) => Array.from(s).length;

function truncate(s: string, max: number): string {
  const chars = Array.from(s);
  if (chars.length <= max) return s;
  return chars.slice(0, Math.max(0, max - 1)).join("") + "…";
}

/** Render the table. `width` defaults to 100. Only the TASK column is truncated. */
export function formatTable(items: readonly Item[], today: ISODate, width = 100): string {
  if (items.length === 0) return "No items match.";
  const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
  const rows = items.map((i) => [
    String(i.id), ownerLabel(i), oneLine(i.task), i.due ?? "no date", displayStatus(i, today), sourceLabel(i),
  ]);
  const w = HEADERS.map((h, c) => Math.max(h.length, ...rows.map((r) => len(r[c]))));
  const gap = 2;
  const fixed = w.reduce((a, b, c) => (c === 2 ? a : a + b), 0) + gap * (HEADERS.length - 1);
  w[2] = Math.max(HEADERS[2].length, Math.min(w[2], width - fixed));
  const line = (cells: string[]) =>
    cells
      .map((cell, c) => {
        const t = c === 2 ? truncate(cell, w[c]) : cell;
        return t + " ".repeat(Math.max(0, w[c] - len(t)));
      })
      .join(" ".repeat(gap))
      .trimEnd();
  const footer = `${items.length} ${items.length === 1 ? "item" : "items"}`;
  return [line(HEADERS), ...rows.map(line), "", footer].join("\n");
}
