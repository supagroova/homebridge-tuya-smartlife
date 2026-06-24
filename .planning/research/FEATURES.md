# Feature Research

**Domain:** Homebridge platform plugin bridging Tuya / Smart Life cloud devices to Apple HomeKit (cloud-only, device-sharing/QR auth). v1 device scope: **switches/outlets** + **climate & sensors**.
**Researched:** 2026-06-24
**Confidence:** HIGH for device→HomeKit mapping and scaling (verified against canonical HA `home-assistant/core` tuya source + tuya-device-sharing-sdk); MEDIUM for competitor feature inventory (search-derived).

## Feature Landscape

### Table Stakes (Users Expect These)

Missing these = the plugin feels broken or unusable. These are the bar set by `homebridge-tuya-web` (the abandoned plugin this replaces) and the HA tuya integration.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Smart Life QR / user-code login | This is the project's Core Value; without it there is no plugin | HIGH | Port of `tuya-device-sharing-sdk` auth (LoginControl, qr_code) to TS. No official Node SDK exists. Gated by the partner-access open question in PROJECT.md. |
| Token persistence + auto-refresh across restarts | HomeKit must keep working after a Homebridge reboot without re-scanning a QR | MEDIUM | HA observed "sign invalid" / refresh fragility. Persist token to disk; refresh proactively before expiry; recover by surfacing re-auth, not crashing. |
| Device discovery from the cloud | A platform plugin that finds nothing is useless | MEDIUM | `HomeRepository`/`DeviceRepository` equivalent: list homes → list devices → read category + status/DP set. |
| On/off control for switches & outlets | The single most common Tuya device; baseline of any Tuya plugin | LOW | Map `kg`/`cz`/`pc`/`tdq` DPCodes (`switch`, `switch_1..N`) to HomeKit `Switch`/`Outlet`. See mapping table. |
| Multi-gang / multi-socket support | A 3-gang switch reported as one accessory is a bug to users | MEDIUM | Each `switch_N` DPCode → its own HomeKit service on one accessory (or one accessory each). HA exposes one entity per `switch_N`. |
| Status read-back / state sync | HomeKit tile must reflect reality (manual/app/automation changes) | MEDIUM | At minimum polling; see push-vs-poll below. Tuya reports state as DP/status codes. |
| Climate & sensor read-out (temp, humidity, contact, motion, leak, smoke) | The author's actual v1 devices; expected to "just show up" | MEDIUM | Read-only sensors are low effort; thermostat control is higher. See mapping table + scaling. |
| Correct value scaling & units | A temp showing 235°C instead of 23.5°C is an obvious failure | LOW-MEDIUM | Tuya integers are scaled: `scaled = raw / (10 ** scale)`. Must apply per-DP from the device's function/status spec. Verified formula below. |
| Offline-device handling | Cloud-bridged BT devices go offline; HomeKit must show "No Response" not crash | MEDIUM | Tuya device has `online` flag → map to HAP "not responding" (throw/`SERVICE_COMMUNICATION_FAILURE`) rather than reporting stale-as-live. |
| Homebridge config-UI schema | Homebridge users expect GUI setup via `config.schema.json` | LOW-MEDIUM | Fields: trigger QR login, region/endpoint, optional home-ID whitelist, debug toggle. |
| Accessory caching across restarts | Dynamic platform plugins must restore accessories without duplicating them | LOW-MEDIUM | Standard Homebridge `configureAccessory` + stable UUID from Tuya device id. Avoid re-adding/orphaning. |
| Device naming | Use the user's Smart Life app names so HomeKit matches the app | LOW | Read device `name` from cloud; let HomeKit/Home app rename downstream. |

### Differentiators (Competitive Advantage)

