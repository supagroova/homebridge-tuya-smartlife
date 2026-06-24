---
name: ship
description: Verify, commit, and push the current branch. Runs make check (lint + typecheck + tdd-audit + tests), then commits the work-tree changes with a clear message and pushes to the current branch. Use when the user wants to finalize a chunk of work — e.g. "ship it", "/ship", "verify and push", or after applying review suggestions.
---

# /ship

Sequence (stop at any failure):

1. **Verify** — run `make check`. This project's gate is `lockfile-check + lint + typecheck + tdd-audit + test` (no E2E, no DB). Report exact counts:
   - test count + pass/fail (e.g. `5 tests passed`)
   - lint clean (or list errors)
   - typecheck clean (or list errors)
   - tdd-audit clean (or list flagged untested files)
   If anything fails, stop here and surface the failure to the user. **Do not commit broken work.**

2. **Survey changes** — run `git status -s` and `git diff --stat` to summarise what's about to be committed.

3. **Stage explicitly** — add the changed files individually by path. **NEVER `git add -A` and NEVER `git add .`** — those can pull in untracked secrets or build artifacts. Skip anything that looks like a secret: `.env*` and `*.pem`.

4. **Commit** — use a HEREDOC for the message. Format: a concise title (≤72 chars, imperative, conventional-ish — `Add X`, `Fix Y`, `Refactor Z`) followed by a short bullet list of what changed and why.

   Do **NOT** add a `Co-Authored-By` attribution trailer.

5. **Push** — `git push` to the current branch's remote tracking branch. If there's no upstream, set one with `git push -u origin <branch>`. **Do not force-push.** **Do not push to `main` directly** — if the current branch is `main`, stop and confirm with the user first.

6. **Report** — print the commit SHA + the result of `git push`.

## Refuse to proceed if

- `make check` is failing (anything: lockfile-check, lint, typecheck, tdd-audit, or tests).
- The user hasn't authorised pushing (re-read the request — "ship" is implicit authorisation, but if the conversation says "just commit, don't push", honour that).
- The working tree has changes to `.env*` or a `*.pem` file. Stop and ask.

## Example

```
User: /ship
Claude: Running make check…
        ✓ 5 tests, lint clean, typecheck clean, tdd-audit clean
        Staging 2 modified + 1 new file (by path).
        Committed abc1234: "Add Tuya token refresh"
        Pushed to origin/feature-x.
```
