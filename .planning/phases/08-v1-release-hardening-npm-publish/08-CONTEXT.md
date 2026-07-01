# Phase 8 Context: v1.0 Release Hardening & npm Publish

## Goal

Prepare and publish `homebridge-tuya-smartlife@1.0.0` after real Homebridge testing confirmed:

- Smart Life QR login works from the Homebridge custom UI.
- Devices are discovered and appear in the Home app.
- The first public release still needs logging, packaging, documentation, and publication hardening.

## Scope

- Gate Tuya QR/auth diagnostics behind the existing `debug` config flag.
- Audit and test that logs never expose user codes, QR tokens, access/refresh tokens, token JSON, raw encrypted payloads, encrypted request data, or signatures.
- Set package version to `1.0.0`.
- Add `CHANGELOG.md`.
- Add npm README badges immediately.
- Add the Homebridge verified badge only after verification is granted.
- Publish to npm using the configured release process.
- Smoke-test install from npm on the remote Homebridge server.

## Non-Goals

- No new device categories.
- No MQTT push.
- No Tuya local/LAN/BLE control.
- No Homebridge-specific Tuya client id/schema work in this phase unless Tuya provides one before publish.

## Release Safety

Actual npm publish is an explicit external action. The executor must verify auth, package contents, CI state, version, and user intent before publishing.
