---
phase: 03-device-discovery-platform-skeleton
status: planned
date: 2026-06-24
requirements: [DISC-01, DISC-02, DISC-03, DISC-04]
---

# Phase 3 Validation Strategy

## Validation Dimensions

1. **Discovery correctness**: mocked Tuya API responses produce homes, devices, categories, status maps,
   functions, and status ranges.
2. **Broad diagnostics, focused registration**: unsupported devices are discovered/loggable but do not
   become placeholder HomeKit accessories.
3. **Stable identity**: accessory UUIDs are derived from Tuya device ids and reused across restarts.
4. **Cache lifecycle**: cached matching accessories are reused, new supported devices are registered,
   and missing devices are pruned.
5. **Auth handling**: missing/expired token stops discovery with re-auth-required logging, not an empty
   device list.
6. **Scope control**: no whitelist config fields and no switch/thermometer HomeKit characteristics in
   Phase 3.

## Required Evidence

- `make check` passes.
- Targeted discovery and registry tests pass.
- `rg -n "homeIds|deviceIds|whitelist" src config.schema.json` has no Phase 3 config-field matches.
- Tests prove unsupported categories are discovered but not registered.
- Tests prove a cached missing device is passed to `unregisterPlatformAccessories`.

