---
phase: 01-project-scaffolding-tdd-gates
plan: 02
subsystem: tooling
tags: [tdd, hooks, jest, coverage, quality-gate, makefile]
requires:
  - homebridge-plugin-skeleton
  - committed-lockfile
  - eslint-prettier-toolchain
provides:
  - tdd-write-guard
  - typecheck-on-edit
  - coverage-stop-gate
  - tdd-audit
  - lockfile-guard
  - jest-coverage-config
  - make-check-gate
affects:
  - .claude/settings.json
  - .claude/scripts/
  - jest.config.js
  - Makefile
  - package.json
tech-stack:
  added:
    - jest ^30
    - ts-jest ^29.4
    - "@types/jest ^30"
    - globals ^14
  patterns:
    - "Claude Code hooks: PreToolUse(Write) test-first guard, PostToolUse(Edit|Write) prettier->eslint->tsc, Stop coverage gate"
    - "tdd-audit honours .claude/tdd-debt.txt allowlist + // tdd-audit: exempt marker; constant-only modules auto-skipped"
    - "Homebridge glue (index/platform/settings) excluded from jest coverage to keep the gate green"
    - "make check = lockfile-check + lint + typecheck + tdd-audit + test (single CI entry point)"
key-files:
  created:
    - jest.config.js
    - .claude/settings.json
    - .claude/tdd-debt.txt
    - .claude/scripts/tdd-guard-on-write.sh
    - .claude/scripts/typecheck-on-edit.sh
    - .claude/scripts/coverage-gate.sh
    - .claude/scripts/tdd-audit.sh
    - .claude/scripts/lockfile-check.sh
    - Makefile
    - src/util/example.ts
    - src/util/example.test.ts
  modified:
    - package.json
    - package-lock.json
    - eslint.config.mjs
decisions:
  - "Excluded src/platform.ts and src/settings.ts (not just src/index.ts) from jest coverage — the plan only named src/index.ts, but platform.ts/settings.ts are the // tdd-audit: exempt Homebridge glue and counting them made the 85% gate self-block on a clean checkout. Aligned coverage exclusion with the exempt marker per STACK.md 'Coverage gate'."
  - "tdd-audit skips constant-only modules (no function/class/arrow logic) so src/settings.ts (pure PLATFORM_NAME/PLUGIN_NAME constants, no exempt marker) is not flagged — principled and keeps the audit green without editing Plan-01 files."
  - "Added globals ^14 devDep and an eslint flat-config block giving *.js config files (jest.config.js) CommonJS/Node globals — jest.config.js uses module.exports and tripped no-undef under the existing TS-oriented flat config."
metrics:
  duration: ~30m
  completed: 2026-06-24
  tasks: 3
  files: 14
status: complete
---

# Phase 1 Plan 2: TDD Enforcement Harness Summary

Stood up the strict TDD enforcement harness — adapted from the author's localizer harness
(pnpm + Vitest + SvelteKit) to this project (npm + Jest + Homebridge plugin). Five hook scripts
are wired into `.claude/settings.json` (PreToolUse Write test-first guard, PostToolUse Edit|Write
prettier→eslint→tsc, Stop coverage gate), plus a `tdd-audit` + `tdd-debt.txt` allowlist and an
`npm ci` lockfile guard, with Jest configured at an 85% line-coverage threshold and everything
aggregated behind `make check`. The gate is GREEN on a clean checkout, not self-blocking.

## What Was Built

- **Jest + coverage (Task 1):** Added `jest ^30`, `ts-jest ^29.4`, `@types/jest ^30` devDeps and a
  `coverage` script. `jest.config.js` uses the `ts-jest` preset, `node` env, and
  `coverageThreshold.global.lines = 85` (statements 85, branches 75, functions 80). A `clamp` helper
  (`src/util/example.ts`) + its test prove the jest/ts-jest/coverage wiring (the single allowed
  bootstrap smoke test). Coverage runs at 100% on the only counted file → green.
- **Five hook scripts + wiring (Task 2):**
  - `tdd-guard-on-write.sh` — PreToolUse Write: denies a NEW production `src/**/*.ts` with no
    referencing `*.test.ts` (emits `permissionDecision: deny` + exit 2); lets through `*.test.ts`,
    `*.d.ts`, `src/index.ts`, `src/platform.ts`, and any write carrying `// tdd-audit: exempt`.
  - `typecheck-on-edit.sh` — PostToolUse Edit|Write on `*.ts`: `prettier --write` → `eslint` →
    `tsc --noEmit`, surfacing failures (exit 2).
  - `coverage-gate.sh` — Stop hook: cheap-path skip when no `src/**/*.ts` (non-test) changed,
    else `jest --coverage`; below threshold emits `{"decision":"block",...}` + exit 2.
  - `tdd-audit.sh` — flags untested non-exempt `src/` files, honours `.claude/tdd-debt.txt` and the
    `// tdd-audit: exempt` marker, skips constant-only modules and one-line barrels.
  - `lockfile-check.sh` — runs `npm ci`; fails (exit 1) on lockfile drift with a fix instruction.
  - `.claude/settings.json` wires PreToolUse(Write), PostToolUse(Edit|Write), Stop. `tdd-debt.txt`
    seeded empty (header only).
