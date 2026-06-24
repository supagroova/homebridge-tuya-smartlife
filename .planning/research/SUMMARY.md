# Project Research Summary

**Project:** homebridge-tuya-smartlife
**Domain:** TypeScript Homebridge dynamic-platform plugin — Tuya/Smart Life cloud via QR device-sharing auth
**Researched:** 2026-06-24
**Confidence:** MEDIUM (stack/architecture/features HIGH; partner-gating verdict MEDIUM — the single biggest unknown)

## Executive Summary

This project ports the Home Assistant Tuya integration's device-sharing (QR login) flow to a TypeScript Homebridge plugin, replacing the abandoned `homebridge-tuya-web`. The defining technical challenge is that **no Node library implements this flow** — the signing scheme, AES-GCM payload encryption, and QR token polling must all be built from scratch by porting the Python `tuya-device-sharing-sdk`. The core architecture is well-understood: a Homebridge dynamic platform plugin that exposes Tuya switches/outlets and climate/sensors via a hand-built signed HTTP client, polling-first status updates (with MQTT push as a v1.x enhancement), and per-category DP→HomeKit mappers. The TypeScript stack is conventional for 2026: Node 22 LTS, Homebridge 2.x, TypeScript ~5.9, Jest 30 + ts-jest, nock for HTTP mocking. The build sequence is clearly dependency-ordered — crypto primitives → auth client → device repository → mappers → accessories → platform glue → polling → (later) MQTT push.

The project-defining risk is **Tuya partner gating of the QR flow**. Home Assistant's baked-in `client_id = "HA_3y9q4ak7g4ephrvke"` / `schema = "haauthorize"` was issued to HA as a registered partner — not a public credential. A new plugin cannot legally or safely ship by reusing it. There is no confirmed public self-serve path for a hobby OSS plugin to obtain its own equivalent credential; the only documented self-serve alternative (Tuya "Device Data Sharing") is EU-only, enterprise-verified, and paid. This question must be resolved before committing to the full architecture. As a throwaway spike, using HA's credential proves the TS port works, but it cannot ship.

The recommended mitigation is a **Phase 0 feasibility spike** that (a) contacts Tuya about partner registration and (b) proves the TS auth port completes a QR login end-to-end with a disposable credential. Only after the credential question is answered should device discovery and accessory layers be built. If partner registration fails, the credible fallback is the developer-project API (Access ID + Secret), which is the well-documented, self-serve path the project otherwise wants to avoid. Everything downstream of auth — discovery, mapping, accessories — is well-understood and low-risk once the credential question is settled.

---

## Key Findings

### Recommended Stack

The stack is straightforward for a 2026 Homebridge plugin. Use **TypeScript ~5.9** (not 6.x — the toolchain is not validated against it yet), **Node 22 LTS** (Homebridge 2.x requires `^22 || ^24`), and **Homebridge `^2.0.0`** declared as a peer dependency. For tests: **Jest 30 + ts-jest 29.4** (type-checking in tests is critical for a crypto port where wrong types silently produce invalid signatures) and **nock 14** for HTTP interception (now supports native `fetch`, removing the historical msw advantage). The crypto and HTTP surface uses only **`node:crypto`** and the **global `fetch`** — no axios, no crypto-js. Runtime dependencies are minimal: `mqtt ^5` (MQTT.js for real-time push), `qrcode ^1.5` (render the login QR in config-UI), and `@homebridge/plugin-ui-utils ^2` (interactive custom UI for QR setup). Ship as plain `tsc`-compiled CommonJS to `dist/` — no bundler.

**Core technologies:**
- **TypeScript ~5.9 + Node 22**: language/runtime — Homebridge 2.x requires Node 22/24; ts-jest validates types during tests (critical for crypto porting correctness)
- **Jest 30 + ts-jest 29.4 + nock 14**: test/mock — type-checked tests; nock intercepts native fetch and lets you assert on `X-sign`/`X-time` headers
- **`node:crypto` + global `fetch`**: HTTP/crypto — covers 100% of the Python SDK's surface with no extra dependencies
- **mqtt ^5**: real-time push — MQTT.js is the Node equivalent of paho-mqtt
- **qrcode + @homebridge/plugin-ui-utils**: QR onboarding — interactive custom UI is required because QR login cannot be a static config form
- **eslint ^9 (flat config) + typescript-eslint ^8 + prettier ^3.8**: lint/format — the validated combination for mid-2026; ESLint 10 is too new

### Expected Features

