---
phase: 03-device-discovery-platform-skeleton
plan: 02
subsystem: accessory-registry
tags: [homebridge, accessories, lifecycle, tdd]
requires:
  - tuya-device-discovery-repository
provides:
  - supported-category-predicate
  - homebridge-accessory-registry
affects:
  - src/discovery/
  - src/platform/
key-files:
  created:
    - src/discovery/supportedCategories.ts
    - src/discovery/supportedCategories.test.ts
    - src/platform/accessoryRegistry.ts
    - src/platform/accessoryRegistry.test.ts
  modified: []
decisions:
  - "Phase 3 registers skeleton accessories only for v1/imminent categories: switches/outlets and temperature/humidity sensors."
  - "Unsupported discovered categories are returned for diagnostics but are not registered as placeholder HomeKit accessories."
  - "Cached accessories whose Tuya device id disappears from discovery are pruned automatically."
metrics:
  completed: 2026-06-24
  tasks: 4
  files: 4
status: complete
---

# Phase 3 Plan 2: Accessory Registry Summary

Implemented the supported-category predicate and a testable Homebridge accessory registry. The registry
creates stable UUIDs from Tuya device ids, restores cached accessories by `context.tuyaDeviceId`,
updates Tuya metadata on each reconcile, skips unsupported categories, and unregisters cached
accessories that are no longer present in discovery.

## TDD Evidence

- RED commit: `1e8e45f test(03-02): add supported category tests`
  - Targeted suite failed because `src/discovery/supportedCategories.ts` did not exist.
- GREEN commit: `b76956b feat(03-02): add supported category predicate`
  - Implemented `src/discovery/supportedCategories.ts`.
- RED commit: `a5d7179 test(03-02): add accessory registry tests`
  - Targeted suite failed because `src/platform/accessoryRegistry.ts` did not exist.
- GREEN commit: `a06e9af feat(03-02): add accessory registry lifecycle`
  - Implemented `src/platform/accessoryRegistry.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/discovery/supportedCategories.test.ts src/platform/accessoryRegistry.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; 8 suites / 40 tests.

## Deviations from Plan

None.

## Self-Check: PASSED

- FOUND: `src/discovery/supportedCategories.ts`, `src/platform/accessoryRegistry.ts`, and their tests.
- Stable UUID input is `tuya-smartlife:{deviceId}`.
- Unsupported devices are tracked in the reconcile result and are not registered.
- Removed cached accessories are passed to `unregisterPlatformAccessories`.