Aligns with Core Value ("frictionless cloud onboarding + reliable control"). Don't over-differentiate.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **No Tuya developer account** (device-sharing flow) | The whole reason to pick this over `0x5e/homebridge-tuya-platform`, which requires an Access ID/Secret + 6-month-renewing IoT trial | HIGH | This *is* the differentiator. The 0x5e plugin uses the dev-project API (`accessId`/`accessKey` + app schema). We deliberately do not. |
| **Real-time push via MQTT-over-WebSocket** | HomeKit reflects changes in ~1s instead of waiting on a poll cycle; fewer "stuck tile" complaints | HIGH | `tuya-device-sharing-sdk` uses MQTT over WebSocket (`SharingMQ` + `SharingDeviceListener`), NOT Pulsar. Differentiator if done; see tradeoff below. Reasonable to ship v1 with polling and add push in v1.x. |
| Maintained, TDD-backed community plugin | The plugin it replaces is abandoned; trust/maintenance is the pitch | MEDIUM | Project constraint already (85% coverage, CI). Not a runtime feature but a positioning one. |
| Non-standard DP override config | Lets users patch quirky devices without a plugin release | MEDIUM | 0x5e supports per-device DP overrides. Nice but defer; needs a stable mapping engine first. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Local LAN / BLE control | "Cloud is laggy / privacy" | Author's devices are BT, bridged via gateway; the Homebridge host is remote with no Bluetooth → physically impossible here. Doubles the protocol surface. | Cloud-only (already an explicit Out of Scope in PROJECT.md). |
| Developer-project API path (Access ID/Secret) | It's the documented, "supported" Tuya path | This is the exact friction (per-user dev account, 6-month renewals) the project exists to remove | Device-sharing/QR flow only. |
| Lights / dimmers / covers / fans in v1 | Other plugins cover them; users will ask | Not in author's v1 device set; color/dimming/position mapping is its own large surface (HSV scaling, cover travel) | Defer to v2 (already Out of Scope). |
| Tuya Scenes / Tap-to-Run as HomeKit switches | 0x5e exposes them; "I want my Tuya scenes in Home" | Scene execution is one-shot, stateful-switch emulation is confusing; cloud scene API is separate; not a device-control concern | Defer; HomeKit automations + native devices cover most needs. |
| Full parity with `homebridge-tuya-web` | "Drop-in replacement" expectations | Parity means every accessory type + edge case; dilutes the "cover my devices well" focus | Cover v1 device set excellently; document scope explicitly. |
| Optimistic UI with no reconcile | Snappy toggles | If the command fails (offline/cloud error) the tile lies; HomeKit then drifts from reality | Optimistic write **then** reconcile from the next status event/poll; revert on command failure. |
| Multiple-homes auto-merge with no filter | "Show all my stuff" | Shared/guest homes pull in devices the user doesn't want; naming collisions | Home-ID whitelist config field (as 0x5e does). |

## Feature Dependencies

```
Smart Life QR / user-code login (auth)
    └──requires──> Token persistence + refresh
                       └──requires──> Device discovery (list homes/devices)
                                          └──requires──> Category→HomeKit mapping engine
                                                             ├──requires──> Value scaling (IntegerTypeData)
                                                             ├──enables──> On/off control (switches/outlets)
                                                             └──enables──> Climate & sensor read/control

Device discovery ──requires──> Accessory caching (restore without duplicates)

Real-time push (MQTT/WS) ──enhances──> Status read-back  (alternative to polling)
Offline handling ──depends on──> Status read-back (need the online flag from status)
Config-UI schema ──gates──> Auth (QR trigger), Home whitelist, region
```

### Dependency Notes

- **Everything requires auth.** The QR/device-sharing port is the critical path and the project's top risk (partner gating). If it's blocked, nothing downstream ships.
- **Mapping engine requires scaling.** Sensors and thermostats are wrong without the `/ (10 ** scale)` conversion, so the scaling primitive must land with the first sensor accessory.
- **Push enhances (does not replace) polling.** Build polling first; push is an optimization layered on the same status-update handler.
- **Offline handling depends on status read-back** carrying the device `online` flag.

## Device → HomeKit Mapping (CRITICAL — v1 scope only)

Source of truth: `home-assistant/core` tuya platform files (`switch.py`, `climate.py`, `sensor.py`, `binary_sensor.py`, `const.py`, `base.py`). DPCode strings are lowercase exactly as below.

### Scaling primitive (applies to all integer DPs) — verified HIGH

Tuya represents decimals as scaled integers. From `IntegerTypeData` (HA tuya `base.py`, verified):

```
scaled_value   = raw_value / (10 ** scale)      # device → HomeKit
raw_value      = int(scaled_value * (10 ** scale))   # HomeKit → device
step_scaled    = step / (10 ** scale)
```

`IntegerTypeData` fields: `min`, `max`, `scale` (float, usually 0/1/2), `step`, `unit`, `type`. The spec comes per-DP from the device's function/status definition (the `values` JSON on each status code). Example: a temp DP with `scale=1` reporting `235` → `23.5`. Temperature unit conversion (C↔F) applies when the device unit differs from the HomeKit locale.