The v1 feature set is tightly scoped to the author's actual devices and the frictionless-onboarding core value. Everything requires auth — auth is the critical path.

**Must have (table stakes):**
- **Smart Life QR / user-code login** — the entire point; nothing works without it; gated by the credential open question
- **Token persistence + auto-refresh across restarts** — HomeKit must keep working after Homebridge reboots without re-scanning QR
- **Device discovery** (homes → devices → category + status set) — a plugin that finds nothing is useless
- **Category→HomeKit mapping engine + value scaling** — `scaled = raw / (10 ** scale)` for all integer DPs; correctness foundation
- **Switches/outlets on/off incl. multi-gang** (`kg`, `cz`, `pc`, `tdq` categories; each `switch_N` DP → its own HomeKit service)
- **Climate & sensors** (`wk` thermostat, `wsdcg` temp/humidity, `mcs` contact, `pir` motion, `sj` leak, `ywbj` smoke)
- **Status polling + offline handling** — `online` flag → "No Response" not crash; polling baseline before push
- **Accessory caching** (stable UUID from Tuya device id; restore without duplicates; prune removed devices)
- **Config-UI schema** (QR trigger, region/endpoint, home whitelist, debug toggle)

**Should have (v1.x differentiators):**
- **MQTT-over-WebSocket real-time push** (`SharingMQ` port) — ~1s latency vs poll interval; add after polling is stable
- **Per-device DP override config** — lets users patch quirky devices without a plugin release
- **Optimistic-write + reconcile polish** — snappy UI with revert on command failure

**Defer (v2+):**
- Lights / dimmers / covers / fans — large mapping surface; not the author's devices
- Tuya Scenes / Tap-to-Run — separate API; ambiguous HomeKit semantics
- Local LAN / BLE control — physically impossible for this deployment

**Key device→HomeKit mapping decisions (v1):**
- Each `switch_N` DP → its own HomeKit `Switch` or `Outlet` service (not one service per device)
- Temperature DPs always apply `/(10**scale)` scaling; min/max/step for `TargetTemperature` come from the DP spec
- Binary sensors compare status value to a per-category `on_value` (bool/string/set); no command writes
- Ship polling v1; MQTT push uses the same `UpdateHub` event interface so it is additive, not a rewrite

### Architecture Approach

The plugin follows the standard Homebridge dynamic platform pattern, layered over a hand-built Tuya cloud client. The key structural insight from the Python SDK is the separation of concerns: `QrLoginFlow` (setup-time auth only) → `TokenManager` (persist/refresh) → `TuyaDeviceSharingClient` (every-request signing + AES-GCM) → `DeviceRepository` (domain API) → `UpdateHub` (push/poll abstraction) → `CategoryMappers` (pure functions) → `AccessoryHandlers` (HomeKit binding). The `crypto.ts` module is pure and dependency-free — the highest-value early test surface. `onGet` always returns cached status (never blocks on network); `UpdateHub` events drive `updateCharacteristic` calls asynchronously.

**Major components:**
1. **`auth/` (QrLoginFlow + TokenManager + tokenStore)** — QR token request/poll, token persistence to HB storage, proactive refresh before expiry; isolates the highest-risk module
2. **`cloud/` (TuyaDeviceSharingClient + crypto.ts + DeviceRepository)** — per-request AES-GCM signing (`rid` → `md5(rid+refresh_token)` → `HMAC_SHA256(rid, hash_key)[0:16]` AES key; `X-sign` over `K=V||` headers + encdata); all domain API endpoints
3. **`updates/` (UpdateHub + mqttClient + poller)** — single event source for accessories; polling first, MQTT push additive
4. **`mappers/` (registry + per-category pure functions)** — Tuya status ↔ HomeKit characteristic translation; independently testable; the one place that grows with device categories
5. **`accessories/` (baseAccessory + per-type handlers)** — binds HAP services; wires `onGet`/`onSet`; Homebridge-glue layer (TDD-exempt as needed)
6. **TuyaPlatform** — composition root; `configureAccessory` restores cache only; `discoverDevices` on `didFinishLaunching` registers new + prunes removed

### Critical Pitfalls

1. **Partner gating — no legitimate `client_id`/`schema`** — Reusing HA's credential is not shippable (ToS violation; mass-revocation risk if Tuya rotates it). Make the credential a single named constant so swapping it is a one-line change. Resolve in Phase 0 before any dependent work.

