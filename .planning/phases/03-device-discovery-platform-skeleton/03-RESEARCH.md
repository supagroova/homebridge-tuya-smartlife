---
phase: 03-device-discovery-platform-skeleton
status: complete
date: 2026-06-24
requirements: [DISC-01, DISC-02, DISC-03, DISC-04]
sources:
  - .planning/phases/03-device-discovery-platform-skeleton/03-CONTEXT.md
  - .planning/research/ARCHITECTURE.md
  - .planning/research/FEATURES.md
  - https://raw.githubusercontent.com/tuya/tuya-device-sharing-sdk/dev/tuya_sharing/manager.py
  - https://raw.githubusercontent.com/tuya/tuya-device-sharing-sdk/dev/tuya_sharing/home.py
  - https://raw.githubusercontent.com/tuya/tuya-device-sharing-sdk/dev/tuya_sharing/device.py
  - https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/tuya/__init__.py
---

# Phase 3 Research: Device Discovery + Platform Skeleton

## Executive Summary

Phase 3 should be planned as three sequential slices:

1. **Discovery repository**: port the Python SDK's homes/devices query shape into testable TypeScript
   modules that return normalized homes and devices with category/status/spec metadata.
2. **Accessory registry lifecycle**: build stable UUID derivation, cached accessory matching, new
   accessory registration, and automatic prune for missing Tuya device ids.
3. **Platform composition**: wire token loading + discovery + registry into `TuyaSmartLifePlatform`
   on `didFinishLaunching`, with clear auth/no-token/error logging.

The Python SDK's `Manager.update_device_cache()` is the key reference: clear the device map, query
homes, query devices for each home, and index by device id. `HomeRepository.query_homes()` calls
`GET /v1.0/m/life/users/homes`. `DeviceRepository.query_devices_by_home(homeId)` calls
`GET /v1.0/m/life/ha/home/devices` with `homeId`; each device is enriched by specifications
(`GET /v1.1/m/life/{deviceId}/specifications`), status strategy (`GET /v1.0/m/life/devices/{deviceId}/status`),
and report types (`GET /v1.0/m/life/ha/{deviceId}/dp-report-types`).

For Homebridge, discovery should collect all account devices for diagnostics, but skeleton accessory
registration should stay focused on the v1 path. The user's first-version priority is switches and
thermometers; Phase 3 should not expose unsupported placeholder accessories in HomeKit.

## Implementation-Ready Module Boundaries

- `src/discovery/types.ts`
  - `TuyaHome`, `TuyaDevice`, `TuyaDeviceStatus`, `TuyaDeviceFunction`, `TuyaDeviceStatusRange`.
  - `DiscoverDevicesResult` with `homes`, `devices`, and optionally `unsupportedDevices`.

- `src/discovery/deviceRepository.ts`
  - `DeviceRepository` using `TuyaDeviceSharingClient`.
  - Methods: `queryHomes()`, `queryDevicesByHome(homeId)`, `discoverDevices()`.
  - Normalize Tuya SDK response shapes: status array -> `{ [code]: value }`, functions/status ranges
    keyed by code, home id attached to each device.
  - On per-device enrichment failures, planner should decide whether to fail whole discovery or keep
    basic metadata. Recommendation: fail whole discovery for HTTP/auth errors; tolerate missing optional
    specification/report metadata only if Tuya returns a clean `success:false` for that optional call.

- `src/discovery/supportedCategories.ts`
  - Small predicate: v1/imminent skeleton categories only.
  - Include categories needed for Phase 4/5 priority: `kg`, `cz`, `pc`, `tdq`, `wsdcg`, and perhaps
    `wk`/sensor categories already in v1 scope if cheap. Do not register every discovered category.

- `src/platform/accessoryRegistry.ts`
  - Pure-ish lifecycle service wrapping Homebridge API calls.
  - Derive UUID from Tuya device id using `api.hap.uuid.generate(device.id)` or a stable namespace string.
  - Match cached accessories by `accessory.context.tuyaDeviceId`.
  - Register new accessories via `api.registerPlatformAccessories`.
  - Prune missing accessories via `api.unregisterPlatformAccessories`.