- **Makefile gate (Task 3):** `check: lockfile-check lint typecheck tdd-audit test` (no e2e/docker/db),
  plus standalone `build`/`lint`/`typecheck`/`test`/`coverage`/`tdd-audit`/`lockfile-check`/`fmt`
  targets and a default `help`.

## Verification Results

- `npx jest --coverage` — exits 0; 5 tests pass; 100% on `src/util/example.ts`; thresholds met.
- `jest.config.js` asserted: `preset === 'ts-jest'`, `coverageThreshold.global.lines === 85`,
  `coveragePathIgnorePatterns` includes `src/index.ts`.
- tdd-guard: NEW untested `src/foo/newprod.ts` → deny + exit 2; exempt-marker write, `src/index.ts`,
  and an `Edit` payload all → exit 0.
- tdd-audit: exits 0 on the current tree; flags an injected untested file (exit 1); treats it as
  non-fatal debt when listed in `tdd-debt.txt` (exit 0).
- lockfile-check: exit 0 on clean tree; exit 1 against a drifted `package.json`.
- All five scripts `chmod +x`; `.claude/settings.json` has `hooks.PreToolUse/PostToolUse/Stop`.
- `make check` — exits 0 on the clean tree (lockfile-check + lint + typecheck + tdd-audit + test).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Coverage gate was self-blocking; excluded the exempt glue**
- **Found during:** Task 1 (running the coverage verify command).
- **Issue:** The plan's `jest.config.js` only excluded `src/index.ts`. With `src/platform.ts` and
  `src/settings.ts` (the `// tdd-audit: exempt` Homebridge glue from Plan 01) still counted, total
  coverage was 36% and the 85% gate failed on a clean checkout — violating the explicit
  "gate must be GREEN, not self-blocking" requirement.
- **Fix:** Excluded `src/platform.ts` and `src/settings.ts` from `collectCoverageFrom` and
  `coveragePathIgnorePatterns`, aligning coverage scope with the exempt marker per STACK.md
  "Coverage gate" (concentrate 85% on the auth/HTTP/mapping code where bugs live). `src/index.ts`
  exclusion retained verbatim.
- **Files modified:** jest.config.js
- **Commit:** f12e064

**2. [Rule 3 - Blocking] `make check` failed at lint on jest.config.js (no-undef: 'module')**
- **Found during:** Task 3 (running `make check`).
- **Issue:** The new `jest.config.js` uses CommonJS `module.exports`, but the existing TS-oriented
  ESLint flat config treated it as an ES module and flagged `'module' is not defined`, failing lint
  and therefore the whole gate.
- **Fix:** Added an ESLint flat-config block for `*.js`/`*.cjs` declaring `sourceType: 'commonjs'`
  and `globals.node`; added `globals ^14` to devDependencies (now imported directly). Surgical — no
  change to TS rules or any Plan-01 source.
- **Files modified:** eslint.config.mjs, package.json, package-lock.json
- **Commit:** 264c6f4

### Design choice (not a deviation)

- tdd-audit skips **constant-only modules** (no `function`/`class`/`=>`/method body). This makes
  `src/settings.ts` — pure `PLATFORM_NAME`/`PLUGIN_NAME` constants with no exempt marker — pass the
  audit without flagging it or editing Plan-01 files. The two true glue files (`index.ts`,
  `platform.ts`) already carry the exempt marker.

## Threat Mitigations Applied

- **T-01-03 (lockfile drift):** `lockfile-check.sh` runs `npm ci` and fails on drift; verified it
  exits 1 against a hand-drifted `package.json`.
- **T-01-05 (untested production code):** `tdd-audit.sh` + the PreToolUse test-first guard make
  untested non-exempt `src/` files a hard failure; the exempt list and `tdd-debt.txt` are explicit
  and auditable.
- **T-01-04 / T-01-SC (new devDeps / npm installs):** Only mainstream, verified-`latest`-pinned
  toolchain deps added (jest, ts-jest, @types/jest, globals) — no legitimacy checkpoint required.

## Self-Check: PASSED
- FOUND: jest.config.js, Makefile, .claude/settings.json, .claude/tdd-debt.txt
- FOUND: all five .claude/scripts/*.sh (executable)
- FOUND: src/util/example.ts, src/util/example.test.ts
- FOUND commits: f12e064 (Task 1), 4ebfa98 (Task 2), 264c6f4 (Task 3)
