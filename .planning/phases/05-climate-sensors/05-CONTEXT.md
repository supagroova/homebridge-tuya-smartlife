# Phase 5: Climate & Sensors - Context

**Gathered:** 2026-06-25
**Status:** Ready for planning
**Source:** Roadmap + existing research + Phase 4 implementation

<domain>

## Phase Boundary

Phase 5 adds the user's other priority devices: temperature/humidity sensors first, then binary
sensors, then thermostat support. It reuses the Phase 4 pure mapper and binder pattern.

In scope:

- Temperature/humidity sensors for category `wsdcg`.
- Binary sensor categories:
  - `mcs` contact sensor.
  - `pir` motion sensor.
  - `sj` water leak sensor.
  - `ywbj` smoke detector.
- Thermostat category `wk` with current temperature, target temperature, mode, and switch state.
- Battery characteristics where status DPs exist.
- Add Phase 5 categories to discovery/registration support.

Out of scope:

- Polling freshness, offline/no-response behavior, and update hub mechanics. These remain Phase 6.
- Air conditioners/heaters beyond category `wk` (`kt`, `qn`, `rs`, `wkf`) unless the mapper shape makes later addition obvious without implementing them.
- Gas alarms (`rqbj`) because HomeKit semantics are ambiguous.
- Config UI, QR setup UI, whitelist fields, per-device DP overrides.
- MQTT push.

</domain>

<decisions>

## Implementation Decisions

### Priority

- Implement `wsdcg` thermometer/humidity support before thermostat support. This matches the user's stated first-version priority: switches and thermometers.
- Keep read-only sensors separate from thermostats. Thermostats add command writes and mode mapping, so they deserve their own plan.

### Mapping

- Pure mapper modules must not import Homebridge.
- Use Phase 4 `parseIntegerSpec` and `scaleTuyaInteger` for temperature/humidity and thermostat temperature DPs.
- Prefer status-range specs over function specs for read-only sensor values.
- Missing or invalid scale specs should produce no mapping rather than bogus values.
- Binary sensors map explicit on-values only; unknown values should be treated as not triggered unless the mapper has a category-specific rule.

### Homebridge Binding

- Follow the Phase 4 binder shape: `src/accessories/*Accessory.ts` accepts narrow HAP/accessory surfaces and a `TuyaDevice`.
- `onGet` remains cached-only and does not perform cloud I/O.
- Command-writing thermostat setters update cached status only after `sendCommands` succeeds.
- Battery is a reusable helper/binder concern, shared by sensors and thermostat where possible.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before implementing:

### Phase Scope

- `.planning/ROADMAP.md` — Phase 5 goal and success criteria.
- `.planning/REQUIREMENTS.md` — CLIM-01, CLIM-02, CLIM-03, CLIM-04.
- `.planning/phases/04-switches-outlets-mapping-engine/04-03-SUMMARY.md` — current mapper/binder/registry shape.

### Research

- `.planning/research/FEATURES.md` — sensor/binary sensor/thermostat mapping table.
- `.planning/research/ARCHITECTURE.md` — cached `onGet`, command flow, and mapper/binder boundaries.

### Code

- `src/mappers/scaling.ts` — integer scaling helper.
- `src/discovery/types.ts` — normalized Tuya device/status/spec model and command type.
- `src/discovery/supportedCategories.ts` — category allowlist to extend.
- `src/platform/accessoryRegistry.ts` — lifecycle hook for binding services.
- `src/accessories/switchOutletAccessory.ts` — binder pattern to mirror.
- `src/platform.ts` — composition root; keep thin.

</canonical_refs>

<specifics>

## Specific Ideas

- Add `src/mappers/sensor.ts` for:
  - `wsdcg` temperature/humidity mappings:
    - `va_temperature` or `temp_current` -> `CurrentTemperature`.
    - `va_humidity` or `humidity_value` -> `CurrentRelativeHumidity`.
  - Binary sensor mappings:
    - `mcs` `doorcontact_state === true` -> contact open.
    - `pir` `pir === "pir"` -> motion.
    - `sj` `watersensor_state in {"1","alarm"}` -> leak.
    - `ywbj` `smoke_sensor_status === "alarm"` or `smoke_sensor_state === "alarm"` -> smoke.
  - Battery mapping:
    - `battery_percentage`, `battery_value`, or `va_battery` -> `BatteryLevel`.
    - `battery_state` low states -> `StatusLowBattery`.
- Add `src/accessories/sensorAccessory.ts` for read-only HomeKit service binding.
- Add `src/mappers/thermostat.ts` for `wk`:
  - `temp_current` -> `CurrentTemperature`.
  - `temp_set` -> `TargetTemperature` with min/max/step from spec.
  - `switch === false` -> off.
  - Basic modes: `auto`, `heat`, `cool` if present; unknown mode falls back to auto/heat depending on available enum.
- Add `src/accessories/thermostatAccessory.ts` for thermostat service binding and command writes.

</specifics>

<deferred>

## Deferred Ideas

- Offline/no-response behavior and status refresh.
- Polling and update hub.
- Non-`wk` HVAC categories.
- Device-specific DP overrides.
- Gas alarms and non-native HomeKit semantic compromises.

</deferred>

---

*Phase: 05-climate-sensors*
*Context gathered: 2026-06-25 via Codex-local GSD planning*
