---
phase: 02-auth-protocol-port-credential-feasibility
plan: 03
subsystem: auth-token-qr
tags: [tuya, qr-login, token-store, tdd]
requires:
  - 02-01
  - 02-02
provides:
  - file-token-store
  - ui-free-qr-login-flow
affects:
  - .gitignore
  - src/auth/
key-files:
  created:
    - src/auth/tokenStore.ts
    - src/auth/tokenStore.test.ts
    - src/auth/qrLoginFlow.ts
    - src/auth/qrLoginFlow.test.ts
  modified:
    - .gitignore
decisions:
  - "FileTokenStore returns null for missing/corrupt token files so callers can surface re-auth instead of crashing."
  - "QR login flow stays UI-free; Phase 7 can reuse it for config UI without pulling UI work into Phase 2."
  - "QR login credentials are injected; no Home Assistant credential is hard-coded."
metrics:
  completed: 2026-06-24
  tasks: 4
  files: 5
status: complete
---

# Phase 2 Plan 3: Token Store and QR Flow Summary

Built the persistence and QR-login flow modules needed to prove Smart Life user-code + QR auth
without implementing the final Homebridge config UI.

## What Was Built

- `src/auth/tokenStore.ts` defines `TokenStore` and implements `FileTokenStore` with save/load,
  parent-directory creation, temp-file then rename writes, and null-on-missing/corrupt read behavior.
- `.gitignore` now excludes local token/probe output patterns.
- `src/auth/qrLoginFlow.ts` implements a UI-free QR login coordinator:
  - creates QR tokens via the Tuya login endpoint,
  - returns `tuyaSmart--qrLogin?token=<token>`,
  - polls login result states,
  - maps successful snake_case token responses into `PersistedTokenInfo`,
  - persists successful tokens through `TokenStore`.
- Tests cover persistence, restart-like reload, corrupt files, QR URL creation, pending/expired/failed
  states, success persistence, and HTTP failure behavior.

## TDD Evidence

- RED commit: `01bf5a6 test(02-03): add token store persistence tests`
- GREEN commit: `5c9af83 feat(02-03): add file token store`
- RED commit: `839939e test(02-03): add QR login flow tests`
- GREEN commit: `a4d70c9 feat(02-03): add QR login flow`

## Verification Results

- `npm test -- --runTestsByPath src/auth/tokenStore.test.ts src/auth/qrLoginFlow.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm test -- --runInBand` — passed, 5 suites / 26 tests.
- `make check` — passed; `tdd-audit` audited 8 production files with 0 legacy gaps.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/auth/tokenStore.ts`, `src/auth/tokenStore.test.ts`, `src/auth/qrLoginFlow.ts`, `src/auth/qrLoginFlow.test.ts`.
- FOUND: `.gitignore` token/probe output patterns.
- No custom Homebridge config UI files were created.
- No Home Assistant credential strings were introduced.

