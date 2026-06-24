---
phase: 01-project-scaffolding-tdd-gates
plan: 03
subsystem: ci-cd
tags: [ci, github-actions, publish, provenance, ship-skill, quality-gate]
requires:
  - make-check-gate
  - committed-lockfile
  - tdd-audit
provides:
  - ci-matrix-gate
  - publish-on-tag
  - ship-skill
affects:
  - .github/workflows/ci.yml
  - .github/workflows/publish.yml
  - .claude/skills/ship/SKILL.md
tech-stack:
  added: []
  patterns:
    - "CI invokes the same aggregate gate as local hooks (make check) so CI and local stay identical"
    - "Node version matrix [22, 24] matches package.json engines ^22 || ^24"
    - "Least-privilege GITHUB_TOKEN: top-level contents:read in CI; publish job scoped to contents:read + id-token:write"
    - "Publish-on-tag uses npm Trusted Publishing / --provenance; NODE_AUTH_TOKEN is the fallback only"
    - "GitHub-maintained actions pinned at major (@v4)"
    - "/ship: make check -> survey -> explicit per-path staging -> HEREDOC commit (no attribution trailer) -> guarded push"
key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/publish.yml
    - .claude/skills/ship/SKILL.md
  modified: []
decisions:
  - "CI runs `make check` + `npm run build` rather than STACK.md's raw lint/test/build steps, per the plan's interface contract — keeps CI and the local hook gate (lockfile-check + lint + typecheck + tdd-audit + test) identical, so a PR is gated by exactly what the author runs locally."
  - "Adapted localizer's /ship skill: dropped the E2E/DB references and migration-snapshot path (not part of this project's gate), updated the gate description to lockfile-check + lint + typecheck + tdd-audit + test, and preserved all guardrails (explicit staging, no Co-Authored-By, no force-push, no unconfirmed main push, skip .env*/*.pem)."
metrics:
  duration: ~5m
  completed: 2026-06-24
  tasks: 2
  files: 3
status: complete
---

# Phase 1 Plan 3: CI + /ship Summary

Closed Phase 1 by wiring the local quality gate into CI and adding a single guarded
shipping command. A GitHub Actions workflow now runs the full gate (`make check` =
lockfile-check + lint + typecheck + tdd-audit + test) plus `npm run build` on a Node 22/24
matrix for every push and pull_request, with a least-privilege `GITHUB_TOKEN`. A
publish-on-tag workflow publishes to npm with provenance (OIDC trusted publishing). The
`/ship` skill verifies before committing and pushing, with the project's git guardrails
preserved. Satisfies FND-03 and FND-04.

## What Was Built

- **CI workflow (Task 1, `.github/workflows/ci.yml`):** `on: [push, pull_request]`; top-level
  `permissions: { contents: read }` scoping down the default `GITHUB_TOKEN`; job `test` on
  `ubuntu-latest` with `strategy.matrix.node: [22, 24]` (matches `engines: ^22 || ^24`); steps
  `actions/checkout@v4` → `actions/setup-node@v4` (`node-version: ${{ matrix.node }}`,
  `cache: 'npm'`) → `npm ci` (lockfile guard) → `make check` (the aggregate gate) → `npm run build`.
- **Publish workflow (Task 1, `.github/workflows/publish.yml`):** `on: push tags ['v*']`; job
  `permissions: { contents: read, id-token: write }` for npm provenance; steps checkout@v4 →
  setup-node@v4 (node 22, `registry-url: https://registry.npmjs.org`) → `npm ci` →
  `npm test -- --coverage` → `npm run build` → `npm publish --provenance --access public` with
  `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` as the fallback when trusted publishing is not enabled.
  No secrets committed.
- **/ship skill (Task 2, `.claude/skills/ship/SKILL.md`):** adapted from the localizer ship skill.
  Sequence (stop on any failure): run `make check` and report counts → survey with
  `git status -s` + `git diff --stat` → stage explicitly by path (no `git add -A`/`.`, skip
  `.env*`/`*.pem`) → HEREDOC commit with no `Co-Authored-By` trailer → push to current branch
  (set upstream if missing, never force, never `main` without confirmation) → report SHA + push
  result. Gate description matched to this project (lint + typecheck + tdd-audit + test; no E2E/DB).

## Verification Results

- `node` (js-yaml) parses both `ci.yml` and `publish.yml` — valid YAML.
- ci.yml grep checks: `matrix`, `npm ci`, `make check`, `contents: read` all present; triggers on
  push + pull_request; matrix lists 22 and 24; actions pinned at `@v4`.
- publish.yml grep checks: `provenance`, `id-token: write` present; triggers on `v*` tags.
- ship SKILL.md: exists; contains `make check`; instructs explicit per-path staging.
- `make check` — exits 0 on the clean tree (1 suite, 5 tests pass, lint/typecheck/tdd-audit clean).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] YAML validator swapped from python `yaml` to node `js-yaml`**
- **Found during:** Task 1 (running the plan's automated verify command).
- **Issue:** The plan's verify used `python3 -c "import yaml; ..."`, but PyYAML is not installed in
  this environment (`ModuleNotFoundError: No module named 'yaml'`).
- **Fix:** Validated both workflows with the already-present `js-yaml` (a transitive devDependency)
  via `node -e "const y=require('js-yaml')..."`. Equivalent YAML-parse assertion; the workflow files
  themselves are unchanged. No file edited — this only affects how the verification was run.
- **Files modified:** none
- **Commit:** n/a (verification-only)

### Design choice (not a deviation)

- CI runs `make check` + `npm run build` rather than STACK.md's raw `npm run lint` / `npm test --
  --coverage` / `npm run build` steps. This follows the plan's explicit interface contract ("Run the
  gate as `make check`") so CI and the local hook gate stay identical.

## Threat Mitigations Applied

- **T-01-06 (GITHUB_TOKEN scope, EoP):** ci.yml declares top-level `permissions: { contents: read }`;
  publish job narrowed to `{ contents: read, id-token: write }` — least privilege per job.
- **T-01-07 (npm publish authenticity, Spoofing/Tampering):** `npm publish --provenance` with
  `id-token: write` (npm Trusted Publishing); long-lived `NPM_TOKEN` is the documented fallback only.
- **T-01-08 (lockfile drift in CI, Tampering):** CI runs `npm ci` before the gate, mirroring the
  Plan 02 local lockfile guard.
- **T-01-09 (secrets staged by /ship, Info Disclosure):** /ship stages explicitly by path (no blanket
  add) and refuses on `.env*` / `*.pem` changes.
- **T-01-SC (third-party action refs, accepted):** only GitHub-maintained `checkout` and `setup-node`
  used, pinned at `@v4`; no third-party marketplace actions introduced.

## Self-Check: PASSED
- FOUND: .github/workflows/ci.yml, .github/workflows/publish.yml, .claude/skills/ship/SKILL.md
- FOUND commits: 00e5146 (Task 1 — CI workflows), 1a93fbe (Task 2 — /ship skill)