2. **Wrong signing scheme** — The device-sharing flow uses an entirely different scheme from the public developer API HMAC. HMAC key = `md5(rid + refresh_token)` (not client secret); payloads AES-GCM encrypted into `encdata`; sign string is `K=V||` header pairs + encdata (no HTTP method, no URL, no body SHA256). Port byte-for-byte from `customerapi.py`; pin with golden-vector unit tests.

3. **Token-refresh fragility ("sign invalid")** — Proactive refresh at ~80% of `expire_time`; single in-flight guard to prevent concurrent refreshes; treat `sign invalid` on a previously-working session as a clock-skew or canonicalisation bug. Verify 24h+ unattended session survives.

4. **Blocking `onGet` on a cloud round-trip** — HomeKit times out (~10s) → "No Response". Always return cached `device.status` from `onGet`; keep cache fresh via UpdateHub asynchronously.

5. **UUID instability** — Derive `UUID = api.hap.uuid.generate(device.id)` (immutable Tuya device id). Restore cache → register new → prune removed; never re-register cached accessories.

6. **BT-gateway offline handling** — `online == false` → throw `SERVICE_COMMUNICATION_FAILURE`; never report stale-as-live. Author's BT-bridged devices are the primary use case.

7. **HAP characteristic constraints** — Scale and clamp Tuya integers before `updateCharacteristic`. Set `minValue`/`maxValue`/`minStep` from the DP spec. Test boundary and out-of-range values.

---

## Implications for Roadmap

Based on research, the dependency order is unambiguous: credential/auth → discovery → mapping → accessories → polling → (optional) push. Phase 1 (TDD scaffolding) is already decided per PROJECT.md. Everything else flows from there.

### Phase 0: Feasibility Spike — Credential + Auth Protocol
**Rationale:** The credential question is existential. If Tuya will not issue an independent `client_id`/`schema`, the whole architecture pivots. This must be proven before any dependent work starts. Use HA's credential only as a throwaway probe — never as a shippable artifact.
**Delivers:** (a) documented credential decision (partner registration path, EU path B, or dev-project API fallback); (b) working TS QR login end-to-end (user code → QR render → scan → token received) proving the signing/crypto port is correct; (c) golden-vector unit tests for `crypto.ts` locked to known SDK outputs
**Addresses:** Pitfall #1 (partner gating), Pitfall #2 (signing), Pitfall #3 (clock skew)
**Must resolve before:** everything else

### Phase 1: TDD Scaffolding + Project Foundation
**Rationale:** Already decided in PROJECT.md. Standard Homebridge plugin skeleton + TDD enforcement harness. No domain code — this is the harness that enforces quality on all subsequent work.
**Delivers:** TypeScript project scaffold from `homebridge/homebridge-plugin-template`; Jest 30 + ts-jest config; 85% coverage gate; ESLint/Prettier; GitHub Actions CI matrix (Node 22/24); `package.json` with correct Homebridge conventions (`homebridge-plugin` keyword, `peerDependencies`, engines)
**Note:** Phase 0 can run concurrently; the spike's `crypto.ts` module can land here.

### Phase 2: Auth Client + Signed HTTP Transport
**Rationale:** Auth is the critical path; everything downstream requires a working signed client.
**Delivers:** `cloud/crypto.ts` (md5, HMAC-SHA256, AES-GCM encrypt/decrypt, restfulSign — pure, all golden-vector tested); `TuyaDeviceSharingClient` (rid/hash_key/secret/encdata/X-sign/response-decrypt); `auth/qrLoginFlow.ts` (QR token request, render, poll); `auth/tokenManager.ts` (persist to storagePath, proactive refresh, in-flight guard, re-auth surfacing); `auth/tokenStore.ts`
**Uses:** `node:crypto`, `fetch`, nock (test mocking), credential resolved in Phase 0
**Avoids:** Pitfall #2 (signing via golden vectors); Pitfall #3 (clock skew + diagnostic); Pitfall #4 (QR expiry auto-regenerate)

### Phase 3: Device Discovery + Platform Skeleton
**Rationale:** Discovery is the first phase that requires a running Homebridge instance alongside the cloud client. Establishing stable UUIDs and the cache/register/prune lifecycle here prevents painful accessory-churn later.
**Delivers:** `cloud/deviceRepository.ts` (homes/devices/specifications/commands API); `DeviceManager` (in-memory device_map, listener routing); `platform.ts` skeleton (restore-only `configureAccessory`; register/prune `discoverDevices` on `didFinishLaunching`; stable UUID from device id)
**Avoids:** Pitfall #5 (endpoint mismatch — use login-returned endpoint); Pitfall #6 (BT-gateway online flag); Pitfall #9 (UUID instability)

