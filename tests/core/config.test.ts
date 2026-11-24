import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig } from "../../src/core/config.js";
import { ActiontrackError, NotFoundError, StoreError, UsageError } from "../../src/core/errors.js";

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

  it("reads ACTIONTRACK_OUTBOX from the environment", () => {
    expect(resolveConfig({}, { ACTIONTRACK_OUTBOX: "env-outbox" }, cwd).outboxDir).toBe("env-outbox");
  });

  it("applies each override independently", () => {
    const base = resolveConfig({}, {}, cwd);
    expect(resolveConfig({ people: "p.json" }, {}, cwd)).toEqual({ ...base, peoplePath: "p.json" });
    expect(resolveConfig({ outbox: "o" }, {}, cwd)).toEqual({ ...base, outboxDir: "o" });
    expect(resolveConfig({ store: "s.json" }, {}, cwd)).toEqual({ ...base, storePath: "s.json" });
  });
});

describe("errors", () => {
  it("carry the documented exit codes", () => {
    expect(new NotFoundError("x").exitCode).toBe(1);
    expect(new UsageError("x").exitCode).toBe(2);
    expect(new StoreError("x").exitCode).toBe(3);
    expect(new UsageError("x").name).toBe("UsageError");
  });

  it.each([NotFoundError, UsageError, StoreError])("%o is an Error and an ActiontrackError and keeps its message", (Ctor) => {
    const e = new Ctor("boom");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(ActiontrackError);
    expect(e.message).toBe("boom");
  });
});
