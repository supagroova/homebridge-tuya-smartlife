# Roadmap: homebridge-tuya-smartlife

## Overview

This v1.0 milestone builds a maintained Homebridge plugin that brings Tuya / Smart Life
devices into Apple HomeKit via the Smart Life QR "device-sharing" login — no per-user Tuya
developer account. The journey starts by standing up the TypeScript plugin skeleton and a strict
TDD enforcement harness (Phase 1), then immediately resolves the existential credential/auth
question by porting the device-sharing signing/crypto from the Python SDK and proving a QR login
end-to-end (Phase 2). With a working signed client, the build follows the research's unambiguous
dependency order: device discovery + platform skeleton (Phase 3) → switches/outlets + the reusable
mapping engine (Phase 4) → climate & sensors, the author's actual devices (Phase 5) → status
polling + offline handling, which is the MVP ship point with the first npm publish (Phase 6) →
the config-UI and custom QR setup screen plus README (Phase 7). Real-time MQTT push and
lights/covers/scenes are explicitly deferred to v2.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Project Scaffolding & TDD Gates** - TypeScript Homebridge plugin skeleton + TDD enforcement harness + CI + `/ship` (completed 2026-06-24)
- [ ] **Phase 2: Auth Protocol Port + Credential Feasibility** - Port device-sharing signing/crypto, prove QR login end-to-end, resolve legitimate credential
- [ ] **Phase 3: Device Discovery + Platform Skeleton** - Discover Tuya devices, expose to HomeKit with stable UUIDs, cache/register/prune lifecycle
- [ ] **Phase 4: Switches & Outlets + Mapping Engine** - On/off control incl. multi-gang, plus the reusable DP→HomeKit mapping/scaling engine
- [ ] **Phase 5: Climate & Sensors** - Temp/humidity, binary sensors, thermostat control, battery reporting
- [ ] **Phase 6: Status Polling + Offline Handling (MVP Ship)** - Polling keeps state current, offline devices show "No Response", first npm publish
- [ ] **Phase 7: Config-UI + QR Setup Screen** - Config schema + custom QR login UI + README documentation

## Phase Details

### Phase 1: Project Scaffolding & TDD Gates

**Goal**: Stand up the TypeScript Homebridge dynamic-platform plugin skeleton and the full TDD enforcement harness so every subsequent phase is quality-gated.
**Mode:** standard
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04
**Success Criteria** (what must be TRUE):

  1. `npm run build` compiles the TypeScript skeleton to `dist/`, and `package.json` declares the correct Homebridge engines, `peerDependencies`, and `homebridge-plugin` keyword.
  2. The TDD harness blocks writing implementation code without a failing test first, runs typecheck/lint/format on edit, and the Stop gate fails the run below 85% coverage.
  3. `tdd-audit` flags untested non-exempt files, the `tdd-debt.txt` allowlist is honoured, and an `npm ci` lockfile guard fails on an out-of-sync lockfile.
  4. GitHub Actions runs the full gate (lint + typecheck + tdd-audit + tests) on a Node version matrix for every PR/push, passing green.
  5. The `/ship` workflow runs `make check`, then commits and pushes only when the gate passes.

**Plans**: 3/3 plans complete

Plans:

- [x] 01-01-PLAN.md — npm + TS Homebridge dynamic-platform skeleton, build, lint/format, config schema (FND-01)
- [x] 01-02-PLAN.md — TDD harness: Jest 85% coverage, 5 hook scripts, settings.json wiring, tdd-debt allowlist, lockfile guard, Makefile check (FND-02)
- [x] 01-03-PLAN.md — GitHub Actions Node-matrix CI + publish-on-tag, and the /ship verify→commit→push skill (FND-03, FND-04)

> **Note:** This phase bootstraps the TDD gates, so it is itself exempt from the test-first rule it establishes. No domain code is written here.

### Phase 2: Auth Protocol Port + Credential Feasibility

