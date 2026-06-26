---
phase: 06-status-polling-offline-handling-mvp-ship
plan: 02
subsystem: offline-accessories
tags: [homebridge, accessories, polling, offline, tdd]
requires:
  - update-hub
  - status-poller
provides:
  - offline-aware-status-reader
  - cached-accessory-getters
  - platform-polling-composition
affects:
  - src/accessories/
  - src/platform.ts
key-files:
  created:
    - src/accessories/statusReader.ts
    - src/accessories/statusReader.test.ts
  modified:
    - src/accessories/switchOutletAccessory.ts
    - src/accessories/switchOutletAccessory.test.ts
    - src/accessories/sensorAccessory.ts
    - src/accessories/sensorAccessory.test.ts
    - src/accessories/thermostatAccessory.ts
    - src/accessories/thermostatAccessory.test.ts
    - src/platform.ts
decisions:
  - "StatusReader is Homebridge-free; platform glue injects the HomeKit communication failure error."
  - "Accessory getters read latest cached snapshots from UpdateHub and do not call the cloud."
  - "Offline getters and setters throw before returning stale values or sending commands."
  - "Successful writable setters update the shared UpdateHub snapshot after Tuya command success."
  - "Platform creates and seeds one UpdateHub, then starts DeviceStatusPoller at a conservative 120s interval."
metrics:
  completed: 2026-06-26
  tasks: 4
  files: 9
status: complete
---

# Phase 6 Plan 2: Offline-Aware Accessory Binding Summary

Wired the Phase 6 polling cache into supported accessory binders. Switch/outlet, sensor, and
thermostat getters now read the latest cached `TuyaDevice` snapshot; offline devices throw the
platform-injected HomeKit communication failure; and successful writable setters update the shared
cache only after Tuya command success.

## TDD Evidence

- RED commit: `fc79d1c test(06-02): add status reader tests`
  - Targeted suite failed because `src/accessories/statusReader.ts` did not exist.
- GREEN commit: `70d23f9 feat(06-02): add status reader`
  - Implemented `src/accessories/statusReader.ts`.
- RED commit: `366cdf7 test(06-02): add offline accessory tests`
  - Binder suites failed because the new `getDevice`, `applySnapshot`, and `communicationFailure` option surface did not exist.
- GREEN commit: `5ed403c feat(06-02): wire cached offline status`
  - Updated binders and platform composition to use `StatusReader`, `UpdateHub`, and `DeviceStatusPoller`.

## Verification Results

- `npm test -- --runTestsByPath src/accessories/statusReader.test.ts src/accessories/switchOutletAccessory.test.ts src/accessories/sensorAccessory.test.ts src/accessories/thermostatAccessory.test.ts src/updates/updateHub.test.ts src/updates/poller.test.ts --runInBand` — passed.
- `rg -n "SERVICE_COMMUNICATION_FAILURE|HapStatusError" src/platform.ts src/accessories` — communication failure handling is in `src/platform.ts`.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; 19 suites / 114 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/accessories/statusReader.ts`.
- Offline behavior is covered for switch/outlet, sensor, and thermostat binders.
- `onGet` remains cache-only.
- Platform polling composition starts only after successful discovery.
