---
phase: 05-climate-sensors
plan: 02
subsystem: sensor-accessories
tags: [homebridge, sensors, battery, tdd]
requires:
  - read-only-sensor-mapper
provides:
  - read-only-sensor-homekit-binding
  - read-only-sensor-supported-categories
affects:
  - src/accessories/
  - src/discovery/
key-files:
  created:
    - src/accessories/sensorAccessory.ts
    - src/accessories/sensorAccessory.test.ts
  modified:
    - src/discovery/supportedCategories.ts
    - src/discovery/supportedCategories.test.ts
decisions:
  - "Read-only sensor categories mcs, pir, sj, and ywbj are supported for registration."
  - "Sensor binder uses cached-only onGet handlers."
  - "Battery service binding is optional and created only when a supported sensor has battery mappings."
metrics:
  completed: 2026-06-25
  tasks: 4
  files: 4
status: complete
---

# Phase 5 Plan 2: Read-Only Sensor Accessory Summary

Added HomeKit binding for read-only sensors and enabled registration for the Phase 5 binary sensor
categories. The binder creates/reuses sensor services from mapper descriptors and wires cached-only
getters for sensor and battery characteristics.

## TDD Evidence

- RED commit: `6d7a4d2 test(05-02): add read-only sensor category tests`
  - Targeted suite failed for `mcs`, `pir`, `sj`, and `ywbj`.
- GREEN commit: `c4c2339 feat(05-02): support read-only sensor categories`
  - Added read-only sensor categories to `SUPPORTED_CATEGORIES`.
- RED commit: `66bb30f test(05-02): add sensor accessory binder tests`
  - Targeted suite failed because `src/accessories/sensorAccessory.ts` did not exist.
- GREEN commit: `b80ddce feat(05-02): add read-only sensor accessory binder`
  - Implemented `src/accessories/sensorAccessory.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/accessories/sensorAccessory.test.ts src/discovery/supportedCategories.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; 14 suites / 78 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/accessories/sensorAccessory.ts`.
- Category support includes `wsdcg`, `mcs`, `pir`, `sj`, and `ywbj`.
- Sensor `onGet` handlers are cached-only.
