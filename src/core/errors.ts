/** Errors carry the process exit code the CLI should use. */
export abstract class ActiontrackError extends Error {
  abstract readonly exitCode: number;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Bad arguments or input from the user (exit 2). */
export class UsageError extends ActiontrackError {
  readonly exitCode = 2;
}

/** Store unreadable, corrupt, or unwritable (exit 3). */
export class StoreError extends ActiontrackError {
  readonly exitCode = 3;
}

/** Requested item or owner does not exist (exit 1). */
export class NotFoundError extends ActiontrackError {
  readonly exitCode = 1;
}
