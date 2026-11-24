export type ISODate = string; // "YYYY-MM-DD"
export type ItemStatus = "open" | "done";
export type OwnerStatus = "resolved" | "unassigned" | "ambiguous";

export interface Source {
  file: string;
  meetingDate: ISODate;
  line: number;
}

export interface Item {
  /** Stable, never reused. */
  id: number;
  /** Full name, or null when unassigned/ambiguous. */
  owner: string | null;
  /** Owner text as written ("Priya", "Priya N."). */
  ownerRaw: string | null;
  ownerStatus: OwnerStatus;
  /** Populated when ownerStatus is "ambiguous". */
  ownerCandidates: string[];
  /** Cleaned display text. */
  task: string;
  /** Normalised key used for dedupe. */
  taskKey: string;
  due: ISODate | null;
  /** Due phrase as written ("by Friday"). */
  dueRaw: string | null;
  status: ItemStatus;
  /** Every meeting the item appeared in. */
  sources: Source[];
  /** ISO timestamp. */
  createdAt: string;
  doneAt: string | null;
}

export interface Store {
  version: 1;
  nextId: number;
  items: Item[];
}