### Phase 4: Switches, Outlets + Mapping Engine
**Rationale:** Switches/outlets are the simplest category — ideal for proving the full accessory stack (mapper → handler → HAP service → HomeKit) before tackling climate/sensors. The mapping engine and value-scaling primitive built here are reused by every subsequent category.
**Delivers:** `mappers/registry.ts` + `mappers/switch.ts` + `mappers/outlet.ts` (categories `kg`/`cz`/`pc`/`tdq`; each `switch_N` DP → its own HomeKit service); `IntegerTypeData` scaling primitive (`raw / (10 ** scale)`); `accessories/switchAccessory.ts` + `accessories/baseAccessory.ts`; multi-gang support
**Avoids:** Pitfall #7 (multi-gang — per-DP services); Pitfall #8 (HAP constraints — range/step from DP spec)

### Phase 5: Climate + Sensors
**Rationale:** The author's actual v1 devices. More complex than switches (temperature scaling, mode enums, multiple characteristics) but the engine from Phase 4 handles the heavy lifting. Read-only sensors are low effort; thermostat control is higher.
**Delivers:** `mappers/climate.ts` (`wk`/`kt`/`qn`/`rs`; Thermostat/HeaterCooler services; mode enum → HAP state; temp scaling with min/max/step from DP spec); `mappers/sensor.ts` (`wsdcg` temp/humidity, `mcs` contact, `pir` motion, `sj` leak, `ywbj` smoke; `on_value` pattern; battery characteristics); corresponding accessory handlers
**Avoids:** Pitfall #8 (HAP constraints — thermostat setpoint range/step); Pitfall #6 (BT-gateway offline for sensor clusters)

### Phase 6: Status Polling + Offline Handling (MVP Ship Boundary)
**Rationale:** A polling `UpdateHub` and correct offline handling complete the minimum viable plugin. After this phase the plugin is shippable.
**Delivers:** `updates/poller.ts` (interval status fetch + diff → `updateCharacteristic`; jitter to avoid thundering herd; backoff on throttle); offline device handling (`online == false` → throw `SERVICE_COMMUNICATION_FAILURE`); startup authoritative status fetch; `UpdateHub` orchestrator wiring push + poll to a single event interface; npm publish workflow
**Avoids:** Pitfall #6 (offline/"No Response"); Pitfall #10 (rate limits — conservative interval + jitter)
**Note:** This is the MVP ship point. MQTT push is not a blocker for the first release.

### Phase 7: Config-UI + QR Setup Screen
**Rationale:** End users need a GUI to complete QR login without editing JSON. Can ship concurrently with or just after Phase 6.
**Delivers:** `config.schema.json` (region dropdown, home whitelist, debug toggle); `homebridge-ui/` custom UI (QR render via `qrcode`, poll for scan completion, friendly error messages for `E0020003` / "designated APP" / region issues)
**Avoids:** Pitfall #4 (QR expiry UX — auto-regenerate prompt); UX pitfalls (raw error codes; no app-variant guidance)

### Phase 8: MQTT Real-Time Push (v1.x)
**Rationale:** Latency/CPU optimization once polling is proven stable. Feeds the same `UpdateHub` interface — accessories need no changes.
**Delivers:** `updates/mqttClient.ts` (`SharingMQ` port: broker creds from `POST /v1.0/m/life/ha/access/config`; TLS MQTT subscribe; protocol 4 device status / protocol 20 lifecycle events; `expireTime - 60s` reconnect schedule; exponential backoff on disconnect)
**Implements:** `updates/updateHub.ts` push path (polling becomes safety net)
**Research flag:** Needs deeper research during planning — MQTT payload AES-GCM decryption detail, broker credential refresh lifecycle, and `support_local` routing for BT-gateway devices are MEDIUM-confidence; re-read `mq.py` + `manager.py` before planning this phase.

### Phase Ordering Rationale

- **Phase 0 before everything** — the credential question is existential; discovering it is blocked after building the full stack forces a full architectural pivot under time pressure
- **Crypto/auth before discovery** — every cloud call is signed; discovery cannot be tested without a working client
- **Switches before climate/sensors** — proves the full stack (mapper → handler → HAP) with the simplest category before the more complex ones
- **Polling before MQTT push** — simpler, de-risks the schedule, proves the signed API end-to-end; push is additive to the same `UpdateHub` interface
- **Config-UI last (or concurrent with Phase 6)** — plugin is testable manually without it; QR setup screen is a UX improvement, not an architectural dependency

