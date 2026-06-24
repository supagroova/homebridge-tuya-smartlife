---
phase: 03-device-discovery-platform-skeleton
status: planned
date: 2026-06-24
---

# Phase 3 Pattern Map

## Existing Local Patterns

- `src/auth/customerApi.ts`: injected dependencies and deterministic tests. Discovery should follow
  this style: inject the signed client and keep network behavior mockable.
- `src/auth/*.test.ts`: use explicit fixtures and no live network calls. Phase 3 tests should mock
  `TuyaDeviceSharingClient.get` or use narrow fake clients.
- `src/platform.ts`: Homebridge dynamic-platform adapter. Keep it as a composition root and avoid
  burying discovery logic inside Homebridge callbacks.
- `jest.config.js`: new discovery/registry modules under `src/` are covered by global thresholds.
- `.codex/scripts/tdd-audit.sh`: new production files under `src/` require tests first unless they
  are thin Homebridge glue with `// tdd-audit: exempt`.

## Planned Module Patterns

- `src/discovery/*`: pure TypeScript models/repository. No Homebridge imports.
- `src/platform/accessoryRegistry.ts`: small adapter around Homebridge API. Tests can use minimal API
  mocks for UUID, register, and unregister calls.
- `src/platform.ts`: composition and logging. Keep direct changes surgical.

## Constraints To Preserve

- No whitelist config in Phase 3.
- No HomeKit service/characteristic mapping for switches or thermometers yet.
- No placeholder accessories for unsupported categories.
- No live network in tests or `make check`.

