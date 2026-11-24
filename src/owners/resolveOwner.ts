export interface OwnerResolution {
  status: "resolved" | "unassigned" | "ambiguous";
  /** Resolved full names (several only for "Everyone"). */
  owners: string[];
  /** Populated when ambiguous. */
  candidates: string[];
  warning?: string;
}

const GROUP_WORDS = new Set(["everyone", "all", "team"]);

/** Lowercase, collapse whitespace, trim. */
export function normaliseName(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Name tokens: normalised, split on whitespace, trailing dots dropped ("N." -> "n"). */
export function tokenise(s: string): string[] {
  const n = normaliseName(s);
  if (n === "") return [];
  return n.split(" ").map((t) => t.replace(/\.+$/, "")).filter((t) => t !== "");
}

type Match = { kind: "none" } | { kind: "one"; name: string } | { kind: "many"; names: string[] };

function toMatch(names: string[]): Match {
  const uniq = [...new Set(names)];
  if (uniq.length === 0) return { kind: "none" };
  if (uniq.length === 1) return { kind: "one", name: uniq[0]! };
  return { kind: "many", names: uniq };
}

/** Rules 3 to 5 against one pool of people. */
function matchIn(raw: string, pool: string[]): Match {
  const rawTokens = tokenise(raw);
  const rawNorm = rawTokens.join(" ");

  // Exact full-name match.
  const exact = pool.filter((p) => tokenise(p).join(" ") === rawNorm);
  if (exact.length > 0) return toMatch(exact);

  const first = rawTokens[0];
  if (first === undefined) return { kind: "none" };

  if (rawTokens.length === 1) {
    return toMatch(pool.filter((p) => tokenise(p)[0] === first));
  }
  if (rawTokens.length === 2 && rawTokens[1]!.length === 1) {
    const initial = rawTokens[1]!;
    return toMatch(
      pool.filter((p) => {
        const t = tokenise(p);
        return t[0] === first && t.length > 1 && t[t.length - 1]!.startsWith(initial);
      }),
    );
  }
  return { kind: "none" };
}

export function resolveOwner(
  ownerRaw: string | null,
  attendees: string[],
  knownPeople: string[],
): OwnerResolution {
  const raw = ownerRaw === null ? "" : ownerRaw.trim().replace(/\s+/g, " ");
  if (raw === "") return { status: "unassigned", owners: [], candidates: [] };

  if (GROUP_WORDS.has(raw.toLowerCase())) {
    if (attendees.length === 0) {
      return {
        status: "unassigned",
        owners: [],
        candidates: [],
        warning: `owner "${raw}" used but meeting has no attendee list`,
      };
    }
    return { status: "resolved", owners: [...new Set(attendees)], candidates: [] };
  }

  const inAttendees = matchIn(raw, attendees);
  if (inAttendees.kind === "one") {
    return { status: "resolved", owners: [inAttendees.name], candidates: [] };
  }
  if (inAttendees.kind === "many") {
    return { status: "ambiguous", owners: [], candidates: inAttendees.names };
  }

  const inKnown = matchIn(raw, knownPeople);
  if (inKnown.kind === "one") {
    return {
      status: "resolved",
      owners: [inKnown.name],
      candidates: [],
      warning: "owner not in attendee list",
    };
  }
  return {
    status: "unassigned",
    owners: [],
    candidates: [],
    warning: `owner "${raw}" not recognised`,
  };
}
