---
phase: 06-status-polling-offline-handling-mvp-ship
plan: 03
subsystem: release-readiness
tags: [release, npm, homebridge, tdd]
requires:
  - status-poller
  - offline-aware-status-reader
provides:
  - release-check-script
  - npm-pack-readiness
affects:
  - package.json
  - scripts/
  - jest.config.js
key-files:
  created:
    - scripts/release-check.mjs
    - scripts/release-check.test.mjs
  modified:
    - package.json
    - jest.config.js
decisions:
  - "release:check validates Homebridge/npm metadata and dry-run pack contents without publishing."
  - "release-check uses an isolated npm cache for dry-run packing so a broken user npm cache does not block validation."
  - "Node's built-in test runner owns scripts/release-check.test.mjs; Jest is scoped to TypeScript tests."
  - "Actual npm publish was not run; PUB-01 remains pending until explicit release."
metrics:
  completed: 2026-06-26
  tasks: 3
  files: 4
status: publish-ready
---

# Phase 6 Plan 3: Release Readiness Summary

Implemented a local release-readiness gate for npm/Homebridge discovery. The new `release:check`
script validates package metadata, Homebridge config schema metadata, publish workflow provenance,
and `npm pack --dry-run` contents. The package now builds and packs with `dist/index.js` and
`config.schema.json` included.

## TDD Evidence

- RED commit: `4226883 test(06-03): add release check tests`
  - Node test failed because `scripts/release-check.mjs` did not exist.
- GREEN commit: `d9c852a feat(06-03): add release readiness check`
  - Implemented `scripts/release-check.mjs` and added `npm run release:check`.
- Gate-fix commit: `c231772 test(06-03): keep node tests out of jest`
  - Scoped Jest to `*.test.ts` after `make check` surfaced that Jest tried to parse the Node ESM test.

## Verification Results

- `node --test scripts/release-check.test.mjs` — passed; 5 tests.
- `make check` — passed; 19 Jest suites / 114 tests.
- `npm run build` — passed; `dist/index.js` exists.
- `npm run release:check` — passed.
- `NPM_CONFIG_CACHE=/private/tmp/homebridge-tuya-smartlife-npm-cache npm pack --dry-run --json` — passed; pack output includes `dist/index.js` and `config.schema.json`.

## Deviations from Plan

**[Plan correction] package-lock unchanged**
- **Plan said:** update `package-lock.json`.
- **Observed:** adding an npm script does not change npm lockfile content; `npm install --package-lock-only --ignore-scripts` reported up to date.
- **Impact:** None. No dependency graph changed.

**[Gate fix] Jest discovery narrowed**
- **Found during:** `make check`.
- **Issue:** Jest discovered `scripts/release-check.test.mjs` and attempted to parse it as CommonJS.
- **Fix:** Added `testMatch: ['**/*.test.ts']` to `jest.config.js`; Node's built-in runner remains responsible for the ESM release test.
- **Impact:** Positive. Test ownership is explicit.

**[Environment fix] isolated npm pack cache**
- **Found during:** `npm run release:check`.
- **Issue:** The local default npm cache contains root-owned files, making `npm pack --dry-run` fail with `EPERM`.
- **Fix:** `release-check.mjs` runs dry-run packing with an isolated temp cache unless `RELEASE_CHECK_NPM_CACHE` is provided.
- **Impact:** Positive. Release validation is reproducible without mutating or relying on the user's global npm cache.

**[External gate] npm publish not run**
- **Reason:** `npm publish` is irreversible and requires explicit release intent/auth. This plan proves publish readiness but does not perform the external release.
- **Impact:** `PUB-01` remains pending until the package is actually published.

## Self-Check: PASSED

- FOUND: `scripts/release-check.mjs` and `scripts/release-check.test.mjs`.
- `package.json` includes `release:check`.
- Dry-run pack contains `dist/index.js` and `config.schema.json`.
- Actual publish remains a deliberate manual gate.