### Switches & Outlets

| Tuya category | Meaning | Tuya DPCode(s) | HomeKit service | Characteristic(s) | Notes / Complexity |
|---------------|---------|----------------|-----------------|-------------------|--------------------|
| `kg` | Switch | `switch_1`..`switch_8`, `switch`, `switch_usb1`..`switch_usb6`, `child_lock` | `Switch` (one per `switch_N`) | `On` (bool) | Multi-gang: one service per `switch_N`. USB ports as extra `Switch`. `child_lock` → separate `Switch` (or `LockMechanism`). LOW per gang. |
| `cz` | Socket / Outlet | same set as `pc` | `Outlet` | `On`, optional `OutletInUse` | Treat as `Outlet` not `Switch` for correct HomeKit semantics. LOW. |
| `pc` | Power strip | `switch_1`..`switch_6`, `switch`, `switch_usb1`..`switch_usb6`, `child_lock` | `Outlet` (one per `switch_N`) | `On`, optional `OutletInUse` | Multi-socket strip → multiple `Outlet` services on one accessory. MEDIUM (service count). |
| `tdq` | Breaker / DIN switch | `switch_1`..`switch_6`, `child_lock` | `Switch` | `On` | Similar to `kg`. LOW-MEDIUM. |
| (sub) | Child lock on any of the above | `child_lock` | `Switch` (or `LockMechanism`) | `On` / `LockTargetState` | Optional; expose as a toggle. LOW. |

Mapping rule: enumerate the device's reported status codes; for each `switch`/`switch_N`/`switch_usb*` create a service; bool DP → `On`. Energy (`cur_power` etc.) is out of v1 scope (no native HomeKit power characteristic; would be custom).

### Climate

| Tuya category | Meaning | Key DPCodes | HomeKit service | Characteristic(s) | Notes / Complexity |
|---------------|---------|-------------|-----------------|-------------------|--------------------|
| `wk` | Thermostat (heat/cool) | `switch`, `temp_set` (target), `temp_current` (current), `mode` (enum) | `Thermostat` | `CurrentTemperature`, `TargetTemperature`, `TargetHeatingCoolingState`, `CurrentHeatingCoolingState`, `TemperatureDisplayUnits` | Apply scaling to `temp_set`/`temp_current`. Map `mode` enum → HAP states. HIGH (mode mapping + scaling + min/max from spec). |
| `kt` | Air conditioner | `switch`, `temp_set`, `temp_current`, `mode` | `HeaterCooler` or `Thermostat` | `Active`, `CurrentTemperature`, `CoolingThresholdTemperature`, `TargetHeaterCoolerState` | `HeaterCooler` fits AC better; mode often cool/auto/fan. HIGH. |
| `qn` | Heater / heat pump | `switch`, `temp_set`, `temp_current` | `HeaterCooler` (heat) or `Thermostat` | `Active`, `CurrentTemperature`, `HeatingThresholdTemperature` | Often switch-only → toggle OFF/HEAT. MEDIUM. |
| `rs` | Water/radiator heater | `switch`, `temp_set`, `temp_current` | `Thermostat`/`HeaterCooler` | as above | MEDIUM. |
| `wkf` | Thermostat (HVAC variant) | `switch`, `temp_set`, `temp_current`, `child_lock`, `window_check` | `Thermostat` | as `wk` | Extra config DPs (`child_lock`, `window_check`) as optional switches. HIGH. |

Climate min/max/step for `TargetTemperature` come from the `temp_set` DP's `IntegerTypeData` (`min_scaled`/`max_scaled`/`step_scaled`). HVAC-mode-capable devices use the `mode` enum DPCode; switch-only devices just toggle OFF ↔ the category's designated mode.

### Sensors (read-only) & Binary Sensors

