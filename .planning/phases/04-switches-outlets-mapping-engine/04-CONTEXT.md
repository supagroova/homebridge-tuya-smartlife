# Phase 4: Switches & Outlets + Mapping Engine - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Source:** Roadmap + existing research + Phase 3 implementation

<domain>

## Phase Boundary

Phase 4 delivers the first controllable HomeKit devices: Tuya switches and outlets. It must also
create the reusable, pure mapping primitives that later phases will use for sensors and climate.

In scope:

- Switch/outlet categories: `kg`, `cz`, `pc`, `tdq`.
- Boolean switch DPs: `switch`, `switch_N`, and `switch_usbN`.
- Multi-gang/multi-socket devices expose one HomeKit service per controllable DP.
- `kg` and `tdq` map to HomeKit `Switch`; `cz` and `pc` map to HomeKit `Outlet`.
- HomeKit `On` writes send Tuya commands through the signed device-sharing client.
- `onGet` returns cached status only; it must not perform cloud reads.

Out of scope:

- Polling freshness, offline/no-response behavior, and update hub mechanics. These remain Phase 6.
- Sensors, thermometers, climate, battery, energy/power metrics, child lock, lights, covers, and scenes.
- Config UI, QR setup UI, whitelist fields, per-device DP overrides.

</domain>

<decisions>

## Implementation Decisions

### Mapping

- Build pure mapping modules before Homebridge glue.
- Keep DP discovery based on the device's reported status keys first, with function/status specs used only
  for metadata and later value scaling.
- Treat only boolean-like switch DPs as controllable in Phase 4.
- Sort switch services deterministically: `switch`, numeric `switch_N`, then `switch_usbN`.
- Create a scaling primitive now because it is explicitly part of the Phase 4 roadmap and unblocks Phase 5,
  but use it only in tests/exports until sensor/climate implementation consumes it.

### Commands

- Extend `DeviceRepository` with `sendCommands(deviceId, commands)` using
  `POST /v1.1/m/thing/{deviceId}/commands`.
- Keep command construction pure in the mapper; repository only transports command payloads.
- Do not add optimistic state confirmation beyond updating local cached status after a successful write.

### Homebridge Binding

- Add a switch/outlet binder under `src/accessories/`, not inside `platform.ts`.
- `AccessoryRegistry` should call the binder after creating/restoring a supported accessory.
- The binder is allowed to import Homebridge types; pure mapper modules must not.
- Keep `platform.ts` as composition root glue.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before implementing:

### Phase Scope

- `.planning/ROADMAP.md` — Phase 4 goal and success criteria.
- `.planning/REQUIREMENTS.md` — SW-01, SW-02, SW-03.
- `.planning/phases/03-device-discovery-platform-skeleton/03-03-SUMMARY.md` — current platform startup and registry shape.

### Research

- `.planning/research/FEATURES.md` — switch/outlet mapping table and scaling primitive.
- `.planning/research/ARCHITECTURE.md` — onGet/onSet and updateCharacteristic patterns.

### Code

- `src/discovery/types.ts` — normalized Tuya device/status/spec model.
- `src/discovery/supportedCategories.ts` — categories currently registered as skeleton accessories.
- `src/discovery/deviceRepository.ts` — cloud domain repository to extend with commands.
- `src/platform/accessoryRegistry.ts` — lifecycle hook point for binding services.
- `src/platform.ts` — composition root; keep thin.
- `src/auth/customerApi.ts` — signed HTTP client shape.

</canonical_refs>

<specifics>

## Specific Ideas

- Add `src/mappers/scaling.ts` with `scaleTuyaInteger`, `unscaleTuyaNumber`, and `parseIntegerSpec`.
- Add `src/mappers/switchOutlet.ts` with `buildSwitchOutletMappings(device)` returning DP mappings:
  `{ code, serviceType, displayName, currentValue, command }`.
- Add `src/accessories/switchOutletAccessory.ts` that creates/reuses HomeKit services and wires:
  - `.onGet(() => cached boolean)`
  - `.onSet((value) => sendCommands(device.id, [{ code, value: Boolean(value) }]))`
- Extend accessory context with current Tuya device metadata so binder receives status from discovery.
- Use service subtypes equal to the DP code for multi-service accessories.

</specifics>

<deferred>

## Deferred Ideas

- UpdateHub/polling and external status refresh.
- Offline/no-response mapping.
- Energy and power metrics.
- Child lock exposure.
- DP override config.
- Sensors and thermometers, despite being the owner's other priority; those are Phase 5.

</deferred>

---

*Phase: 04-switches-outlets-mapping-engine*
*Context gathered: 2026-06-24 via Codex-local GSD planning*
