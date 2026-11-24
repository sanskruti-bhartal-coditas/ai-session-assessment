# 10-cli: Plan

## Purpose
The command-line entry point: argument parsing, wiring the four commands to their modules, global options, error handling and exit codes.

## Scope
- `src/cli.ts` using `commander`.
- Global options and config resolution.
- A central error handler mapping errors to exit codes.
- Help text and README.

## Out of scope
Business logic. Each command only calls into its module.

## Depends on
All other modules.

## Approach
Each command is a thin handler: parse arguments, load the store, call the module function, print, and save if needed. Errors are thrown as typed errors (01-core) and caught in one place.

## Risks
- Logic leaking into the CLI layer. Mitigation: handlers stay thin, and module functions are testable without the CLI.
- Inconsistent exit codes. Mitigation: a single handler.

## Done when
All 12 scenarios in REQUIREMENTS.md pass through the real CLI, and the README example commands work.
