import { existsSync, readFileSync } from "node:fs";
import { UsageError } from "../core/errors.js";

/** Load people.json (full name -> email). A missing file gives an empty map. */
export function loadPeople(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new UsageError(`${path} is not valid JSON: ${(e as Error).message}`);
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new UsageError(`${path} must be a JSON object mapping full name to email`);
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v !== "string") throw new UsageError(`${path}: email for "${k}" must be a string`);
    out[k] = v;
  }
  return out;
}
