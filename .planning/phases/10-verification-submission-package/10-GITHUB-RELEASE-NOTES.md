# v1.0.0

Initial public release of `homebridge-tuya-smartlife`.

## Highlights

- Smart Life user-code and QR-code login through the Homebridge custom plugin UI.
- Tuya cloud device discovery without requiring each user to create a Tuya developer account.
- HomeKit support for switches, outlets, temperature/humidity sensors, basic binary sensors, and thermostats.
- Polling-based status refresh and offline handling.
- Strict TDD gates, CI, release checks, and package asset validation.

## Known Limitations

- Cloud-only connectivity; local LAN and BLE control are intentionally out of scope.
- Polling-only updates; MQTT push updates are deferred.
- v1 support is focused on switches, thermometers/sensors, outlets, and thermostats.
- A Homebridge-specific Tuya client id/schema should be revisited before broader public/verified-plugin release if reviewers require it.
