# Requirements: homebridge-tuya-smartlife

**Defined:** 2026-06-24
**Core Value:** A user can control their Tuya devices in HomeKit after a simple Smart Life QR login — no per-user Tuya developer account.

## v1 Requirements

Requirements for the initial release. Each maps to roadmap phases.

### Foundation & Quality

- [x] **FND-01**: Repo is scaffolded as a TypeScript Homebridge dynamic platform plugin (npm, `tsc` → `dist/`, correct `package.json` engines/keywords)
- [x] **FND-02**: Strict TDD enforced by repo hooks — test-first write guard, typecheck/lint/format on edit, 85% coverage Stop gate, `tdd-audit` + `tdd-debt.txt` allowlist, `npm ci` lockfile guard
- [x] **FND-03**: GitHub Actions CI runs the full gate (lint + typecheck + tdd-audit + tests) on a Node version matrix for every PR/push
- [x] **FND-04**: `/ship` workflow verifies (`make check`) → commits → pushes

### Authentication

- [ ] **AUTH-01**: User completes Smart Life login via User Code + QR scan (no developer account)
- [ ] **AUTH-02**: Plugin authenticates through the Smart Life QR device-sharing path using the Tuya-published HA-compatible `client_id`/`schema` for development; Homebridge-specific credentials remain a release-hardening follow-up
- [ ] **AUTH-03**: Auth tokens persist across Homebridge restarts (no QR re-scan on reboot)
- [ ] **AUTH-04**: Tokens auto-refresh proactively before expiry; clear re-auth surfaced when refresh fails
- [ ] **AUTH-05**: Signed-request transport (HMAC + AES-GCM `encdata`) ported correctly, locked by golden-vector tests

### Device Discovery

- [ ] **DISC-01**: Plugin discovers the user's Tuya devices from the cloud (homes → devices → category + status set)
- [ ] **DISC-02**: Accessories use stable UUIDs (from Tuya device id); restored from cache without duplicates
- [ ] **DISC-03**: Devices removed from the Tuya account are pruned from HomeKit
- [ ] **DISC-04**: Optional home/device whitelist via config

### Switches & Outlets

- [ ] **SW-01**: User can turn switches/outlets on and off from HomeKit
- [ ] **SW-02**: Multi-gang devices expose each gang as its own HomeKit service
- [ ] **SW-03**: Outlets vs plain switches are mapped to the appropriate HomeKit service type

### Climate & Sensors

- [ ] **CLIM-01**: User can view temperature/humidity sensor readings in HomeKit (correctly scaled)
- [ ] **CLIM-02**: Contact, motion, leak, and smoke sensors report state in HomeKit
- [ ] **CLIM-03**: User can read and set thermostat state (target temp within DP-spec range/step; mode)
- [ ] **CLIM-04**: Battery level / low-battery reported where the device provides it

### Status & Reliability

- [ ] **UPD-01**: Device state stays current via polling (configurable interval, with jitter/backoff)
- [ ] **UPD-02**: `onGet` returns cached state immediately and never blocks on the network
- [ ] **UPD-03**: Offline devices report "No Response" in HomeKit rather than stale/false state

### Configuration

- [x] **CFG-01**: Config-UI schema (region/endpoint, whitelist, debug toggle) for setup without editing JSON
- [x] **CFG-02**: Custom config-UI screen renders the login QR, polls for scan completion, and shows friendly error messages

### Distribution

- [x] **PUB-01**: Published to npm following Homebridge conventions (`homebridge-plugin` keyword, discoverable)
- [x] **PUB-02**: README documents setup (QR login), supported devices, and known limitations

## v1.0 Release Requirements

Release-hardening requirements for the public `1.0.0` npm release.

### Logging & Security

- [x] **REL-01**: Verbose Tuya QR/auth diagnostic logging is gated behind the existing `debug` config flag; default logs remain quiet.
- [x] **REL-02**: Sensitive values are never logged, including Smart Life user codes, QR tokens, access tokens, refresh tokens, token JSON, raw encrypted payloads, encrypted request data, and request signatures.

### Packaging & Documentation

- [x] **REL-03**: Release hardening verifies package metadata, license, package contents, Homebridge discovery fields, npm install behavior, and CI/publish workflow readiness.
- [x] **REL-04**: Package version is set to `1.0.0`.
- [x] **REL-05**: `CHANGELOG.md` exists and documents the initial v1.0.0 release.
- [x] **REL-06**: README includes npm version/download badges; the Homebridge verified badge is added only once Homebridge verification is granted.

### Publication & Smoke Test

- [x] **REL-07**: `homebridge-tuya-smartlife@1.0.0` is published to npm with the configured release process and verified on the npm package page.
- [x] **REL-08**: A post-publish Homebridge smoke test installs from npm, confirms plugin discovery, completes QR login, and verifies the user's switches/thermometers appear in HomeKit.

## v2 Requirements

Deferred to a future release. Tracked but not in the current roadmap.

### Real-time & Expanded Devices

- **UPD-04**: MQTT-over-WebSocket real-time push (lower latency than polling)
- **DEVX-01**: Lights / dimmers / covers / fans support
- **SCENE-01**: Tuya scenes / tap-to-run
- **CFG-03**: Per-device DP override config (patch quirky devices without a release)
- **UPD-05**: Optimistic writes with reconcile-on-failure

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Local LAN control (Tuya Wi-Fi protocol) | Author's devices are BT/gateway-bridged; Homebridge host is remote with no BT |
| Local BLE control | Host cannot reach devices over Bluetooth |
| Developer-project API (Access ID/Secret) as the *primary* path | The exact friction (per-user account, 6-month renewals) this project exists to avoid — retained only as a Phase 0 fallback |
| Treating the Tuya-published HA-compatible `client_id`/`schema` as permanently settled for a broad public/verified release | Revocation / permission risk remains; revisit with Tuya for Homebridge-specific credentials or explicit blessing before broad release |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Complete |
| FND-02 | Phase 1 | Complete |
| FND-03 | Phase 1 | Complete |
| FND-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| DISC-01 | Phase 3 | Pending |
| DISC-02 | Phase 3 | Pending |
| DISC-03 | Phase 3 | Pending |
| DISC-04 | Phase 3 | Pending |
| SW-01 | Phase 4 | Pending |
| SW-02 | Phase 4 | Pending |
| SW-03 | Phase 4 | Pending |
| CLIM-01 | Phase 5 | Pending |
| CLIM-02 | Phase 5 | Pending |
| CLIM-03 | Phase 5 | Pending |
| CLIM-04 | Phase 5 | Pending |
| UPD-01 | Phase 6 | Pending |
| UPD-02 | Phase 6 | Pending |
| UPD-03 | Phase 6 | Pending |
| PUB-01 | Phase 8 | Complete |
| CFG-01 | Phase 7 | Complete |
| CFG-02 | Phase 7 | Complete |
| PUB-02 | Phase 7 | Complete |
| REL-01 | Phase 8 | Complete |
| REL-02 | Phase 8 | Complete |
| REL-03 | Phase 8 | Complete |
| REL-04 | Phase 8 | Complete |
| REL-05 | Phase 8 | Complete |
| REL-06 | Phase 8 | Complete |
| REL-07 | Phase 8 | Complete |
| REL-08 | Phase 8 | Complete |

**Coverage:**

- v1 requirements: 27 total
- v1.0 release requirements: 8 total
- Mapped to phases: 35 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-06-24*
*Last updated: 2026-07-01 when planning the v1.0 release milestone*
