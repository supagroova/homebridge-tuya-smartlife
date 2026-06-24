---
phase: 02-auth-protocol-port-credential-feasibility
status: planned
date: 2026-06-24
---

# Phase 2 Pattern Map

## Existing Local Patterns

- `src/util/example.ts` + `src/util/example.test.ts`: confirms Jest + ts-jest test placement and import style. Use this as the minimal pattern for new pure modules, then replace the example utility later when real auth coverage exists.
- `jest.config.js`: auth modules under `src/auth/` are covered by the global thresholds. Do not add coverage exclusions for crypto, token, QR, or HTTP client code.
- `Makefile`: `make check` is the local and CI gate. Phase 2 execution plans should use it as the final verification command.
- `.codex/scripts/tdd-audit.sh` and `.codex/tdd-debt.txt`: new non-exempt production files under `src/` need corresponding tests before implementation. Only thin glue scripts outside `src/` can be exempted.
- `package.json`: build remains plain `tsc` to CommonJS. Add only Phase 2 dependencies that the plans prove are needed.

## Planned Module Boundaries

- `src/auth/crypto.ts`: pure cryptographic helpers. Closest local pattern is `src/util/example.ts`, but tests must be golden-vector based rather than smoke tests.
- `src/auth/customerApi.ts`: signed HTTP transport over global `fetch`. No existing local analog; keep constructor-injected endpoint/token/clock/fetch hooks so tests stay deterministic.
- `src/auth/tokenStore.ts`: persistence abstraction. Use a file-backed implementation for Phase 2 and keep the interface narrow enough for later Homebridge storage.
- `src/auth/qrLoginFlow.ts`: QR-login orchestration using the signed client. Keep it UI-free; Phase 7 owns friendly config UI.
- `scripts/qr-login.mjs`: dev-only manual probe that imports the built package from `dist/`. It should not be part of `tsconfig` output or Homebridge runtime.
- `docs/credential-feasibility.md`: decision artifact. It is allowed to contain private contact status while local, but package output must not include it.

## Constraints To Preserve

- No `axios`, `crypto-js`, `@tuya/tuya-connector-nodejs`, bundler, direct `hap-nodejs` dependency, or runtime Home Assistant credential.
- Network/live Tuya checks are manual only. `make check` stays offline and deterministic.
- Test fixtures must use dummy data and deterministic nonces/times. Never commit real token material.