- `src/platform.ts`
  - Composition only: load persisted token, create client/repository/registry, run discovery after
    `didFinishLaunching`, log counts, handle re-auth-required distinctly.
  - May stay `// tdd-audit: exempt` if it remains a thin adapter. Testable orchestration can live in
    a separate module if platform logic grows.

## Tuya Discovery Details

### Homes

The Python SDK maps `/v1.0/m/life/users/homes` result items to home id/name, using `ownerId` as the
home id.

Planner implication: tests should verify `ownerId` is stringified and preserved as `homeId` on
devices discovered through that home.

### Devices

The SDK's home devices endpoint is:

```text
GET /v1.0/m/life/ha/home/devices?homeId=<homeId>
```

Returned device fields include `id`, `name`, `category`, `product_id`, `product_name`, `online`,
`status`, and many other raw Tuya fields. The SDK converts `status: [{ code, value }]` into a map.

Planner implication: tests should include at least one switch-like device and one temperature/humidity
device fixture, plus one unsupported category to prove broad discovery + focused registration.

### Specifications And DP Metadata

The SDK enriches every device with:

- `GET /v1.1/m/life/{deviceId}/specifications`
- `GET /v1.0/m/life/devices/{deviceId}/status`
- `GET /v1.0/m/life/ha/{deviceId}/dp-report-types`

The specification endpoint yields functions and status ranges keyed by code. This is essential for
later control/mapping phases because Phase 4/5 need command constraints and scaling metadata.

Planner implication: Phase 3 should not implement HomeKit characteristics, but should preserve this
metadata in the discovery model and log enough to inspect it.

## Homebridge Lifecycle Details

Required Phase 3 behavior:

- Cache restored accessories in `configureAccessory`.
- On `didFinishLaunching`, run discovery after Homebridge cache restoration.
- For each supported discovered device:
  - compute stable UUID from Tuya device id,
  - restore existing cached accessory if present,
  - create/register a new `PlatformAccessory` if absent,
  - set `accessory.context.tuyaDeviceId`, category, home id, and current metadata snapshot.
- For cached accessories whose context Tuya device id is no longer in discovery, call
  `api.unregisterPlatformAccessories`.

Unsupported devices should be logged and retained in discovery diagnostics, but not registered as
HomeKit placeholder accessories.

## Testing Strategy

- `src/discovery/deviceRepository.test.ts`
  - Mock `TuyaDeviceSharingClient.get`.
  - Homes endpoint maps `ownerId` -> `home.id`.
  - Devices endpoint is called once per home.
  - Status array normalizes to status map.
  - Specifications/function/status ranges are preserved by code.
  - Unsupported categories still appear in discovery result.
  - Auth/API errors fail discovery, not silently return an empty list.

- `src/platform/accessoryRegistry.test.ts`
  - Stable UUID generated from Tuya device id.
  - Cached accessory reused when device id matches.
  - New supported device registers exactly once.
  - Unsupported device does not register.
  - Missing cached device unregisters exactly once.
  - Accessory context stores Tuya device id/category/home id/status snapshot.

- `src/platform` integration/orchestration tests if platform logic is extracted:
  - No token -> logs re-auth-required/no discovery.
  - Token present -> discovery/registry called on launch.
  - Discovery error -> logged without token leakage.

## Validation Architecture

1. `make check` remains the main offline gate.
2. No live Tuya cloud call is required for CI.
3. Optional manual validation can run after Phase 3 with a local token file:
   - `npm run auth:qr-login -- ...`
   - start Homebridge/plugin locally,
   - confirm logs show homes/devices/categories/status sets,
   - confirm skeleton accessories are created only for supported categories.
4. No HomeKit behavior beyond skeleton accessories is expected until Phase 4/5.

## Planner Must-Haves

- Plan TDD red commits before each new production module.
- Do not add whitelist config fields in Phase 3.
- Do not expose unsupported placeholder accessories in HomeKit.
- Do not implement switch/thermometer characteristics in Phase 3; preserve metadata for later phases.
- Treat missing auth as re-auth-required, not "zero devices".
- Keep Homebridge glue thin; put testable discovery/registry logic in separate modules.

