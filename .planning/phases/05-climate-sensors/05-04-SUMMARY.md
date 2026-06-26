---
phase: 05-climate-sensors
plan: 04
subsystem: thermostat-accessories
tags: [homebridge, thermostat, sensors, battery, tdd]
requires:
  - wk-thermostat-mapper
  - read-only-sensor-homekit-binding
provides:
  - thermostat-homekit-binding
  - phase-5-platform-composition
affects:
  - src/accessories/
  - src/discovery/
  - src/platform.ts
key-files:
  created:
    - src/accessories/thermostatAccessory.ts
    - src/accessories/thermostatAccessory.test.ts
  modified:
    - src/discovery/supportedCategories.ts
    - src/discovery/supportedCategories.test.ts
    - src/platform.ts
decisions:
  - "wk category is supported for registration."
  - "Thermostat binder creates/reuses one HomeKit Thermostat service with subtype thermostat."
  - "Thermostat onGet handlers rebuild from cached Tuya status and do not call the cloud."
  - "Target temperature and target mode setters send Tuya commands and update cached status only after success."
  - "Platform bind callback now invokes switch/outlet, sensor, and thermostat binders in order."
metrics:
  completed: 2026-06-26
  tasks: 4
  files: 5
status: complete
---

# Phase 5 Plan 4: Thermostat Binding Summary

Added HomeKit binding for `wk` thermostat devices and completed Phase 5 platform composition. The
binder exposes current/target temperature, current/target heating-cooling state, Celsius display
units, target temperature writes, target mode writes, and optional battery characteristics.

## TDD Evidence

- RED commit: `26076b2 test(05-04): add thermostat category test`
  - Targeted suite failed because `wk` was not in `SUPPORTED_CATEGORIES`.
- GREEN commit: `38019ea feat(05-04): support thermostat category`
  - Added `wk` to supported categories.
- RED commit: `2b3fcf5 test(05-04): add thermostat accessory tests`
  - Targeted suite failed because `src/accessories/thermostatAccessory.ts` did not exist.
- GREEN commit: `f9564b4 feat(05-04): bind thermostat accessories`
  - Implemented `src/accessories/thermostatAccessory.ts` and wired Phase 5 binders in `src/platform.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/discovery/supportedCategories.test.ts --runInBand` — passed.
- `npm test -- --runTestsByPath src/accessories/thermostatAccessory.test.ts src/platform/accessoryRegistry.test.ts --runInBand` — passed.
- `npm test -- --runInBand` — passed; 16 suites / 92 tests.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; TDD audit checked 19 production files with 0 legacy gaps.

## Deviations from Plan

**[Clarification] Platform composition test coverage**
- **Context:** `src/platform.ts` is Homebridge lifecycle glue and already marked `tdd-audit: exempt`.
- **Decision:** Kept the platform change minimal and verified it through typecheck/lint plus binder-level tests, instead of adding a broad Homebridge mock for one callback composition line.
- **Impact:** Low. The behavior is narrow and the real logic remains covered in accessory binder tests.

**Total deviations:** 1 clarified. **Impact:** Low; no behavior removed from the plan.

## Self-Check: PASSED

- FOUND: `src/accessories/thermostatAccessory.ts` and `src/accessories/thermostatAccessory.test.ts`.
- `wk` category is supported.
- Platform binds switch/outlet, sensor, and thermostat accessories.
- Successful setters update cached Tuya status after cloud command success; failed setters leave cache unchanged.
