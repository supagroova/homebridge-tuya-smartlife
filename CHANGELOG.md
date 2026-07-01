# Changelog

## 1.0.1 - 2026-07-01

Homebridge verification metadata patch.

- Added npm package metadata required by the Homebridge review bot.
- Removed `homebridge` from peer dependencies; it remains a development dependency only.
- Fixed `config.schema.json` to use object-level JSON Schema `required`.

## 1.0.0 - 2026-07-01

Initial public release.

- Added Smart Life user-code and QR-code login through the Homebridge custom plugin UI.
- Added Tuya cloud device discovery without requiring each user to create a Tuya developer account.
- Added HomeKit support for switches, outlets, temperature/humidity sensors, basic binary sensors, and thermostats.
- Added polling-based status refresh and offline handling.
- Added strict TDD gates, CI, release checks, and package asset validation.
- Known limitations: cloud-only connectivity, polling-only updates, and v1 support focused on switches, thermometers/sensors, outlets, and thermostats.
