# Phase 4 Research: Switches, Outlets, and Mapping Engine

**Researched:** 2026-06-24
**Status:** Complete
**Method:** Existing project research + current code inspection. No new web search required.

## Load-Bearing Findings

- Switch/outlet categories are `kg`, `cz`, `pc`, and `tdq`.
- `kg` and `tdq` should expose HomeKit `Switch` services.
- `cz` and `pc` should expose HomeKit `Outlet` services.
- Multi-gang/multi-socket support is one HomeKit service per controllable DP on one accessory.
- Controllable DP codes for Phase 4 are `switch`, `switch_N`, and `switch_usbN`.
- HomeKit `onGet` must read cached Tuya status and must not perform cloud I/O.
- HomeKit `onSet` sends `POST /v1.1/m/thing/{deviceId}/commands` with:

```json
{
  "commands": [{ "code": "switch_1", "value": true }]
}
```

## Scaling Primitive

Phase 4 should introduce the general value-scaling primitive even though switches use booleans.
The primitive is required by the roadmap and prevents Phase 5 from inventing a second mapping style.

Formula from existing research:

- device to HomeKit: `raw / (10 ** scale)`
- HomeKit to device: `int(value * (10 ** scale))`
- step: `step / (10 ** scale)`

The Tuya spec source is the per-DP `values` JSON field on discovered functions/status ranges.

## Current Code Fit

- `DeviceRepository` already owns cloud API calls and is the correct place for `sendCommands`.
- `AccessoryRegistry` already chooses supported devices, creates/restores accessories, and updates context.
  It is the correct place to call a binder function after context update.
- `platform.ts` already composes `DeviceRepository` and `AccessoryRegistry`; it should inject a command sender
  into the registry/binder rather than constructing HomeKit services itself.
- No update hub exists yet, so Phase 4 should keep read-after-write behavior local and modest.

## Risks

- Binding HomeKit services during discovery can become hard to test if pure mapping and HAP glue are mixed.
- Multi-gang ordering can be unstable if based only on object insertion order.
- Cached accessories could accumulate stale services if a device's DP set changes.
- Updating cached status after failed command would make HomeKit lie.

## Mitigations

- Plan 04-01 creates pure mapper/scaling tests first.
- Plan 04-02 adds repository command transport separately.
- Plan 04-03 binds HomeKit services after mapper and command transport exist.
- Binder tests use lightweight fake HAP services rather than a real Homebridge instance.
- Command writes update cached status only after the send command promise resolves.

