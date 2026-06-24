---
phase: 02-auth-protocol-port-credential-feasibility
status: planned
date: 2026-06-24
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]
---

# Phase 2 Validation Strategy

## Validation Dimensions

1. **Crypto parity**: deterministic Jest fixtures prove the TypeScript port matches the Python SDK for `generateSecret`, AES-GCM `encdata`, decrypt, and `X-sign`.
2. **Signed transport**: mocked HTTP tests prove requests use the expected encrypted query/body shape, signed headers, response decryption, and typed Tuya error handling.
3. **Token lifecycle**: tests prove tokens persist, refresh proactively before expiry, and share one in-flight refresh under concurrent calls.
4. **QR auth behavior**: mocked QR tests prove user-code QR creation, QR URL formatting, polling states, success persistence, and expiry/failure handling.
5. **Credential safety**: source/package scans prove Home Assistant credentials and real tokens are not present in shipping paths.
6. **Credential decision**: `docs/credential-feasibility.md` records either a legitimate plugin-owned QR credential route or the auth-only fallback before Phase 3 starts.
7. **Manual live probe isolation**: any live Tuya QR probe is opt-in, excluded from CI, and never required for `make check`.

## Required Evidence

- `npm test -- --coverage` passes with auth modules included in coverage.
- `make check` passes.
- `npm pack --dry-run` output excludes local token files and probe output.
- `rg -n "HA_3y9q4ak7g4ephrvke|haauthorize" src config.schema.json package.json` returns no shipping-path matches. Apply the same scan to `README.md` once it exists.
- `docs/credential-feasibility.md` contains a decision section before Phase 3 planning or execution.
- Test fixtures contain only dummy values; no live Smart Life user code, access token, refresh token, QR token, terminal ID, or signed live payload is committed.

## Manual Validation

The live Smart Life QR probe is a manual Phase 2 check only. It may use temporary credentials supplied through local environment variables or CLI flags, but it must not be wired into CI, Homebridge startup, package defaults, README user setup, or production config.