| Tuya category | Meaning | Tuya DPCode(s) | HomeKit service | Characteristic(s) | on/scale notes | Complexity |
|---------------|---------|----------------|-----------------|-------------------|----------------|------------|
| `wsdcg` | Temp/humidity sensor | `va_temperature` / `temp_current`; `va_humidity` / `humidity_value`; `battery_percentage`/`battery_state` | `TemperatureSensor` + `HumiditySensor` | `CurrentTemperature`, `CurrentRelativeHumidity`, `StatusLowBattery`, `BatteryLevel` | Scale temp & humidity via `/(10**scale)`. Read-only. | LOW-MEDIUM |
| `wk` (sensor side) | Thermostat battery | `battery_percentage`, `battery_state` | (battery on accessory) | `BatteryLevel`, `StatusLowBattery`, `ChargingState` | Diagnostic. | LOW |
| `mcs` | Door/window contact | `doorcontact_state` (bool, on=`True`) | `ContactSensor` | `ContactSensorState` | `True` → contact detected (open). Add `temper_alarm`→tamper. | LOW |
| `pir` | Motion sensor | `pir` (enum, on=`"pir"`) | `MotionSensor` | `MotionDetected` | `"pir"` string → motion true. | LOW |
| `sj` | Water leak sensor | `watersensor_state` (on=`{"1","alarm"}`) | `LeakSensor` | `LeakDetected` | Enum/string compare. | LOW |
| `ywbj` | Smoke detector | `smoke_sensor_status` (on=`"alarm"`) / `smoke_sensor_state` | `SmokeSensor` | `SmokeDetected` | `"alarm"` → smoke. | LOW |
| `rqbj` | Gas alarm | `gas_sensor_status` (on=`"alarm"`) | `CarbonMonoxideSensor` / custom | `CarbonMonoxideDetected` | No native "gas" service; closest is CO/leak. MEDIUM (semantic gap). |
| (common) | Battery (any sensor) | `battery_percentage`, `battery_state`, `battery_value`, `va_battery` | Battery characteristics | `BatteryLevel`, `StatusLowBattery` | Diagnostic across all sensors. | LOW |
| (common) | Tamper (any sensor) | `temper_alarm` | (on relevant sensor) | `StatusTampered` | Optional. | LOW |

Mapping pattern (mirrors HA): a per-category table of `{ category → [{ dpcode, service, characteristic, onValue|scale }] }`. Binary sensors compare the status value to an `on_value` (bool / string / set). Sensors apply scaling. Read-only — no command writes.

## Status Freshness, Optimistic Updates & Error Surfacing (expected behavior)

| Concern | Expected behavior |
|---------|-------------------|
| **Freshness** | Reflect external changes (app/manual/automation). Polling on an interval is the baseline; MQTT-over-WS push (`SharingDeviceListener`) is the better-UX target. |
| **Optimistic updates** | On a HomeKit write, update the cached characteristic immediately for snappy UI, send the command, then reconcile against the next status event/poll. On command failure, revert and surface an error. Do **not** report optimistic state as confirmed truth indefinitely. |
| **Offline / "No Response"** | Honor the device `online` flag. When offline, getters should throw `SERVICE_COMMUNICATION_FAILURE` so HomeKit shows "No Response" rather than a stale-but-live value. |
| **Error surfacing** | Auth/token failures → log + (ideally) a config-UI re-auth prompt, not a crash loop. Per-device cloud errors → mark that accessory not-responding, keep others working. |

## Push vs Polling (status updates) — tradeoff

- **Polling (recommended for v1):** simple, robust, no persistent connection. Cost: latency (interval-bound) and cloud API call volume (rate limits). Start here.
- **Push — MQTT over WebSocket (v1.x target):** `tuya-device-sharing-sdk` uses **MQTT over WebSocket** for the device-sharing flow (NOT Pulsar — Pulsar is the developer-project/IoT-Core path). Components: `SharingMQ` (`start`/`stop`/`add_message_listener`), `Manager.refresh_mq`, `SharingDeviceListener` (`update_status` / `updated_status_properties`, v0.2.1+). HA's tuya IoT class is "Cloud Push". Cost: must port MQTT-over-WS + reconnect/refresh logic to TS (no Node SDK); connection lifecycle and token-tied MQTT credential refresh add complexity.
- **Recommendation:** Ship v1 with polling behind a clean status-update handler; add MQTT push in v1.x feeding the same handler. This de-risks the critical auth path and keeps push as an additive enhancement.

## MVP Definition

### Launch With (v1)

- [ ] Smart Life QR / user-code login (TS port of device-sharing auth) — Core Value; nothing works without it
- [ ] Token persistence + auto-refresh across restarts — reliability bar
- [ ] Device discovery (homes → devices → category + status set) — required to expose anything
- [ ] Category→HomeKit mapping engine + value scaling primitive — correctness foundation
- [ ] Switches/outlets on/off incl. multi-gang/multi-socket (`kg`,`cz`,`pc`,`tdq`) — most common devices
- [ ] Climate & sensors read/control for v1 set (`wk`/thermostat, `wsdcg`, `mcs`, `pir`, `sj`, `ywbj`) — author's actual devices
- [ ] Status polling + offline ("No Response") handling — freshness baseline
- [ ] Config-UI schema (QR trigger, region/endpoint, home whitelist, debug) — Homebridge norm
- [ ] Accessory caching (restore without duplicates) — dynamic-platform correctness

