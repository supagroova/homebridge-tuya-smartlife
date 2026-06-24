---
phase: 01-project-scaffolding-tdd-gates
plan: 01
subsystem: scaffolding
tags: [homebridge, typescript, toolchain, dynamic-platform]
requires: []
provides:
  - homebridge-plugin-skeleton
  - tsc-build
  - eslint-prettier-toolchain
  - committed-lockfile
  - config-schema
affects:
  - package.json
  - tsconfig.json
  - src/
tech-stack:
  added:
    - typescript ~5.9
    - eslint ^9 (flat config)
    - typescript-eslint ^8
    - prettier ^3.8
    - eslint-config-prettier ^10
    - rimraf ^6
    - homebridge ^2 (peer + dev)
    - "@types/node ^22"
  patterns:
    - "Homebridge dynamic platform: api.registerPlatform(PLATFORM_NAME, Platform)"
    - "HAP accessed via api.hap, never hap-nodejs directly"
    - "tsc-only build (no bundler), CommonJS output to dist/"
key-files:
  created:
    - package.json
    - package-lock.json
    - tsconfig.json
    - eslint.config.mjs
    - .prettierrc.json
    - .prettierignore
    - .gitignore
    - config.schema.json
    - src/settings.ts
    - src/platform.ts
    - src/index.ts
  modified: []
decisions:
  - "Added @eslint/js as a devDependency: eslint.config.mjs uses eslint.configs.recommended, which ESLint 9 ships in the separate @eslint/js package."
  - "Added .prettierignore (not in plan file list) so the plan's `prettier --check .` verify command scopes to project source, excluding .planning/, .claude/, .github/, dist/, and the lockfile."
  - "Extensionless relative imports (./settings, ./platform) to match tsconfig module CommonJS + moduleResolution Node."
  - "Pinned @types/node to ^22 to match the Node 22 dev/min engine (STACK.md lists @types/node@26 as latest but 22 matches the runtime)."
metrics:
  duration: ~4m
  completed: 2026-06-24
  tasks: 2
  files: 11
status: complete
---

# Phase 1 Plan 1: Project Scaffolding Toolchain Summary

Scaffolded the repository as a conventionally-shaped TypeScript Homebridge dynamic-platform
plugin: a Homebridge-correct `package.json` (engines `^22 || ^24`, `homebridge ^2` peerDependency,
`homebridge-plugin` keyword, no runtime deps), a committed `package-lock.json`, a `tsc`-only build
to `dist/`, the stripped dynamic-platform skeleton (`index.ts` / `platform.ts` / `settings.ts`),
the config-UI schema, and an ESLint 9 + Prettier toolchain — all clean, building, and installable
via `npm ci`.

## What Was Built

- **Toolchain & manifest (Task 1):** `package.json` with the mandatory `homebridge-plugin` keyword,
  `homebridge-*` name, `engines.node "^22 || ^24"`, `homebridge "^2.0.0"` as a peerDependency, no
  runtime `dependencies`, and scripts `build`/`lint`/`test`/`prepublishOnly`. `tsconfig.json`
  compiles `src/ -> dist/` (CommonJS, ES2022, strict, declaration). `eslint.config.mjs` is an
  ESLint 9 flat config layering typescript-eslint recommended + `eslint-config-prettier` last.
  `.prettierrc.json`, `.gitignore`, and a committed `package-lock.json` round it out.
- **Dynamic-platform skeleton (Task 2):** `src/settings.ts` exports `PLATFORM_NAME = "TuyaSmartLife"`
  and `PLUGIN_NAME = "homebridge-tuya-smartlife"`. `src/platform.ts` is `TuyaSmartLifePlatform`
  implementing `DynamicPlatformPlugin` (accessory cache + `configureAccessory` + a no-op
  `didFinishLaunching` placeholder for Phase 3 discovery), accessing HAP via `this.api.hap`.
  `src/index.ts` default-exports the `api.registerPlatform(PLATFORM_NAME, TuyaSmartLifePlatform)`
  entry. Both glue files carry `// tdd-audit: exempt`. `config.schema.json` declares
  `pluginAlias "TuyaSmartLife"`, `pluginType "platform"`, `singular true`.

## Verification Results

- `npm ci` — exits 0 against the committed lockfile (0 vulnerabilities).
- `npm run build` — exits 0; emits `dist/index.js` (contains `registerPlatform`) and `dist/platform.js`.
- `eslint .` — exits 0.
- `prettier --check .` — exits 0 (project source clean).
- `grep -r "hap-nodejs" src/` — no matches (HAP via `api.hap` only).
- `config.schema.json` — valid JSON, `pluginType "platform"`, `pluginAlias "TuyaSmartLife"`.
- package.json invariants asserted via node: `homebridge-plugin` keyword present, `peerDependencies.homebridge === "^2.0.0"`, `engines.node === "^22 || ^24"`, no `dependencies` key.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `@eslint/js` devDependency**
- **Found during:** Task 1 (writing eslint.config.mjs)
- **Issue:** `eslint.config.mjs` references `eslint.configs.recommended`, which ESLint 9 ships in the standalone `@eslint/js` package rather than the `eslint` core package. Without it the flat config would fail to resolve.
- **Fix:** Added `@eslint/js: ^9` to devDependencies.
- **Files modified:** package.json
- **Commit:** e9adc12

**2. [Rule 3 - Blocking] Added `.prettierignore`**
- **Found during:** Task 2 (running the plan's `prettier --check .` verify command)
- **Issue:** `prettier --check .` scanned the whole repo and flagged pre-existing out-of-scope content (`.planning/` markdown + research cache, `.claude/CLAUDE.md`), which would make the plan's verify command fail.
- **Fix:** Added `.prettierignore` excluding `node_modules/`, `dist/`, `coverage/`, `.planning/`, `.omc/`, `.claude/`, `.github/`, and `package-lock.json`. Surgical — does not reformat any pre-existing files.
- **Files modified:** .prettierignore (new)
- **Commit:** f933d76

## Out-of-Scope Notes

- Untracked `.omc/` directories exist at repo root and under the phase dir (not created by this plan). Left untouched per surgical-change rules; not committed.
- `jest`/`@types/jest`/`ts-jest`/`nock` are intentionally NOT installed here — the `test` script entry is declared, but the jest config and test deps land in Plan 02 (TDD harness).

## Self-Check: PASSED
- FOUND: package.json, package-lock.json, tsconfig.json, eslint.config.mjs, .prettierrc.json, .prettierignore, .gitignore, config.schema.json
- FOUND: src/settings.ts, src/platform.ts, src/index.ts
- FOUND: dist/index.js, dist/platform.js (build output)
- FOUND commit e9adc12 (Task 1), f933d76 (Task 2)
