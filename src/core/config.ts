import { join } from "node:path";

export interface Config {
  storePath: string;
  peoplePath: string;
  outboxDir: string;
}

export interface ConfigOverrides {
  store?: string;
  people?: string;
  outbox?: string;
}

/**
 * Precedence: explicit override (CLI flag) > environment variable > default.
 * Defaults are relative to `cwd`.
 */
export function resolveConfig(
  overrides: ConfigOverrides = {},
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): Config {
  return {
    storePath: overrides.store ?? env.ACTIONTRACK_STORE ?? join(cwd, ".actiontrack", "store.json"),
    peoplePath: overrides.people ?? env.ACTIONTRACK_PEOPLE ?? join(cwd, "people.json"),
    outboxDir: overrides.outbox ?? env.ACTIONTRACK_OUTBOX ?? join(cwd, "outbox"),
  };
}
