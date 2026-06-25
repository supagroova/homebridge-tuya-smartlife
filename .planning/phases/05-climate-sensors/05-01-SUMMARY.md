---
phase: 05-climate-sensors
plan: 01
subsystem: sensor-mappers
tags: [mappers, sensors, battery, tdd]
requires:
  - tuya-integer-scaling
provides:
  - read-only-sensor-mapper
  - battery-mapping-helper
affects:
  - src/mappers/
key-files:
  created:
    - src/mappers/sensor.ts
    - src/mappers/sensor.test.ts
  modified: []
decisions:
  - "Sensor mapping is pure and has no Homebridge imports."
  - "Temperature and humidity mappings require valid Tuya integer specs."
  - "Binary sensor on-values are category-specific."
  - "Battery mapping is reusable and optional."
metrics:
  completed: 2026-06-25
  tasks: 2
  files: 2
status: complete
---

# Phase 5 Plan 1: Read-Only Sensor Mapper Summary

Implemented pure mapper support for read-only sensors and battery metadata. The mapper handles
`wsdcg` temperature/humidity scaling, `mcs` contact, `pir` motion, `sj` leak, `ywbj` smoke, and
optional battery level/low-battery descriptors.

## TDD Evidence

- RED commit: `5852fd2 test(05-01): add sensor mapper tests`
  - Targeted suite failed because `src/mappers/sensor.ts` did not exist.
- GREEN commit: `cb0881c feat(05-01): add read-only sensor mapper`
  - Implemented `src/mappers/sensor.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/mappers/sensor.test.ts src/mappers/scaling.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `rg -n "homebridge|hap-nodejs" src/mappers/sensor.ts` — no matches.
- `make check` — passed; 13 suites / 70 tests.

## Deviations from Plan

**[Rule 1 - Bug] Missing spec guard**
- **Found during:** Targeted test run after implementation.
- **Issue:** The mapper called `parseIntegerSpec` with `undefined` when a DP's status range was absent.
- **Fix:** Guarded absent specs and skipped scaled mappings without valid specs.
- **Verification:** Targeted tests, typecheck, lint, no-import scan, and `make check` pass.

**Total deviations:** 1 auto-fixed. **Impact:** Positive; missing Tuya specs now fail closed instead of throwing.

## Self-Check: PASSED

- FOUND: `src/mappers/sensor.ts` and `src/mappers/sensor.test.ts`.
- Mapper has no Homebridge/HAP imports.
- Temperature/humidity, binary sensors, and battery descriptors are covered by tests.
