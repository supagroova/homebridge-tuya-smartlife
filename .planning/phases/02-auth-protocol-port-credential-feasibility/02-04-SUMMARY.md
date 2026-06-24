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
  - "Owner approved using the Tuya-published HA-compatible QR values for development rather than selecting the developer-project fallback."
  - "The dev probe requires all credential values through runtime flags and imports compiled dist modules."
  - "Docs and scripts are excluded from npm package output by the existing package files allowlist."
metrics:
  completed: 2026-06-24
  tasks: 4
  files: 4
status: complete
---

# Phase 2 Plan 4: Dev QR Probe and Credential Feasibility Summary

Added an opt-in local QR login probe and recorded the credential feasibility decision. This summary
originally closed with Phase 3 blocked pending a credential decision. That block was superseded on
2026-06-24 when the owner approved using the Tuya-published HA-compatible QR values to get the
Homebridge port working.

## What Was Built

- `scripts/qr-login.mjs` is a dev-only probe that imports compiled `dist/` auth modules, prints the
  Smart Life QR URL, polls login result, and persists tokens through `FileTokenStore`.
- `package.json` adds `auth:qr-login` as an opt-in script: `npm run build && node scripts/qr-login.mjs`.
- `docs/credential-feasibility.md` records the evidence and current decision. Current live decision:
  `selected_path: device-sharing-qr-ha-compatible`.
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

**[Rule 4 - Scope Boundary] Credential path required owner decision**
- **Found during:** Credential feasibility documentation.
- **Issue:** The workspace had no plugin-owned Tuya `client_id`/`schema`, and selecting the
  developer-project fallback would materially change the product promise.
- **Resolution:** Initially recorded a block. Superseded on 2026-06-24 by the owner's decision to use
  the Tuya-published HA-compatible QR values for development and pursue Homebridge-specific
  credentials later.
- **Files modified:** `docs/credential-feasibility.md`, `.planning/STATE.md`.

**Total deviations:** 1 auto-fixed, 1 owner-decided scope issue. **Impact:** Phase 2 code is
complete, and Phase 3 may proceed using the HA-compatible QR path.

## Self-Check: PASSED

- FOUND: `scripts/qr-login.mjs`.
- FOUND: `docs/credential-feasibility.md`.
- No Home Assistant credential strings in shipping paths.
- npm package output excludes docs, scripts, token files, and probe output.
