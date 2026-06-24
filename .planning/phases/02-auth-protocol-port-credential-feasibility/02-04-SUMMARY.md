---
phase: 02-auth-protocol-port-credential-feasibility
plan: 04
subsystem: auth-probe-credential-feasibility
tags: [tuya, qr-login, credential-feasibility, distribution]
requires:
  - 02-01
  - 02-02
  - 02-03
provides:
  - dev-qr-login-probe
  - credential-feasibility-artifact
affects:
  - package.json
  - scripts/
  - docs/
key-files:
  created:
    - scripts/qr-login.mjs
    - docs/credential-feasibility.md
  modified:
    - package.json
    - eslint.config.mjs
decisions:
  - "No production QR credential is available yet; Phase 3 is blocked rather than silently selecting the developer-project fallback."
  - "The dev probe requires all credential values through runtime flags and imports compiled dist modules."
  - "Docs and scripts are excluded from npm package output by the existing package files allowlist."
metrics:
  completed: 2026-06-24
  tasks: 4
  files: 4
status: complete-with-blocker
---

# Phase 2 Plan 4: Dev QR Probe and Credential Feasibility Summary

Added an opt-in local QR login probe and recorded the credential feasibility decision. The protocol
implementation is ready for a legitimate credential, but no project-owned Tuya `client_id`/`schema`
has been issued or recorded, so Phase 3 is blocked until the credential path changes or the owner
accepts the auth-only developer-project fallback.

## What Was Built

- `scripts/qr-login.mjs` is a dev-only probe that imports compiled `dist/` auth modules, prints the
  Smart Life QR URL, polls login result, and persists tokens through `FileTokenStore`.
- `package.json` adds `auth:qr-login` as an opt-in script: `npm run build && node scripts/qr-login.mjs`.
- `docs/credential-feasibility.md` records the evidence and current decision:
  `selected_path: blocked-pending-credential`.
- `eslint.config.mjs` now treats `.mjs` utility scripts as Node files.

## Verification Results

- `npm run build && node scripts/qr-login.mjs --help` — passed; help exits without network access.
- `make check` — passed; `tdd-audit` audited 8 production files with 0 legacy gaps.
- `! rg -n "HA_3y9q4ak7g4ephrvke|haauthorize" src config.schema.json package.json` — passed.
- `npm pack --dry-run` — passed using a temp npm cache; package contains only `dist/`,
  `config.schema.json`, and `package.json`.

## Deviations from Plan

**[Rule 3 - Blocking] Fixed ESLint coverage for `.mjs` scripts**
- **Found during:** Plan-level `make check`.
- **Issue:** ESLint did not apply Node globals to `scripts/qr-login.mjs`, so `console` and `process`
  were flagged as undefined.
- **Fix:** Added `scripts/*.mjs` to the Node config block and renamed the local `require` binding to
  avoid `no-redeclare`.
- **Files modified:** `eslint.config.mjs`, `scripts/qr-login.mjs`.
- **Verification:** `npm run lint` and `make check` pass.

**[Rule 4 - Scope Boundary] Credential path remains externally blocked**
- **Found during:** Credential feasibility documentation.
- **Issue:** The workspace has no legitimate plugin-owned Tuya `client_id`/`schema`, and selecting
  the developer-project fallback would materially change the product promise.
- **Resolution:** Recorded `selected_path: blocked-pending-credential` and blocked Phase 3 until the
  owner either obtains a legitimate QR credential path or explicitly accepts the fallback.
- **Files modified:** `docs/credential-feasibility.md`, `.planning/STATE.md`.

**Total deviations:** 1 auto-fixed, 1 documented blocker. **Impact:** Phase 2 code is complete, but
real device discovery cannot start safely until the credential decision is resolved.

## Self-Check: PASSED

- FOUND: `scripts/qr-login.mjs`.
- FOUND: `docs/credential-feasibility.md`.
- No Home Assistant credential strings in shipping paths.
- npm package output excludes docs, scripts, token files, and probe output.

