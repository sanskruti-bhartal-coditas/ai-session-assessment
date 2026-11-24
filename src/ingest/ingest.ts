import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { UsageError } from "../core/errors.js";
import { allocateId } from "../core/store.js";
import type { Store } from "../core/types.js";
import { parseMeetingDate, resolveDue } from "../dates/index.js";
import { createItem, findMatch, mergeInto } from "../dedupe/index.js";
import type { NewItem } from "../dedupe/index.js";
import { resolveOwner } from "../owners/index.js";
import { parseNote } from "../parser/parseNote.js";

export interface IngestReport {
  filesSeen: number;
  filesParsed: number;
  filesSkipped: { file: string; reason: string }[];
  filesIgnored: string[];
  itemsAdded: number;
  itemsMerged: number;
  itemsUnchanged: number;
  /** Open items in the store after the run (not only this run's items). */
  unassigned: number;
  ambiguous: number;
  noDueDate: number;
  warnings: { file: string; message: string }[];
  notes: string[];
}

export interface IngestContext {
  /** Timestamp used for createdAt / doneAt. */
  now: Date;
  /** Extra known people (e.g. from people.json) seeding the owner fallback pool. */
  knownPeople?: string[];
}

/** Code-unit ordering, so the order does not depend on locale. */
function byName(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function listFolder(folder: string): { md: string[]; ignored: string[] } {
  let isDir = false;
  try {
    isDir = statSync(folder).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) throw new UsageError(`not a folder: ${folder}`);

  const md: string[] = [];
  const ignored: string[] = [];
  for (const e of readdirSync(folder, { withFileTypes: true })) {
    if (!e.isFile()) continue;
    (e.name.toLowerCase().endsWith(".md") ? md : ignored).push(e.name);
  }
  return { md: md.sort(byName), ignored: ignored.sort(byName) };
}

/**
 * Orchestrates parser, dates, owners and dedupe over a folder. Mutates `store` in memory only;
 * the caller saves it once the run has completed.
 */
export function ingestFolder(folder: string, store: Store, ctx: IngestContext): IngestReport {
  const { md, ignored } = listFolder(folder);
  const nowIso = ctx.now.toISOString();
  const report: IngestReport = {
    filesSeen: md.length,
    filesParsed: 0,
    filesSkipped: [],
    filesIgnored: ignored,
    itemsAdded: 0,
    itemsMerged: 0,
    itemsUnchanged: 0,
    unassigned: 0,
    ambiguous: 0,
    noDueDate: 0,
    warnings: [],
    notes: [],
  };
  const known = new Set<string>(ctx.knownPeople ?? []);

  for (const file of md) {
    const warn = (message: string) => report.warnings.push({ file, message });
    const skip = (reason: string) => report.filesSkipped.push({ file, reason });

    let bytes: Buffer;
    try {
      bytes = readFileSync(join(folder, file));
    } catch (e) {
      skip(`cannot read file: ${(e as Error).message}`);
      continue;
    }

    const outcome = parseNote(file, bytes);
    if (outcome.kind === "skipped") {
      skip(outcome.reason);
      continue;
    }
    outcome.warnings.forEach(warn);
    const note = outcome.note;

    const meeting = parseMeetingDate(note.dateRaw, file);
    if (meeting.warning) warn(meeting.warning);
    if (meeting.date === null) {
      skip("no usable meeting date");
      continue;
    }
    const meetingDate = meeting.date;
    report.filesParsed++;
    note.attendees.forEach((a) => known.add(a));

    for (const raw of note.items) {
      const owner = resolveOwner(raw.ownerRaw, note.attendees, [...known]);
      if (owner.warning) warn(`line ${raw.line}: ${owner.warning}`);
      const due = resolveDue(raw.dueRaw, meetingDate);
      if (due.warning) warn(`line ${raw.line}: ${due.warning}`);

      const base = {
        ownerRaw: raw.ownerRaw,
        task: raw.task,
        due: due.due,
        dueRaw: raw.dueRaw,
        checked: raw.checked,
        source: { file, meetingDate, line: raw.line },
      };
      // "Everyone" expands to one candidate per owner; other cases give exactly one.
      const candidates: NewItem[] =
        owner.status === "resolved"
          ? owner.owners.map((o) => ({ ...base, owner: o, ownerStatus: "resolved", ownerCandidates: [] }))
          : [{ ...base, owner: null, ownerStatus: owner.status, ownerCandidates: owner.candidates }];

      for (const cand of candidates) {
        const match = findMatch(cand, store.items);
        if (match) {
          const { changed, notes } = mergeInto(match, cand);
          if (changed) report.itemsMerged++;
          else report.itemsUnchanged++;
          report.notes.push(...notes);
        } else {
          store.items.push(createItem(cand, allocateId(store), nowIso));
          report.itemsAdded++;
        }
      }
    }
  }

  for (const item of store.items) {
    if (item.status !== "open") continue;
    if (item.ownerStatus === "unassigned") report.unassigned++;
    if (item.ownerStatus === "ambiguous") report.ambiguous++;
    if (item.due === null) report.noDueDate++;
  }
  return report;
}

export function formatReport(r: IngestReport): string {
  const lines = [
    `Ingested ${r.filesSeen} files: ${r.filesParsed} parsed, ${r.filesSkipped.length} skipped, ${r.filesIgnored.length} ignored`,
    `Items: ${r.itemsAdded} added, ${r.itemsMerged} merged, ${r.itemsUnchanged} unchanged`,
    `Needs attention: ${r.unassigned} unassigned, ${r.ambiguous} ambiguous owner, ${r.noDueDate} no due date`,
  ];
  if (r.filesSkipped.length > 0) {
    lines.push("", "Skipped:", ...r.filesSkipped.map((s) => `  ${s.file}: ${s.reason}`));
  }
  if (r.filesIgnored.length > 0) {
    lines.push("", "Ignored (not .md):", ...r.filesIgnored.map((f) => `  ${f}`));
  }
  if (r.warnings.length > 0) {
    lines.push("", "Warnings:", ...r.warnings.map((w) => `  ${w.file}: ${w.message}`));
  }
  if (r.notes.length > 0) {
    lines.push("", "Notes:", ...r.notes.map((n) => `  ${n}`));
  }
  return lines.join("\n");
}

export interface RunIngestDeps {
  load: () => Store;
  save: (s: Store) => void;
  ctx: IngestContext;
}

/** Load, ingest, save once at the end, and return the printable report. Nothing is saved on error. */
export function runIngest(folder: string, deps: RunIngestDeps): string {
  const store = deps.load();
  const report = ingestFolder(folder, store, deps.ctx);
  deps.save(store);
  return formatReport(report);
}
