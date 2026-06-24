---
phase: 02-auth-protocol-port-credential-feasibility
plan: 02
subsystem: auth-transport
tags: [tuya, device-sharing, fetch, nock, refresh, tdd]
requires:
  - 02-01
provides:
  - signed-tuya-device-sharing-client
  - token-refresh-guard
  - redacted-auth-errors
affects:
  - package.json
  - package-lock.json
  - src/auth/
key-files:
  created:
    - src/auth/errors.ts
    - src/auth/customerApi.ts
    - src/auth/customerApi.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Added nock as a devDependency only; runtime transport uses global fetch."
  - "Kept request id, clock, nonce, and fetch injectable so signed transport tests remain deterministic and offline."
  - "Redacts known current access/refresh token values in addition to key-based redaction."
metrics:
  completed: 2026-06-24
  tasks: 3
  files: 5
status: complete
---

# Phase 2 Plan 2: Signed Transport and Refresh Summary

Built the signed Tuya device-sharing HTTP client on top of the Phase 2 crypto helpers. The client
encrypts query/body payloads into `encdata`, signs the required `X-*` headers, decrypts successful
results, maps Tuya failures into typed errors, and refreshes tokens proactively with a single
in-flight refresh promise.

## What Was Built

- `nock` added as a devDependency for offline HTTP tests.
- `src/auth/errors.ts` defines typed auth errors and redaction helpers.
- `src/auth/customerApi.ts` implements `TuyaDeviceSharingClient` with `get`, `post`, `put`, and
  `delete`, signed request construction, response decryption, proactive refresh, token update
  callback, and re-auth-required handling.
- `src/auth/customerApi.test.ts` covers signed encrypted requests, success decrypt, Tuya API errors,
  redaction, proactive refresh, shared in-flight refresh, and refresh failure.

## TDD Evidence

- Dependency commit: `cce10a7 chore(02-02): add nock test dependency`
- RED commit: `9e4fa24 test(02-02): add customer API transport tests`
  - Targeted suite failed because `src/auth/customerApi.ts` and `src/auth/errors.ts` did not exist.
- GREEN commit: `717b077 feat(02-02): add signed Tuya auth client`
  - Implemented the client and typed errors.

## Verification Results

- `npm test -- --runTestsByPath src/auth/customerApi.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm test -- --runInBand` — passed, 3 suites / 16 tests.

## Deviations from Plan

**[Rule 3 - Blocking] Added raw-token redaction for API messages**
- **Found during:** Customer API redaction test.
- **Issue:** Key-based redaction masked `encdata`, but a Tuya API message could still echo a raw
  current access token as free text.
- **Fix:** `TuyaApiError` now accepts known sensitive values, and `customerApi.ts` passes the current
  access/refresh token when mapping API errors.
- **Files modified:** `src/auth/errors.ts`, `src/auth/customerApi.ts`.
- **Verification:** Customer API redaction test passes.

**Total deviations:** 1 auto-fixed. **Impact:** Positive; error redaction is stricter than the
minimum test originally implied.

## Self-Check: PASSED

- FOUND: `src/auth/errors.ts`, `src/auth/customerApi.ts`, `src/auth/customerApi.test.ts`.
- Runtime dependencies remain absent; `nock` is dev-only.
- No `axios`, `crypto-js`, `@tuya/tuya-connector-nodejs`, or Home Assistant credential strings were introduced.

