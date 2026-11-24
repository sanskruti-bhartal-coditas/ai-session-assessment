---
name: raise-pr
description: Commit the current work, push the branch to the remote, and give back a pull request link with a PR summary. Use when the user asks to raise, open, or create a PR, or types /raise-pr.
disable-model-invocation: true
---

# raise-pr

Commit, push, and hand the user a PR link plus a ready-to-paste PR summary. Optional argument: the base branch (default `main`).

## Steps

1. **Inspect state**
   - `git branch --show-current`, `git status --short`, `git remote -v`.
   - If on the base branch (`main`), stop and ask for a branch name. Create it with `git checkout -b <name>` (use `feature/<module-or-topic>`), never commit straight to `main`.
   - If there is no `origin` remote, stop and tell the user.

2. **Verify before committing**
   - Run `npm run typecheck` and `npm test`. If either fails, stop and report the failure. Do not commit or push failing work.

3. **Commit (only if there are changes)**
   - Stage files by name or with `git add -A` after checking `git status` for anything that should not be committed (`.env`, credentials, `.actiontrack/`, `outbox/*.json` payloads, `node_modules/`, `dist/`). If any are present, leave them out and say so.
   - Write a commit message in the style of `git log --oneline`: an imperative summary line, a short body explaining why, and the attribution line from the session's system-reminder.
   - If there is nothing to commit, skip this step and continue.

4. **Push**
   - `git push -u origin <branch>`. Never force-push. If the push is rejected, stop and report it.

5. **Gather PR content**
   - `git log --oneline <base>..HEAD` and `git diff --stat <base>...HEAD`.
   - Read the changed files and any module docs they relate to (`modules/<NN>-<name>/spec.md` and `tasks.md`) so the summary is accurate.

6. **Write the PR title and description** (Markdown, for reviewers). Use these sections, and omit any that has nothing to say:
   - `## Summary`: what this PR does and why, in 2 to 4 sentences, naming the spec or module.
   - `## Changes`: bullets grouped by file or area.
   - `## Beyond the spec`: anything added or decided that the spec does not state.
   - `## Testing`: the exact commands run and their real results (counts, pass/fail). Mention anything not covered.
   - `## Notes for reviewers`: follow-ups, known limits, what comes next.
   - End with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
   - Report only what you actually ran. Do not claim tests passed unless step 2 passed in this run.

7. **Create the PR**
   - If `gh` is available (`gh --version` in Bash, or `Get-Command gh` in PowerShell) and authenticated: write the description to a temp file in the scratchpad directory and run `gh pr create --base <base> --head <branch> --title "<title>" --body-file <file>`. Use the URL it prints.
   - Otherwise build the compare link from the remote URL: `https://github.com/<owner>/<repo>/compare/<base>...<branch>?expand=1`. Optionally prefill it with `quick_pull=1&title=...&body=...` (URL-encoded) when the result stays under about 6000 characters. Say clearly that the PR has **not** been created yet and the user has to click the link to open it.
   - If an open PR already exists for the branch (`gh pr view`), report its link instead of creating a duplicate, and update its description only if the user asked.

8. **Report back** in this order:
   1. The PR link (state whether the PR was created or only the compare link is ready).
   2. The commit hash(es) pushed.
   3. The PR title and the full description, so it can be pasted.
   4. Anything skipped or left out (files not committed, checks not run).

## Rules
- Never push to `main`, force-push, or merge the PR.
- Never skip hooks or bypass signing.
- Keep private details (the user's email, internal project names beyond the repo's own) out of the PR text unless they are already in the repo.
