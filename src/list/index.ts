import type { ISODate, Store } from "../core/types.js";
import { filterItems, type ListFilters } from "./filterItems.js";
import { formatTable } from "./formatTable.js";

export { filterItems, displayStatus } from "./filterItems.js";
export type { ListFilters, DisplayStatus } from "./filterItems.js";
export { formatTable } from "./formatTable.js";

/** Read-only. Module 10 calls this with the loaded store, today(opts.today), process.stdout.columns. */
export function runList(store: Store, filters: ListFilters, today: ISODate, width?: number): string {
  return formatTable(filterItems(store.items, filters, today), today, width);
}
