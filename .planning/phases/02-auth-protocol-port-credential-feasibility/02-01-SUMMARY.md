---
phase: 02-auth-protocol-port-credential-feasibility
plan: 01
subsystem: auth-crypto
tags: [tuya, device-sharing, crypto, signing, tdd]
requires: []
provides:
  - tuya-sharing-crypto-helpers
  - golden-vector-tests
affects:
  - src/auth/
  - test/fixtures/
key-files:
  created:
    - src/auth/types.ts
    - src/auth/crypto.ts
    - src/auth/crypto.test.ts
    - test/fixtures/tuya-sharing-crypto-vectors.json
  modified: []
decisions:
  - "Generated dummy deterministic crypto vectors with Node WebCrypto because Python cryptography is not installed locally; production implementation uses node:crypto."
  - "Kept nonce injection as an explicit optional test hook on encryptAesGcm; runtime calls use SDK-style random nonce generation."
metrics:
  completed: 2026-06-24
  tasks: 3
  files: 4
status: complete
---

# Phase 2 Plan 1: Crypto Golden-Vector Port Summary

Ported the Tuya device-sharing cryptographic helpers and locked them with deterministic tests before
any network or QR-login work.

## What Was Built

- `src/auth/types.ts` defines shared auth/token transport types used by this and later auth plans.
- `src/auth/crypto.ts` implements compact JSON serialization, `md5HashKey`, SDK-compatible
  `generateSecret`, AES-GCM `encdata` encrypt/decrypt, and fixed-order `restfulSign`.
- `src/auth/crypto.test.ts` verifies the helpers against dummy golden vectors, including empty and
  non-empty `sid` secret generation, SDK wire encoding, header-order signing, and omission of empty
  header values.
- `test/fixtures/tuya-sharing-crypto-vectors.json` contains only dummy deterministic values.

## TDD Evidence

- RED commit: `cea6d23 test(02-01): add crypto golden vectors`
  - `npm test -- --runTestsByPath src/auth/crypto.test.ts --runInBand` failed because
    `src/auth/crypto.ts` and `src/auth/types.ts` did not exist.
- GREEN commit: `79f71ed feat(02-01): port Tuya sharing crypto`
  - Implemented the minimal helpers required for the tests.

## Verification Results

- `npm test -- --runTestsByPath src/auth/crypto.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.

## Deviations from Plan

**[Rule 3 - Blocking] Generated fixture with Node WebCrypto instead of Python SDK helper execution**
- **Found during:** Task 1.
- **Issue:** The local Python environment does not have `cryptography` installed, so the SDK helper
  code could not be executed directly without adding Python dependencies outside the Node project.
- **Fix:** Generated dummy deterministic values with Node WebCrypto and HMAC helpers while reviewing
  the current Tuya SDK source. The production implementation uses separate `node:crypto` APIs.
- **Files modified:** `test/fixtures/tuya-sharing-crypto-vectors.json`.
- **Verification:** Golden-vector tests pass and fixture contains no live token/user material.

**Total deviations:** 1 auto-fixed. **Impact:** Low; the fixture remains deterministic and dummy-only.

## Self-Check: PASSED

- FOUND: `src/auth/types.ts`, `src/auth/crypto.ts`, `src/auth/crypto.test.ts`.
- FOUND: `test/fixtures/tuya-sharing-crypto-vectors.json`.
- No Home Assistant credential strings were introduced.

