---
phase: 03-device-discovery-platform-skeleton
plan: 03
subsystem: platform-startup
tags: [homebridge, discovery, orchestration, tdd]
requires:
  - tuya-device-discovery-repository
  - homebridge-accessory-registry
provides:
  - platform-discovery-orchestration
  - homebridge-startup-discovery-hook
affects:
  - src/platformDiscovery.ts
  - src/platform.ts
  - src/settings.ts
key-files:
  created:
    - src/platformDiscovery.ts
    - src/platformDiscovery.test.ts
  modified:
    - src/platform.ts
    - src/settings.ts
    - src/platform/accessoryRegistry.ts
decisions:
  - "Discovery orchestration is a pure injectable module; Homebridge platform code remains thin glue."
  - "Missing tokens and re-auth failures skip registry reconciliation, so cached accessories are not pruned during auth failure."
  - "Whitelist config remains deferred; no Phase 3 config schema fields were added."
metrics:
  completed: 2026-06-24
  tasks: 3
  files: 5
status: complete
---

# Phase 3 Plan 3: Platform Discovery Startup Summary

Wired discovery into the Homebridge `didFinishLaunching` lifecycle. The platform now loads the
persisted token from Homebridge storage, creates the signed Tuya client, discovers homes/devices,
and reconciles Homebridge accessories through the registry from Plan 03-02.

## TDD Evidence

- RED commit: `c537fed test(03-03): add platform discovery orchestration tests`
  - Targeted suite failed because `src/platformDiscovery.ts` did not exist.
- GREEN commit: `c552e92 feat(03-03): add platform discovery orchestration`
  - Implemented `src/platformDiscovery.ts` and exported the registry accessory type needed by the orchestration result.
- GREEN commit: `8644ba1 feat(03-03): wire discovery into platform startup`
  - Connected the orchestration to `src/platform.ts` and added the client id/token filename settings.

## Verification Results

- `npm test -- --runTestsByPath src/platformDiscovery.test.ts src/platform/accessoryRegistry.test.ts --runInBand` — passed.
- `npm test -- --runInBand` — passed; 9 suites / 44 tests.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `rg -n "homeIds|deviceIds|whitelist" src config.schema.json` — no matches.
- `make check` — passed; 9 suites / 44 tests.

## Deviations from Plan

**[Type surface] Exported `RegistryAccessory`**
- **Found during:** Typecheck after orchestration implementation.
- **Issue:** `AccessoryReconcileResult<T>` is constrained by the registry's accessory shape, but that shape was private.
- **Fix:** Exported the `RegistryAccessory` type and constrained `runPlatformDiscovery` generics to it.
- **Verification:** Targeted tests, typecheck, lint, and `make check` pass.

**Total deviations:** 1 auto-fixed. **Impact:** Positive; the registry result type is now usable by orchestration without weakening type safety.

## Self-Check: PASSED

- FOUND: `src/platformDiscovery.ts`, `src/platformDiscovery.test.ts`, and platform startup wiring.
- Missing token and auth failures return `reauth-required` without registry reconciliation.
- Discovery failures return `failed` without registry reconciliation.
- No whitelist config fields were added in Phase 3.
