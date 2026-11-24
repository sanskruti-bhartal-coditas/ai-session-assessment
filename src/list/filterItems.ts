import { isValidISODate } from "../core/clock.js";
import { UsageError } from "../core/errors.js";
import type { ISODate, Item } from "../core/types.js";
import { isOverdue } from "../dates/index.js";

export interface ListFilters {
  owner?: string;
  status?: string;
  dueBefore?: string;
}

export type DisplayStatus = "open" | "done" | "overdue";

export function displayStatus(item: Item, today: ISODate): DisplayStatus {
  return isOverdue(item, today) ? "overdue" : item.status;
}

function matchesOwner(item: Item, ownerArg: string): boolean {
  const q = ownerArg.trim().toLowerCase();
  if (q === "unassigned") return item.ownerStatus === "unassigned";
  if (q === "ambiguous") return item.ownerStatus === "ambiguous";
  if (item.ownerStatus !== "resolved" || !item.owner) return false;
  const full = item.owner.toLowerCase();
  if (full === q) return true;
  if (/\s/.test(q)) return false;
  return full.split(/\s+/).includes(q);
}

/** Validate filters, filter and sort. Pure: never mutates items. Status is case-sensitive. */
export function filterItems(items: readonly Item[], filters: ListFilters, today: ISODate): Item[] {
  const { owner, status, dueBefore } = filters;
  if (status !== undefined && !["open", "done", "overdue"].includes(status)) {
    throw new UsageError(`invalid status "${status}", expected open, done or overdue`);
  }
  if (dueBefore !== undefined && !isValidISODate(dueBefore)) {
    throw new UsageError(`invalid date "${dueBefore}", expected YYYY-MM-DD`);
  }
  if (owner !== undefined && owner.trim() === "") throw new UsageError("owner must not be empty");

  const rank = (i: Item) => (isOverdue(i, today) ? 0 : 1);
  return items
    .filter((i) => owner === undefined || matchesOwner(i, owner))
    .filter((i) => {
      if (status === undefined) return true;
      return status === "overdue" ? isOverdue(i, today) : i.status === status;
    })
    .filter((i) => dueBefore === undefined || (i.due !== null && i.due < dueBefore))
    .sort((a, b) => {
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.due !== b.due) {
        if (a.due === null) return 1;
        if (b.due === null) return -1;
        return a.due < b.due ? -1 : 1;
      }
      return a.id - b.id;
    });
}