**Goal**: Resolve the existential credential question and port the device-sharing auth so the plugin can complete a Smart Life QR login with its own legitimate, signed, persisted session — before any device work begins.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):

  1. A user completes a Smart Life login by entering a user code and scanning the rendered QR, with no developer account, and receives a working token.
  2. `crypto.ts` reproduces the Python SDK's HMAC + AES-GCM `encdata` signing byte-for-byte, locked by golden-vector unit tests over known SDK inputs/outputs.
  3. The plugin authenticates with its own legitimately-issued `client_id`/`schema` (never Home Assistant's), or — if partner access dead-ends — the fallback developer-project API path is selected and documented.
  4. Auth tokens persist across a Homebridge restart (no QR re-scan on reboot) and refresh proactively before expiry, with a single in-flight refresh guard and a clear re-auth surfaced when refresh fails.

**Plans**: TBD

Plans:

- [ ] 02-01: TBD

> **Risk:** The credential path is the project-defining unknown. Home Assistant's credential is used ONLY as a throwaway probe to prove the port works — it is never shipped. If the credential path dead-ends, the fallback pivots **auth only** (developer-project API); the Phase 1 scaffolding and TDD harness are reused regardless, so the pivot does not cascade into the rest of the roadmap.

### Phase 3: Device Discovery + Platform Skeleton

**Goal**: Discover the user's Tuya devices from the cloud and expose them to HomeKit as stable, deduplicated accessories with a correct cache/register/prune lifecycle.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04
**Success Criteria** (what must be TRUE):

  1. On launch the plugin walks homes → devices and lists each device's category and status set retrieved from the cloud.
  2. Each accessory uses a stable UUID derived from its Tuya device id and is restored from cache on restart without creating duplicates.
  3. A device removed from the Tuya account is pruned from HomeKit on the next discovery.
  4. An optional home/device whitelist in config limits which devices are exposed.

**Plans**: TBD

Plans:

- [ ] 03-01: TBD

### Phase 4: Switches & Outlets + Mapping Engine

**Goal**: Deliver on/off control for switches and outlets (including multi-gang) and, in doing so, build the reusable DP→HomeKit mapping engine and value-scaling primitive that every later category depends on.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: SW-01, SW-02, SW-03
**Success Criteria** (what must be TRUE):

  1. A switch or outlet toggled in the Home app turns the physical device on/off, and a change made elsewhere is reflected in HomeKit.
  2. A multi-gang device exposes each gang (`switch_N` DP) as its own HomeKit service that is independently controllable.
  3. Outlets are mapped to the HomeKit Outlet service and plain switches to the Switch service, based on Tuya category.

**Plans**: TBD

Plans:

- [ ] 04-01: TBD

### Phase 5: Climate & Sensors

**Goal**: Support the author's actual v1 devices — temperature/humidity and binary sensors plus thermostat control — reusing the mapping engine from Phase 4 with correct scaling and characteristic constraints.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: CLIM-01, CLIM-02, CLIM-03, CLIM-04
**Success Criteria** (what must be TRUE):

  1. Temperature and humidity readings appear in HomeKit correctly scaled (`raw / 10**scale`).
  2. Contact, motion, leak, and smoke sensors report their open/closed/triggered state in HomeKit.
  3. A thermostat's current and target state can be read and set, with target temperature clamped to the DP-spec range/step and mode mapped to the HAP state.
  4. Battery level and low-battery status are reported for devices that provide them.

**Plans**: TBD

Plans:

- [ ] 05-01: TBD

### Phase 6: Status Polling + Offline Handling (MVP Ship)

**Goal**: Keep device state current via resilient polling and handle offline devices honestly, completing the minimum viable plugin and publishing it to npm.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: UPD-01, UPD-02, UPD-03, PUB-01
**Success Criteria** (what must be TRUE):

  1. A change made on a physical device is reflected in HomeKit within the configurable poll interval, and polling applies jitter/backoff to avoid thundering-herd and rate-limit issues.
  2. `onGet` returns cached state immediately and never blocks on a network round-trip.
  3. An offline device (`online == false`) reports "No Response" in HomeKit instead of stale or false state.
  4. The plugin is published to npm following Homebridge conventions (`homebridge-plugin` keyword) and is installable/discoverable.

**Plans**: TBD

Plans:

- [ ] 06-01: TBD

> **Note:** This is the MVP ship point. MQTT real-time push is not a blocker for the first release; it is deferred to v2.

### Phase 7: Config-UI + QR Setup Screen

**Goal**: Let end users set up and complete QR login through a GUI without editing JSON, and document the plugin for adoption.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: CFG-01, CFG-02, PUB-02
**Success Criteria** (what must be TRUE):

  1. A config-UI schema lets users set region/endpoint, home/device whitelist, and a debug toggle without hand-editing JSON.
  2. A custom config-UI screen renders the login QR, polls for scan completion, and shows friendly messages for known errors (e.g. `E0020003`, "designated APP", region issues).
  3. The README documents QR-login setup, the supported device set, and known limitations.

**Plans**: TBD
**UI hint**: yes

Plans:

- [ ] 07-01: TBD

## Future / v2

Explicitly out of scope for this v1.0 milestone; tracked for a future release:

- **UPD-04**: MQTT-over-WebSocket real-time push (lower latency than polling) — feeds the same `UpdateHub` interface, so it is additive, not a rewrite.
- **DEVX-01**: Lights / dimmers / covers / fans support.
- **SCENE-01**: Tuya scenes / tap-to-run.
- **CFG-03**: Per-device DP override config.
- **UPD-05**: Optimistic writes with reconcile-on-failure.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Scaffolding & TDD Gates | 3/3 | Complete    | 2026-06-24 |
| 2. Auth Protocol Port + Credential Feasibility | 0/TBD | Not started | - |
| 3. Device Discovery + Platform Skeleton | 0/TBD | Not started | - |
| 4. Switches & Outlets + Mapping Engine | 0/TBD | Not started | - |
| 5. Climate & Sensors | 0/TBD | Not started | - |
| 6. Status Polling + Offline Handling (MVP Ship) | 0/TBD | Not started | - |
| 7. Config-UI + QR Setup Screen | 0/TBD | Not started | - |
