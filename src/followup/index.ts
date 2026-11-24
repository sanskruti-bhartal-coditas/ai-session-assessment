import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { NotFoundError, UsageError } from "../core/errors.js";
import type { ISODate, Item, Store } from "../core/types.js";
import { isOverdue } from "../dates/index.js";
import { loadPeople, tokenise } from "../owners/index.js";

export type OwnerMatch =
  | { kind: "one"; name: string }
  | { kind: "many"; names: string[] }
  | { kind: "none" };

/** Resolves the CLI argument against the owners of stored items (resolved owners only). */
export function resolveFollowupOwner(store: Store, arg: string): OwnerMatch {
  const argTokens = tokenise(arg);
  if (argTokens.length === 0) throw new UsageError("owner must not be empty");
  const names = [
    ...new Set(
      store.items.filter((i) => i.ownerStatus === "resolved" && i.owner).map((i) => i.owner as string),
    ),
  ].sort();
  const key = argTokens.join(" ");
  const exact = names.filter((n) => tokenise(n).join(" ") === key);
  const hits =
    exact.length > 0
      ? exact
      : names.filter((n) => {
          const t = tokenise(n);
          return argTokens.every((a) => t.includes(a));
        });
  if (hits.length === 0) return { kind: "none" };
  if (hits.length === 1) return { kind: "one", name: hits[0]! };
  return { kind: "many", names: hits };
}

const byDueThenId = (a: Item, b: Item) =>
  a.due === b.due ? a.id - b.id : a.due === null ? 1 : b.due === null ? -1 : a.due < b.due ? -1 : 1;

/** Splits a person's open items into overdue and open (not yet due or undated), sorted. */
export function selectItems(store: Store, owner: string, today: ISODate) {
  const mine = store.items.filter(
    (i) => i.ownerStatus === "resolved" && i.owner === owner && i.status === "open",
  );
  return {
    overdue: mine.filter((i) => isOverdue(i, today)).sort(byDueThenId),
    open: mine.filter((i) => !isOverdue(i, today)).sort(byDueThenId),
  };
}

const line = (i: Item) =>
  `- ${i.task} (${i.due ? `due ${i.due}` : "no due date"}, from ${i.sources[0]?.file ?? "unknown"})`;

export function renderEmail(
  owner: string,
  overdue: Item[],
  open: Item[],
): { subject: string; body: string } {
  const total = overdue.length + open.length;
  const subject = `Follow-up: your open action items (${total} open, ${overdue.length} overdue)`;
  const parts = [
    `Hi ${owner.trim().split(/\s+/)[0]},`,
    "Here are your open action items from recent meetings.",
  ];
  if (overdue.length > 0) parts.push([`OVERDUE (${overdue.length})`, ...overdue.map(line)].join("\n"));
  if (open.length > 0) parts.push([`OPEN (${open.length})`, ...open.map(line)].join("\n"));
  parts.push("Reply to me if any of these are already done or need a new date.", "Thanks");
  return { subject, body: parts.join("\n\n") };
}

export function slugify(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "owner"
  );
}

export interface FollowupOptions {
  owner: string;
  today: ISODate;
  force?: boolean;
  peoplePath: string;
  outboxDir: string;
}

export interface FollowupResult {
  /** Lines to print (stdout). */
  output: string[];
  /** Lines for stderr. */
  warnings: string[];
  payloadPath?: string;
}

/** Command logic. Never touches the store and never contacts Gmail; writes only the payload file. */
export function runFollowup(store: Store, opts: FollowupOptions): FollowupResult {
  const owner = opts.owner;
  if (owner.trim() === "") throw new UsageError("usage: followup <owner> [--force]");
  const m = resolveFollowupOwner(store, owner);
  if (m.kind === "many") {
    throw new UsageError(`"${owner}" is ambiguous: ${m.names.join(", ")}. Use the full name.`);
  }
  if (m.kind === "none") throw new NotFoundError(`no items for owner "${owner}"`);

  const { overdue, open } = selectItems(store, m.name, opts.today);
  if (overdue.length + open.length === 0) {
    return { output: [`${m.name} has no open items.`], warnings: [] };
  }

  const warnings: string[] = [];
  const people = loadPeople(opts.peoplePath);
  const to = people[m.name] ?? "";
  if (to === "") {
    warnings.push(
      `warning: no email for ${m.name} in people.json; the draft's To field will be empty`,
    );
  }

  const path = join(opts.outboxDir, `${slugify(m.name)}-${opts.today}.json`);
  if (existsSync(path) && !opts.force) {
    throw new UsageError("outbox file exists, use --force to overwrite");
  }

  const { subject, body } = renderEmail(m.name, overdue, open);
  const payload = {
    to,
    subject,
    body,
    owner: m.name,
    generatedFor: opts.today,
    itemIds: [...overdue, ...open].map((i) => i.id),
  };
  mkdirSync(opts.outboxDir, { recursive: true });
  const tmp = `${path}.tmp`;
  try {
    writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n", "utf8");
    renameSync(tmp, path);
  } catch (err) {
    rmSync(tmp, { force: true });
    throw err;
  }
  return {
    output: [
      `Payload written to ${path}. Ask Claude to create the Gmail draft from it. Nothing has been sent.`,
    ],
    warnings,
    payloadPath: path,
  };
}
