import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/core/config.js";
import { NotFoundError, StoreError, UsageError } from "../../src/core/errors.js";

describe("resolveConfig", () => {
  const cwd = join("/work");

  it("uses defaults relative to cwd", () => {
    expect(resolveConfig({}, {}, cwd)).toEqual({
      storePath: join(cwd, ".actiontrack", "store.json"),
      peoplePath: join(cwd, "people.json"),
      outboxDir: join(cwd, "outbox"),
    });
  });

  it("prefers overrides over env over defaults", () => {
    const env = { ACTIONTRACK_STORE: "env.json", ACTIONTRACK_PEOPLE: "env-people.json" };
    const c = resolveConfig({ store: "flag.json" }, env, cwd);
    expect(c.storePath).toBe("flag.json");
    expect(c.peoplePath).toBe("env-people.json");
    expect(c.outboxDir).toBe(join(cwd, "outbox"));
  });
});

describe("errors", () => {
  it("carry the documented exit codes", () => {
    expect(new NotFoundError("x").exitCode).toBe(1);
    expect(new UsageError("x").exitCode).toBe(2);
    expect(new StoreError("x").exitCode).toBe(3);
    expect(new UsageError("x").name).toBe("UsageError");
  });
});
