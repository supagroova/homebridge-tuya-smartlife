---
phase: 05-climate-sensors
plan: 03
subsystem: thermostat-mapper
tags: [mappers, thermostat, battery, tdd]
requires:
  - tuya-integer-scaling
  - battery-mapping-helper
provides:
  - wk-thermostat-mapper
  - wk-thermostat-command-generation
affects:
  - src/mappers/
key-files:
  created:
    - src/mappers/thermostat.ts
    - src/mappers/thermostat.test.ts
  modified: []
decisions:
  - "Thermostat mapping is pure and has no Homebridge imports."
  - "wk current and target temperatures are scaled from Tuya integer specs."
  - "Target temperature commands clamp to the temp_set range before converting back to Tuya integers."
  - "Mode commands are conservative: off writes switch=false, active states write switch=true and mode only when supported."
  - "Thermostat battery reporting reuses the sensor battery mapper."
metrics:
  completed: 2026-06-26
  tasks: 2
  files: 2
status: complete
---

# Phase 5 Plan 3: Thermostat Mapper Summary

Implemented pure `wk` thermostat mapping and command generation. The mapper returns semantic
current/target states, scaled current and target temperatures, target temperature constraints, command
builders for target temperature and target state, plus optional battery descriptors.

## TDD Evidence

- RED commit: `bcdb8c0 test(05-03): add thermostat mapper tests`
  - Targeted suite failed because `src/mappers/thermostat.ts` did not exist.
- GREEN commit: `cfbe91e feat(05-03): add wk thermostat mapper`
  - Implemented `src/mappers/thermostat.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/mappers/thermostat.test.ts src/mappers/scaling.test.ts src/mappers/sensor.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `rg -n "homebridge|hap-nodejs" src/mappers/thermostat.ts` — no matches.
- `make check` — passed; 15 suites / 84 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/mappers/thermostat.ts` and `src/mappers/thermostat.test.ts`.
- Mapper has no Homebridge/HAP imports.
- Current/target temperature scaling, clamping, target mode commands, unsupported devices, and battery reuse are covered by tests.
