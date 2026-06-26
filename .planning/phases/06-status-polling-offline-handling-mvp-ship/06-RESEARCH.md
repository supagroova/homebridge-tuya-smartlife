# Phase 6 Research: Status Polling + Offline Handling

**Phase:** 06 — Status Polling + Offline Handling (MVP Ship)  
**Researched:** 2026-06-26  
**Confidence:** HIGH for polling/offline architecture; MEDIUM for exact Tuya rate limits because they are not published.

## Scope

Phase 6 completes the polling-first MVP boundary:

- Poll Tuya cloud status on a configurable interval with jitter and retry/backoff.
- Feed status changes into one local update path so accessories stay cache-backed.
- Keep HomeKit `onGet` handlers non-blocking and cache-only.
- Report offline devices as HomeKit "No Response" instead of stale live state.
- Prove the package is publishable to npm using existing Homebridge conventions and release workflow.

MQTT push remains deferred. The polling/update path should be usable by MQTT later, but this phase
does not add broker credentials, MQTT subscriptions, or push message parsing.

## Existing Code Hooks

- `src/discovery/deviceRepository.ts`
  - `discoverDevices()` already returns homes and full normalized device records including `online`, `status`, `functions`, `statusRanges`, and `reportTypes`.
  - `sendCommands(deviceId, commands)` already sends HomeKit writes through the signed client.
- `src/platformDiscovery.ts`
  - Startup discovery is injectable and testable.
  - Missing auth and reauth failures already avoid reconciliation/pruning.
- `src/platform/accessoryRegistry.ts`
  - Reconciliation updates accessory context metadata, including `tuyaStatus`.
  - Bind callback is invoked for new/restored supported accessories.
- Accessory binders:
  - `src/accessories/switchOutletAccessory.ts`
  - `src/accessories/sensorAccessory.ts`
  - `src/accessories/thermostatAccessory.ts`
  - Existing `onGet` handlers are cache-oriented but some read `device.status` directly instead of a shared context/cache abstraction.

## Design Direction

### Update Hub

Create a small `UpdateHub` module that owns current device snapshots and subscriber callbacks:

- Input: full `TuyaDevice` records from discovery/polling.
- State: `Map<deviceId, TuyaDevice>`.
- Events: only emit when `online` or `status` values change.
- API shape should stay narrow and pure enough to test without Homebridge:
  - `replaceAll(devices: TuyaDevice[])`
  - `applySnapshot(device: TuyaDevice)`
  - `get(deviceId: string): TuyaDevice | undefined`
  - `subscribe(deviceId: string, listener): unsubscribe`

This gives polling and future MQTT a shared destination.

### Poller

Create a poller that calls `DeviceRepository.discoverDevices()` repeatedly:

- Run one poll immediately after platform discovery succeeds.
- Then poll on an interval.
- Add jitter to each scheduled delay, e.g. +/- 20%.
- On failures, keep existing cache, log a warning, and back off up to a cap.
- On success, reset backoff.
- Expose `start()` and `stop()` for lifecycle tests and future shutdown handling.

Exact Tuya rate limits are not documented; keep defaults conservative. A default interval around
120 seconds is safer than an aggressive 10-30 second loop for a cloud plugin.

### Offline Handling

HomeKit should show "No Response" when Tuya says `online === false`.

Implementation should avoid embedding broad Homebridge/HAP behavior in pure mappers. The practical
route is an accessory-level guard:

- Each binder receives a status reader/getter instead of closing over the initial `device.status`.
- `onGet` reads the latest cached device snapshot.
- If latest snapshot exists and `online === false`, throw Homebridge's
  `hap.HapStatusError(hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE)` or an injected equivalent in tests.
- `onSet` should also reject offline devices before sending Tuya commands.

If the exact Homebridge error shape is awkward to unit test, keep a narrow injected error factory
so binder tests can assert that offline reads/writes throw without importing `hap-nodejs` directly.

### Characteristic Updates

Phase 6 should add update-characteristic behavior where practical:

- On poll changes, update existing services via cached getter values and `updateCharacteristic`.
- Keep tests with fake HAP services; do not require a running Homebridge instance.
- If full update wiring across every service would over-expand the phase, prioritize the state cache
  and offline/no-response correctness first. HomeKit can call cached `onGet`; Phase 6 success does
  not require MQTT-like instant push.

### Publish Boundary

`PUB-01` is about being publishable/discoverable and performing the first npm publish when credentials
and release intent are available.

Existing release pieces:

- `package.json` already has `homebridge-plugin` keyword, `main: dist/index.js`, `files`, engines,
  peer dependency, and `prepublishOnly`.
- `.github/workflows/publish.yml` publishes on `v*` tags with npm provenance.

Phase 6 should verify:

- `npm run build` creates `dist/index.js`.
- `npm pack --dry-run` includes `dist`, `config.schema.json`, package metadata, and excludes tests/source planning files.
- Package metadata remains Homebridge-discoverable.
- If npm auth/trusted publishing is unavailable locally, record the publish command/tag procedure instead of pretending a publish happened.

## Validation Architecture

Plan execution should prove:

- Polling updates a cached status snapshot without blocking HomeKit getters.
- Polling applies jitter/backoff deterministically under fake timers.
- Failed polls preserve the last known snapshot.
- Offline devices throw a HomeKit communication failure from getters and setters.
- The full gate passes before release readiness.
- `npm pack --dry-run` proves the package artifact is publishable.

## Open Questions

- Whether to update HomeKit characteristics proactively from the poller in Phase 6 or rely on cache-backed `onGet` until MQTT/push. Recommendation: wire a minimal subscriber path if it stays small; do not delay MVP on full push-style fanout.
- Whether actual npm publish should happen during execute-phase. Recommendation: make publish readiness mandatory and actual `npm publish` conditional on user confirmation/npm auth, because publishing is external and irreversible.