### Research Flags

Phases needing deeper research during planning:
- **Phase 0 (Feasibility Spike):** Tuya partner program / credential registration — no public documentation found; requires direct outreach to Tuya
- **Phase 8 (MQTT push):** MQTT payload format detail, `support_local` routing, broker credential refresh lifecycle — MEDIUM confidence; re-read `mq.py` + `manager.py` before planning

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard Homebridge plugin scaffold + npm toolchain — HIGH confidence, official template exists
- **Phase 4 (Switches):** Boolean DP mapping is fully documented in HA source — HIGH confidence
- **Phase 6 (Polling):** Polling pattern is straightforward; DP/status API is documented — HIGH confidence

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified live against npm registry 2026-06-24; Homebridge 2.x engines confirmed |
| Features | HIGH | Device→HomeKit mapping verified against HA source (switch.py, climate.py, sensor.py, base.py); DPCode strings confirmed |
| Architecture | HIGH | Auth/signing/API read verbatim from tuya-device-sharing-sdk source and HA integration source |
| Pitfalls | MEDIUM | Partner-gating verdict corroborated across HA source + Tuya docs + community issues; credential registration path unconfirmed |

**Overall confidence:** MEDIUM-HIGH — the implementation details are HIGH confidence; the partner credential question is MEDIUM and is the single unknown that could force an architectural pivot.

### Gaps to Address

- **Tuya partner credential registration:** No confirmed self-serve path for an independent OSS plugin to obtain its own `client_id`/`schema`. Must resolve in Phase 0 via direct Tuya contact. Fallback: developer-project API (Access ID + Secret) — self-serve but the exact friction this project wants to avoid.

- **MQTT payload format for BT-gateway devices:** The `support_local` flag determines whether MQTT status frames arrive as `{code, value}` (cloud) or `{dpId, value, t}` (local-DP). Author's BT-gateway devices are expected to report in cloud `{code, value}` form — confirm against actual device behavior before Phase 8.

- **`client_id`/`schema` sourcing timeline:** If partner registration takes weeks or months, Phase 0 must use HA's credential as a prototype-only probe. The rest of the build can proceed in parallel as long as the credential constant is isolated and never shipped in that form.

- **Tuya rate limits (undocumented):** Exact per-account/per-minute thresholds not published. Use conservative polling (60–120s interval) and observe in testing before v1 publish.

---

## Sources

### Primary (HIGH confidence)
- `tuya/tuya-device-sharing-sdk` (master) — `customerapi.py`, `user.py`, `device.py`, `home.py`, `manager.py`, `mq.py` — signing scheme, QR flow, MQTT config, all API endpoints
- `home-assistant/core` (dev branch) — `components/tuya/const.py`, `config_flow.py`, `coordinator.py`, `__init__.py` — `TUYA_CLIENT_ID`, `TUYA_SCHEMA`, QR flow steps, token listener, reauth pattern
- `home-assistant/core` (tag 2024.6.0) — `base.py` `IntegerTypeData` — scaling formula verified
- `home-assistant/core` — `switch.py`, `climate.py`, `sensor.py`, `binary_sensor.py` — DPCode strings + category mapping tables
- npm registry (live, 2026-06-24) — all version numbers verified
- `homebridge/homebridge-plugin-template` + Homebridge DynamicPlatformPlugin docs — scaffold pattern

### Secondary (MEDIUM confidence)
- Tuya Developer docs — "Device Data Sharing usage" (EU-only, enterprise/paid, effective 2025-09-12); global error codes; app-SDK QR login docs; Smart Home PaaS migration
- HA core issues #164602, #123177, #131804, #164631 — token/sign failures, "designated APP" error causes
- `0x5e/homebridge-tuya-platform` — structural reference for TS Homebridge accessory-handler pattern (dev-project API path; structure transfers, auth does not)
- `homebridge-tuya-without-developer-account@1.0.14` (kosztyk, 2026-06-05) — community precedent confirming Node QR flow with `mqtt` + `qrcode`; JavaScript, ~3 stars, reference only

### Tertiary (reference only)
- `homebridge-plugins/homebridge-tuya-web` issue #615 — abandonment context; maintainer's pointer to HA integration as rewrite basis
- `0x5e/homebridge-tuya-platform` issues; `tuya/tuya-homebridge` issues — real-world failure modes (token 1010, time 1013, endpoint 1106/2406, HAP warnings)

---
*Research completed: 2026-06-24*
*Ready for roadmap: yes — pending Phase 0 credential decision*
