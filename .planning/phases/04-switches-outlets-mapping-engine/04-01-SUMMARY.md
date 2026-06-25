---
phase: 04-switches-outlets-mapping-engine
plan: 01
subsystem: mapping-engine
tags: [mappers, scaling, switches, outlets, tdd]
requires: []
provides:
  - tuya-integer-scaling
  - switch-outlet-dp-mapping
affects:
  - src/mappers/
key-files:
  created:
    - src/mappers/scaling.ts
    - src/mappers/scaling.test.ts
    - src/mappers/switchOutlet.ts
    - src/mappers/switchOutlet.test.ts
  modified: []
decisions:
  - "Switch/outlet mapping is pure and has no Homebridge imports."
  - "kg and tdq categories map to switch services; cz and pc map to outlet services."
  - "Multi-gang and USB switch DPs are sorted deterministically before binding."
metrics:
  completed: 2026-06-25
  tasks: 4
  files: 4
status: complete
---

# Phase 4 Plan 1: Mapping Engine Summary

Implemented the pure mapper foundation for Phase 4. The new scaling helper parses Tuya integer
specs and converts raw/scaled values. The switch/outlet mapper discovers boolean switch DPs,
maps Tuya categories to switch vs outlet service semantics, orders multi-gang/USB DPs
deterministically, and produces command payloads without importing Homebridge.

## TDD Evidence

- RED commit: `ef9b7e5 test(04-01): add scaling primitive tests`
  - Targeted suite failed because `src/mappers/scaling.ts` did not exist.
- GREEN commit: `41569cf feat(04-01): add Tuya integer scaling primitive`
  - Implemented `src/mappers/scaling.ts`.
- RED commit: `ad3efa0 test(04-01): add switch outlet mapper tests`
  - Targeted suite failed because `src/mappers/switchOutlet.ts` did not exist.
- GREEN commit: `24ade1f feat(04-01): add switch outlet mapper`
  - Implemented `src/mappers/switchOutlet.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/mappers/scaling.test.ts src/mappers/switchOutlet.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `rg -n "homebridge|hap-nodejs" src/mappers` — no matches.
- `make check` — passed; 11 suites / 55 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/mappers/scaling.ts`, `src/mappers/switchOutlet.ts`, and their tests.
- Mapper modules have no Homebridge/HAP imports.
- Switch/outlet categories and multi-gang ordering are covered by tests.
