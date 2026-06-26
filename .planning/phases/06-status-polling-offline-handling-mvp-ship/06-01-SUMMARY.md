---
phase: 06-status-polling-offline-handling-mvp-ship
plan: 01
subsystem: status-updates
tags: [updates, polling, tdd]
requires:
  - tuya-device-discovery-repository
provides:
  - update-hub
  - status-poller
affects:
  - src/updates/
key-files:
  created:
    - src/updates/updateHub.ts
    - src/updates/updateHub.test.ts
    - src/updates/poller.ts
    - src/updates/poller.test.ts
  modified: []
decisions:
  - "UpdateHub is Homebridge-free and stores latest TuyaDevice snapshots by id."
  - "UpdateHub notifies subscribers only when online state or shallow status values change."
  - "DeviceStatusPoller calls repository.discoverDevices and writes successful snapshots into UpdateHub."
  - "Failed polls log warnings, preserve the existing cache, and schedule with capped backoff."
metrics:
  completed: 2026-06-26
  tasks: 4
  files: 4
status: complete
---

# Phase 6 Plan 1: UpdateHub and Poller Summary

Implemented the polling-first status update core. `UpdateHub` now provides a shared cache and
per-device subscription API for Tuya device snapshots, and `DeviceStatusPoller` runs repository-backed
polling with deterministic jitter, warning logs, capped backoff, and no overlapping polls.

## TDD Evidence

- RED commit: `d3f7222 test(06-01): add update hub tests`
  - Targeted suite failed because `src/updates/updateHub.ts` did not exist.
- GREEN commit: `fb9d3d6 feat(06-01): add update hub`
  - Implemented `src/updates/updateHub.ts`.
- RED commit: `68aa25a test(06-01): add status poller tests`
  - Targeted suite failed because `src/updates/poller.ts` did not exist.
- GREEN commit: `577a597 feat(06-01): add status poller`
  - Implemented `src/updates/poller.ts`.

## Verification Results

- `npm test -- --runTestsByPath src/updates/updateHub.test.ts src/updates/poller.test.ts --runInBand` — passed.
- `rg -n "homebridge|hap-nodejs" src/updates || true` — no matches.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `make check` — passed; 18 suites / 103 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/updates/updateHub.ts` and `src/updates/poller.ts`.
- Update core is Homebridge-free.
- Failed polls preserve cache by never calling `replaceAll([])`.
- Jitter/backoff and `stop()` behavior are covered by tests.
