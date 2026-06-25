---
phase: 04-switches-outlets-mapping-engine
plan: 03
subsystem: switch-outlet-accessories
tags: [homebridge, accessories, switches, outlets, tdd]
requires:
  - switch-outlet-dp-mapping
  - tuya-device-command-transport
provides:
  - switch-outlet-homekit-binding
  - accessory-registry-binding-hook
affects:
  - src/accessories/
  - src/platform/
key-files:
  created:
    - src/accessories/switchOutletAccessory.ts
    - src/accessories/switchOutletAccessory.test.ts
  modified:
    - src/platform/accessoryRegistry.ts
    - src/platform/accessoryRegistry.test.ts
    - src/platform.ts
decisions:
  - "Switch/outlet service binding lives outside platform.ts in an accessory binder."
  - "HomeKit onGet reads cached Tuya status and performs no cloud I/O."
  - "HomeKit onSet sends Tuya commands and updates cached status only after command success."
metrics:
  completed: 2026-06-25
  tasks: 4
  files: 5
status: complete
---

# Phase 4 Plan 3: Switch/Outlet Accessory Binding Summary

Implemented HomeKit service binding for switch and outlet mappings. Discovered supported
accessories now bind HomeKit `Switch`/`Outlet` services during registry reconciliation, with one
service per controllable Tuya DP and deterministic subtypes based on the DP code.

## TDD Evidence

- RED commit: `62205da test(04-03): add switch outlet accessory binder tests`
  - Targeted suite failed because `src/accessories/switchOutletAccessory.ts` did not exist.
- GREEN commit: `2681683 feat(04-03): add switch outlet accessory binder`
  - Implemented the switch/outlet binder and fixed the fake service lint issue.
- RED commit: `7ff60ff test(04-03): add registry binding tests`
  - Targeted suite failed because `AccessoryRegistryOptions.bindAccessory` did not exist.
- GREEN commit: `107e603 feat(04-03): wire switch outlet binding into registry`
  - Added the registry bind callback and platform composition wiring.

## Verification Results

- `npm test -- --runTestsByPath src/accessories/switchOutletAccessory.test.ts src/platform/accessoryRegistry.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; 12 suites / 63 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/accessories/switchOutletAccessory.ts` and registry/platform binding.
- Multi-gang services use DP code subtypes.
- `onGet` is cached-only.
- Failed `onSet` does not mutate cached status.
