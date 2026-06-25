---
phase: 04-switches-outlets-mapping-engine
plan: 02
subsystem: device-command-transport
tags: [discovery, commands, tuya, tdd]
requires:
  - switch-outlet-dp-mapping
provides:
  - tuya-device-command-transport
affects:
  - src/discovery/
key-files:
  created: []
  modified:
    - src/discovery/deviceRepository.ts
    - src/discovery/deviceRepository.test.ts
    - src/discovery/types.ts
decisions:
  - "DeviceRepository owns Tuya command transport and remains free of Homebridge imports."
  - "sendCommands posts commands to /v1.1/m/thing/{deviceId}/commands."
  - "Command failures propagate to callers instead of being swallowed."
metrics:
  completed: 2026-06-25
  tasks: 2
  files: 3
status: complete
---

# Phase 4 Plan 2: Device Command Transport Summary

Added the Tuya cloud command write path needed by HomeKit `On` setters. `DeviceRepository` now
exposes `sendCommands(deviceId, commands)`, forwards the payload to the signed client, and leaves
errors visible to callers.

## TDD Evidence

- RED commit: `4125ba0 test(04-02): add device command transport tests`
  - Targeted suite failed because `DeviceRepository.sendCommands` did not exist.
- GREEN commit: `58b48d4 feat(04-02): add device command transport`
  - Implemented `sendCommands` and exported the shared `TuyaDeviceCommand` type.

## Verification Results

- `npm test -- --runTestsByPath src/discovery/deviceRepository.test.ts --runInBand` — passed.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; 11 suites / 57 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `DeviceRepository.sendCommands`.
- The command endpoint path and payload shape are covered by tests.
- Command transport errors are covered by tests.
