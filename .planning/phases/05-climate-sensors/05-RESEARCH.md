# Phase 5 Research: Climate and Sensors

**Researched:** 2026-06-25
**Status:** Complete
**Method:** Existing project research + current code inspection. No new web search required.

## Load-Bearing Findings

- The first read-only sensor priority is `wsdcg` temperature/humidity because it directly matches the user's thermometer need.
- `wsdcg` commonly reports:
  - temperature as `va_temperature` or `temp_current`.
  - humidity as `va_humidity` or `humidity_value`.
- Binary sensor categories and on-values:
  - `mcs`: `doorcontact_state === true`.
  - `pir`: `pir === "pir"`.
  - `sj`: `watersensor_state` in `"1"` or `"alarm"`.
  - `ywbj`: `smoke_sensor_status === "alarm"` or `smoke_sensor_state === "alarm"`.
- Thermostat category `wk` uses:
  - `switch`.
  - `temp_current`.
  - `temp_set`.
  - `mode`.
- Battery DPs can appear across sensors and thermostats:
  - percentage/value: `battery_percentage`, `battery_value`, `va_battery`.
  - low state: `battery_state`.

## Current Code Fit

- `src/mappers/scaling.ts` already implements raw/scaled integer conversion and should be reused directly.
- `src/accessories/switchOutletAccessory.ts` is the binder template:
  - narrow HAP shape.
  - cached `onGet`.
  - command write only in `onSet`.
  - cached status updates only after command success.
- `AccessoryRegistry` already accepts a `bindAccessory` callback. Phase 5 should broaden the platform callback to bind switch/outlet, sensor, and thermostat services for a device.

## Planning Implications

- Split sensor mapping from HomeKit binding. Mapper tests can cover Tuya DP names and values without HAP complexity.
- Split thermostat mapping/control from read-only sensor binding. Thermostats include command writes, target ranges, and mode conversion.
- Battery should be planned as a reusable helper in the sensor mapper/binder, then reused by thermostat binder.
- Extend `supportedCategories` before registry binding, otherwise Phase 5 device categories will remain unsupported.

## Risks

- HomeKit characteristic constants are easy to wire incorrectly when tests use loose fake values.
- Thermostat mode mapping can balloon if every Tuya HVAC variant is handled now.
- Bad or missing `values` specs can produce impossible temperatures.
- Phase 6 offline/no-response work could be accidentally pulled forward.

## Mitigations

- Tests assert exact HAP service/characteristic tokens in fake HAP bindings.
- Limit thermostat execution to `wk`.
- Invalid/missing scale specs produce no mapping or conservative defaults; never invent scaled values from raw integers.
- Keep offline behavior out of Phase 5 tests and summaries except as an explicit deferred item.

