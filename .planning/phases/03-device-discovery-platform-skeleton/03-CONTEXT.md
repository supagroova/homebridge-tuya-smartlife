# Phase 3: Device Discovery + Platform Skeleton - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 connects the Phase 2 QR-authenticated Tuya device-sharing client to the Homebridge dynamic
platform lifecycle. It discovers Tuya homes and devices from the cloud, captures each discovered
device's category and status set for diagnostics/planning, and registers stable, deduplicated
Homebridge accessory skeletons for the v1 path. It also prunes HomeKit accessories for Tuya devices
that disappear from discovery.

In scope: homes -> devices discovery, device/category/status metadata model, stable UUID derivation
from Tuya device id, Homebridge cache restore/register/prune lifecycle, and tests around that
lifecycle. Out of scope: switch/outlet control, thermometer/sensor characteristic mapping,
thermostat behavior, polling freshness, config UI, MQTT push, and local LAN/BLE control.

</domain>

<decisions>
## Implementation Decisions

### Discovery Breadth

- **D-01:** Phase 3 should fetch and record all Tuya devices visible through the cloud account, not
  just known supported categories. Broad discovery is useful diagnostic data and helps later phases
  understand the user's account/device shape.
- **D-02:** Homebridge accessory skeleton registration should stay focused on the v1 path. Register
  skeletons for categories that are supported or imminent in v1, especially switches/outlets and
  temperature/humidity sensors. Unsupported categories should be logged/retained in discovery data,
  not exposed as placeholder HomeKit accessories.
- **D-03:** First-version priority is the author's actual devices: switches and thermometers. Later
  phases add behavior for those; Phase 3 should ensure discovery data preserves enough category,
  name, id, online, home id, and status metadata for those devices.

### Whitelist Behavior

- **D-04:** Defer whitelist implementation entirely for Phase 3. Do not add `homeIds` / `deviceIds`
  config fields or JSON plumbing in this phase.
- **D-05:** Phase 3 may design internal APIs so a later whitelist can filter homes/devices cleanly,
  but no user-visible whitelist behavior or config schema changes should be implemented until the
  roadmap phase that owns configuration.

### Missing Devices And Pruning

- **D-06:** Automatically prune Homebridge accessories whose Tuya device id is missing from the
  current discovery result. This directly satisfies DISC-03.
- **D-07:** Pruning should be deterministic and test-covered: cached accessory with Tuya device id
  present in discovery stays; cached accessory with Tuya device id absent from discovery is
  unregistered.
- **D-08:** Log pruning clearly enough for troubleshooting, but do not introduce a confirmation
  prompt or config toggle in Phase 3.

### Auth And Credential Carry-Forward

- **D-09:** Phase 3 proceeds using the Phase 2 `selected_path: device-sharing-qr-ha-compatible`
  decision. The Tuya-published HA-compatible QR credential path is acceptable for development.
- **D-10:** Do not pivot to the Tuya developer-project API in Phase 3.
- **D-11:** Phase 3 should treat missing/expired auth as a clear no-discovery/re-auth-required state,
  not as an empty device list.

### Codex's Discretion

Downstream agents may choose exact module names and file layout for the discovery repository and
platform composition, provided they keep discovery logic testable outside Homebridge glue and keep
Homebridge API adapters thin/exempt where appropriate.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope

- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, dependency ordering, and later phase
  boundaries.
- `.planning/REQUIREMENTS.md` — DISC-01 through DISC-04 and v1 device priorities.
- `.planning/PROJECT.md` — core value, cloud-only constraint, out-of-scope local control, and v1
  device scope.
- `.planning/STATE.md` — current phase and carry-forward decisions.

### Auth And Credential Baseline

- `docs/credential-feasibility.md` — live credential decision:
  `selected_path: device-sharing-qr-ha-compatible`.
- `.planning/phases/02-auth-protocol-port-credential-feasibility/02-04-SUMMARY.md` — Phase 2 closeout
  and superseded credential-block note.
- `src/auth/customerApi.ts` — signed device-sharing HTTP client that Phase 3 discovery should reuse.
- `src/auth/tokenStore.ts` — persisted token abstraction for loading auth state.
- `src/auth/errors.ts` — typed auth/API errors and redaction behavior.

### Existing Homebridge Skeleton And Gates

- `src/platform.ts` — Homebridge dynamic platform composition point; Phase 3 connects discovery here.
- `src/settings.ts` — plugin/platform constants.
- `jest.config.js` — auth/discovery modules under `src/` are covered by Jest thresholds; thin
  Homebridge glue remains excluded/exempt.
- `Makefile` — `make check` is the required local and CI gate.
- `.codex/scripts/tdd-audit.sh` — new production files need tests first unless they are genuine
  Homebridge glue with `// tdd-audit: exempt`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `TuyaDeviceSharingClient` in `src/auth/customerApi.ts`: provides signed `get`/`post` transport and
  token refresh. Discovery should build on it rather than adding a second HTTP client.
- `FileTokenStore` / `TokenStore` in `src/auth/tokenStore.ts`: loads persisted auth tokens. Platform
  composition can use this to decide whether discovery can run.
- `TuyaReauthRequiredError` and related errors in `src/auth/errors.ts`: use these to distinguish
  re-auth-required from "no devices found".
- `TuyaSmartLifePlatform` in `src/platform.ts`: currently caches restored accessories and logs
  `didFinishLaunching`; Phase 3 should replace the no-op with discovery orchestration.

### Established Patterns

- Keep testable core logic in modules under `src/` with direct Jest coverage.
- Keep Homebridge API glue thin. If a file is truly only Homebridge adapter glue, it may retain
  `// tdd-audit: exempt`, but discovery/model/repository logic should be covered.
- Build stays plain `tsc` to CommonJS; do not introduce a bundler.
- No direct `hap-nodejs` dependency; use `this.api.hap` through Homebridge.
- No axios, crypto-js, or Tuya developer-project SDK.

### Integration Points

- Platform startup: `api.on('didFinishLaunching')` should trigger discovery after cached accessories
  have been restored.
- Cached accessory identity: store Tuya device id in Homebridge accessory context and derive UUIDs
  from Tuya device id via Homebridge's UUID API.
- Discovery repository: should expose homes/devices/category/status metadata independent of HomeKit
  accessory registration.
- Pruning: compare discovered Tuya device ids with cached accessory contexts before calling
  `api.unregisterPlatformAccessories`.

</code_context>

<specifics>
## Specific Ideas

- First useful version should prioritize the author's devices: switches and thermometers.
- Discover/log all account devices for diagnostics, but avoid cluttering HomeKit with unsupported
  placeholder accessories.
- Defer whitelist fields entirely for now; keep the architecture easy to filter later.

</specifics>

<deferred>
## Deferred Ideas

- Optional home/device whitelist config (`homeIds`, `deviceIds`) is deferred from Phase 3. It belongs
  with the configuration work unless a later phase needs it earlier.
- Switch/outlet control remains Phase 4.
- Thermometer/sensor mapping remains Phase 5.
- Friendly config UI remains Phase 7.
- Homebridge-specific Tuya QR credentials remain a release-hardening follow-up before broad
  public/verified release.

</deferred>

---

*Phase: 3-Device Discovery + Platform Skeleton*
*Context gathered: 2026-06-24*