### Add After Validation (v1.x)

- [ ] MQTT-over-WebSocket real-time push — once polling proves stable and auth is solid
- [ ] Per-device non-standard DP override config — when users hit quirky devices
- [ ] Optimistic-write + reconcile polish — when UX latency complaints surface

### Future Consideration (v2+)

- [ ] Lights / dimmers / covers / fans — out of author's v1 device set; large mapping surface
- [ ] Tuya Scenes / Tap-to-Run exposure — separate API, ambiguous HomeKit semantics
- [ ] Local LAN / BLE control — physically impossible for this deployment (remote host, no BT)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| QR / device-sharing auth | HIGH | HIGH | P1 |
| Token persistence + refresh | HIGH | MEDIUM | P1 |
| Device discovery | HIGH | MEDIUM | P1 |
| Mapping engine + scaling | HIGH | MEDIUM | P1 |
| Switch/outlet on/off (multi-gang) | HIGH | LOW-MEDIUM | P1 |
| Climate & sensor read/control (v1 set) | HIGH | MEDIUM | P1 |
| Status polling + offline handling | HIGH | MEDIUM | P1 |
| Config-UI schema | MEDIUM | LOW-MEDIUM | P1 |
| Accessory caching | HIGH | LOW-MEDIUM | P1 |
| MQTT push | MEDIUM | HIGH | P2 |
| DP override config | MEDIUM | MEDIUM | P2 |
| Scenes / lights / covers | MEDIUM | HIGH | P3 |
| Local/BLE control | LOW (here) | HIGH | P3 (out of scope) |

## Competitor Feature Analysis

| Feature | `homebridge-tuya-web` (abandoned) | `0x5e/homebridge-tuya-platform` | Our Approach |
|---------|-----------------------------------|---------------------------------|--------------|
| Auth | Cloud via Tuya-web/sharing-style | **Dev-project API** (Access ID/Secret + app schema `tuyaSmart`/`smartlife`) | **Device-sharing QR / user code — no dev account** (the differentiator) |
| Device coverage | switch/outlet/light/dimmer/fan/cover/scene | 60+ categories (lights, switches, sensors, cameras, locks, IR) | v1: switches/outlets + climate/sensors only; "cover my devices well" |
| Status updates | polling | polling + push | polling v1, MQTT-over-WS push v1.x |
| Scenes | yes | Tap-to-Run | deferred (anti-feature for v1) |
| DP overrides | limited | per-device override for non-standard DPs | deferred to v1.x |
| Config UI | basic | app schema, home whitelist, debug | QR trigger, region, home whitelist, debug |
| Maintenance | abandoned | maintained (but dev-account path) | maintained, TDD + CI |

## Sources

- `home-assistant/core` tuya integration — `switch.py`, `climate.py`, `sensor.py`, `binary_sensor.py`, `const.py` (dev branch) and `base.py` `IntegerTypeData` (tag 2024.6.0, verified scale formula) — HIGH
- [tuya/tuya-device-sharing-sdk](https://github.com/tuya/tuya-device-sharing-sdk) — `SharingMQ`, `SharingDeviceListener`, MQTT-over-WebSocket push, MIT — HIGH
- [Home Assistant Tuya integration docs](https://www.home-assistant.io/integrations/tuya/) — Cloud Push IoT class — HIGH
- [HA core PR #57757 "Move Tuya value scaling into IntegerTypeData"](https://github.com/home-assistant/core/pull/57757) — scaling design — HIGH
- [0x5e/homebridge-tuya-platform](https://github.com/0x5e/homebridge-tuya-platform) + SUPPORTED_DEVICES.md — competitor features, dev-project auth — MEDIUM
- [Tuya Message Service / Pulsar docs](https://developer.tuya.com/en/docs/iot/subscribe?id=Ka6ckg3htyo94) — Pulsar is the dev-project path (contrast) — MEDIUM

---
*Feature research for: Tuya/Smart Life → HomeKit Homebridge plugin (cloud-only, device-sharing auth)*
*Researched: 2026-06-24*
