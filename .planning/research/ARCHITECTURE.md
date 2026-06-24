# Architecture Research

**Domain:** Homebridge dynamic-platform plugin over the Tuya / Smart Life cloud "device-sharing" (QR login) flow
**Researched:** 2026-06-24
**Confidence:** HIGH — auth/signing/API/MQTT details read verbatim from `tuya/tuya-device-sharing-sdk` (master) and `home-assistant/core` (dev branch) source; Homebridge pattern from the official plugin template.

> **Source-of-truth note.** The Smart Life QR flow does **not** use the public Tuya developer-API HMAC scheme (the `client_id + access_token + t + nonce + stringToSign(method\n contentSHA256\n headers\n url)` canonical string). It uses a different, encrypted-payload scheme. The exact algorithm is documented below in "Auth & Signing" — porting the *wrong* scheme is the single most likely way to fail, so it is documented precisely.

---

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                            HomeKit / HAP                                │
│   (iOS Home app  ←→  Homebridge HAP bridge exposes Accessories)         │
└───────────────▲───────────────────────────────────┬────────────────────┘
       updateCharacteristic                  onGet / onSet
                │                                     │
┌───────────────┴─────────────────────────────────────▼───────────────────┐
│                         PLUGIN (this project)                            │
│                                                                           │
│  ┌────────────────┐   discover/restore   ┌──────────────────────────┐   │
│  │ TuyaPlatform   │◀────────────────────▶│ AccessoryHandlers         │   │
│  │ (DynamicPlat.) │  configureAccessory  │ (Switch, Outlet, Climate, │   │
│  │  - cache Map   │                       │  Sensor)  per HK Service │   │
│  └───┬────────┬───┘                       └─────────▲────────────────┘   │
│      │        │ uses                                 │ updateCharacteristic│
│      │        ▼                                       │                    │
│      │  ┌──────────────┐   devices    ┌──────────────┴───────────┐        │
│      │  │ DeviceRepo    │◀────────────│ UpdateHub                 │        │
│      │  │ (list/status/ │             │ (MQTT push + poll fallback)│        │
│      │  │  command)     │             └──────────▲────────────────┘        │
│      │  └──────┬────────┘                         │ status frames          │
│      │ uses    │ uses                             │                        │
│      ▼         ▼                                  │                        │
│  ┌──────────────────────────────────────────────┴──────────────────┐    │
│  │ TuyaDeviceSharingClient  (signed, AES-GCM encrypted HTTP)         │    │
│  │   - per-request rid/hash_key/secret, X-sign, encdata              │    │
│  └───────┬────────────────────────────────────────────┬─────────────┘    │
│          │ reads token                                  │ refresh trigger  │
│          ▼                                              ▼                  │
│  ┌──────────────┐   persist/refresh    ┌──────────────────────────┐       │
│  │ TokenManager  │◀────────────────────│ QrLoginFlow (setup-time)  │       │
│  │ (storage +    │                      │ qr_code() → poll          │       │
│  │  refresh)     │                      │ login_result()            │       │
│  └──────┬───────┘                       └──────────────────────────┘       │
└─────────┼──────────────────────────────────────────────────────────────┘
          │ read/write JSON
   ┌──────▼───────┐
   │ HB storagePath│  (token_info, endpoint, terminal_id, user_code)
   └──────────────┘

        ▲ external boundary ▲
┌───────┴──────────────────┴────────────────────────────────────────────┐
│ Tuya Cloud:  apigw.iotbing.com (QR login)  +  <endpoint> (signed API)  │
│              +  MQTT broker (push, from /v1.0/m/life/ha/access/config)  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **TuyaPlatform** | Homebridge entry. Implements `DynamicPlatformPlugin`; owns accessory cache `Map<UUID, PlatformAccessory>`; `configureAccessory` (restore) + `discoverDevices` (register/prune) on `didFinishLaunching`. | `registerPlatform` in `index.ts`; class in `platform.ts` |
| **QrLoginFlow** | Setup-time auth only. `qr_code(userCode)` → render QR → poll `login_result()` until scanned → returns `{access_token, refresh_token, expire_time, uid, endpoint, terminal_id, t}`. | Port of SDK `LoginControl` (`user.py`) |
| **TokenManager** | Persist token bundle to HB storage; expose current token; trigger refresh when near expiry; persist refreshed token (`TokenListener` callback). | JSON file under `api.user.storagePath()`; in-flight refresh guard |
| **TuyaDeviceSharingClient** | Signed/encrypted HTTP transport. Builds `rid`, `hash_key`, AES-GCM `encdata`, headers, `X-sign`; decrypts responses. Calls `refresh_access_token_if_need` before each request. | Port of SDK `CustomerApi` (`customerapi.py`) |
| **DeviceRepository** | Domain API surface: list homes/devices, fetch specifications (functions + status ranges), send commands. | Port of SDK `HomeRepository` + `DeviceRepository` |
| **DeviceManager** | In-memory `device_map`, owns repository + client + update hub; routes incoming status frames to listeners; `updateDeviceCache()`. | Port of SDK `Manager` |
| **UpdateHub** | Real-time updates: MQTT subscribe (push) with a polling fallback. Normalizes frames into `{deviceId, status[]}` events. | Port of SDK `SharingMQ` (`mq.py`) using `mqtt` npm client |
| **Category→HomeKit Mappers** | Pure functions: map a Tuya `category` + status codes to HK Services/Characteristics, and translate values both directions. | Per-category modules (`switch`, `outlet`, `climate`, `sensor`) |
| **AccessoryHandlers** | Bind a `PlatformAccessory` to HK Services; wire `onGet`/`onSet` to the client; receive `UpdateHub` events and call `service.updateCharacteristic(...)`. | One class per HK accessory type |

---

## Auth & Signing (the critical, precisely-documented flow)

> All paths/constants below are read directly from source. The HA-registered client identity is shared (not per-user): `client_id = "HA_3y9q4ak7g4ephrvke"`, `schema = "haauthorize"`. QR-login host is `apigw.iotbing.com`. **Whether Tuya permits a non-HA client to reuse this is the project's #1 open risk (see PROJECT.md); architecture assumes the HA-style baked-in client identity pending that resolution.**

### 1. QR login (setup-time, `QrLoginFlow`)

```
(a) Generate QR token:
    POST https://apigw.iotbing.com/v1.0/m/life/home-assistant/qrcode/tokens
         ?clientid=<client_id>&usercode=<USER_CODE>&schema=haauthorize
    → { success, result: { qrcode }, t }

(b) Render QR encoding the string:
    "tuyaSmart--qrLogin?token=<qrcode>"
    (user scans it in the Smart Life / Tuya Smart app → "Log In")

(c) Poll for completion:
    GET https://apigw.iotbing.com/v1.0/m/life/home-assistant/qrcode/tokens/<qrcode>
        ?clientid=<client_id>&usercode=<USER_CODE>
    → while success==false: keep polling (QR not yet scanned / approved)
    → on success: result = {
          access_token, refresh_token, expire_time (seconds),
          uid, endpoint, terminal_id
      } plus top-level t (server ms timestamp)
```

`USER_CODE` is obtained by the user from the Smart Life app (Me → Settings → account/developer "user code"). The `endpoint` returned is the **region-specific base URL** for all subsequent signed API calls — it is *not* hardcoded; persist it.

### 2. Token bundle persistence

Persist exactly (this is the HA config-entry shape, our equivalent is a JSON file in `storagePath`):

```jsonc
{
  "user_code":   "...",
  "terminal_id": "...",
  "endpoint":    "https://<region>...",   // base URL for signed API
  "token_info": {
    "t":            1700000000000,         // ms, server time at issue
    "uid":          "...",
    "expire_time":  7200,                  // seconds (NOTE: seconds here)
    "access_token": "...",
    "refresh_token":"..."
  }
}
```

Computed absolute expiry (from SDK `CustomerTokenInfo`):
`expire_time_ms = token_info.t + token_info.expire_time * 1000`.

### 3. Token refresh (`TokenManager` + client guard)

From `customerapi.py refresh_access_token_if_need`:

```
before every signed request:
  now = Date.now()
  if (expire_time_ms - 60_000) > now: return        # still valid (60s skew)
  set in-flight guard (avoid concurrent refresh)
  GET <endpoint>/v1.0/m/token/<refresh_token>        # this GET is itself signed
  → result { accessToken, refreshToken, expireTime, uid }, plus t
  rebuild token_info; call TokenListener.update_token(...) to PERSIST
  clear guard
```

Refresh failures surface as `"sign invalid"` → treat as **re-auth required** (re-run QrLoginFlow), exactly as HA does (`ConfigEntryAuthFailed`).

### 4. Request signing + payload encryption (`TuyaDeviceSharingClient`)

This is the exact per-request algorithm from `customerapi.py __request` + `_restful_sign` + `_secret_generating` + `_aes_gcm_encrypt`. **Every step matters.**

```
Per request (method, path, params?, body?):
  refresh_access_token_if_need()

  rid      = uuid4()                        # X-requestId
  sid      = ""                             # X-sid (always empty here)
  hash_key = md5_hex( rid + refresh_token ) # NB: uses the REFRESH token
  secret   = _secret_generating(rid, sid, hash_key)   # see below → 16-char AES key

  # AES-GCM encrypt any params and/or body:
  if params: query_encdata = aesgcm( JSON.stringify(params, compact), secret )
             # transport as ?encdata=<query_encdata>
  if body:   body_encdata  = aesgcm( JSON.stringify(body,   compact), secret )
             # transport as { "encdata": <body_encdata> }

  t = Date.now()                            # ms
  headers = {
    "X-appKey":     client_id,
    "X-requestId":  rid,
    "X-sid":        "",                      # included as "" → dropped from sign (empty)
    "X-time":       String(t),
    "X-token":      access_token             # only if access_token present
  }

  # --- string-to-sign (THE exact construction) ---
  HEADER_ORDER = ["X-appKey","X-requestId","X-sid","X-time","X-token"]
  signStr = HEADER_ORDER
              .filter(h => headers[h] != "")          # drop empty (X-sid, maybe X-token)
              .map(h => h + "=" + headers[h])
              .join("||")                              # "K=V||K=V||..."
  # (implementation builds "K=V||" per item then strips trailing "||")
  if (query_encdata) signStr += query_encdata          # appended, NO separator
  if (body_encdata)  signStr += body_encdata           # appended, NO separator

  X-sign = HMAC_SHA256_hex( key = hash_key, msg = signStr )
  headers["X-sign"] = X-sign

  send: method <endpoint>+path  params(encdata) json(encdata) headers
```

Helper `_secret_generating(rid, sid, hash_key)` → the AES-256-GCM key:
```
message = hash_key            # (when sid=="" no suffix is added)
checksum = HMAC_SHA256( key = rid, msg = message )   # note: key=rid, msg=hash_key
secret   = hex(checksum)[0:16]                        # first 16 hex chars
```

AES-GCM encrypt (`_aes_gcm_encrypt`): random 12-byte nonce; ciphertext = AESGCM(secret).encrypt(nonce, plaintext); **wire format = base64(nonce) ++ base64(ciphertext)** (two base64 blobs concatenated). Decrypt reverses: base64-decode, first 12 bytes = nonce, rest = ciphertext+tag.

Response handling: `{ success, code, msg, result, t }`. If `!success` → throw `ApiRequestException(code, msg)` (watch for `sign invalid`). Else `result` is AES-GCM decrypted with the same `secret`, then JSON-parsed.

**Key contrasts to internalize (and avoid the classic porting trap):**
- HMAC key is `md5(rid + refresh_token)`, **not** a client secret.
- The signed string is header `K=V||` pairs + encrypted blobs — **no HTTP method, no path/URL, no body SHA256, no nonce field**. (That is the *developer-API* scheme, which does NOT apply here.)
- `X-sid` is sent but empty, so it is excluded from the sign string.
- AES key derivation chains md5 → HMAC(rid, hash_key) → first 16 hex chars.

### 5. Domain API endpoints (relative to persisted `endpoint`)

| Purpose | Method + Path | Notes |
|---------|---------------|-------|
| Homes list | `GET /v1.0/m/life/users/homes` | result → `{ownerId, name}`; ownerId = MQTT owner topic key |
| Devices by home | `GET /v1.0/m/life/ha/home/devices` `?homeId=` | base device records (id, name, category, online, status[]) |
| Devices by ids | `GET /v1.0/m/life/ha/devices/detail` `?devIds=a,b` | used after `bindUser` push |
| Device specifications | `GET /v1.1/m/life/{deviceId}/specifications` | `result.functions[]` (commands) + `result.status[]` (status ranges, type Boolean/Integer/Enum/Json + value range) — drives mappers |
| Status strategy (local DP) | `GET /v1.0/m/life/devices/{deviceId}/status` | determines `support_local`; **for cloud-only this matters because the MQTT report format differs** (see Updates) |
| DP report types | `GET /v1.0/m/life/ha/{deviceId}/dp-report-types` | sum/minux annotations; optional for v1 |
| **Send command** | `POST /v1.1/m/thing/{deviceId}/commands` body `{ "commands": [{"code","value"}, ...] }` | SDK debounces identical commands within 10s (`Filter`) |
| MQTT config | `POST /v1.0/m/life/ha/access/config` body `{ "linkId": "..." }` | returns broker url/clientId/username/password + topics |
| Token refresh | `GET /v1.0/m/token/{refresh_token}` | signed like any other request |
| Unbind/logout | `POST /v1.0/m/token/terminal/expire` `{accessToken, terminalId}` | on plugin removal, to revoke |

---

## Real-Time Updates: Push (MQTT) vs Polling

### MQTT push (`UpdateHub`, port of `SharingMQ`)

```
1. POST /v1.0/m/life/ha/access/config { linkId: "homebridge-tuya.<uuid>" }
   → { url (ssl://host:port), clientId, username, password,
       expireTime, topic.ownerId.sub, topic.devId.sub }
2. MQTT connect (TLS if url scheme == ssl), username/password auth.
3. Subscribe:
     owner topic per home:   topic.ownerId.sub.format(ownerId)
     device topic per device: topic.devId.sub.format(devId) + "/sta"   (cloud)
                                                            + "/pen"   (local-DP devices)
4. Reconnect required before broker creds expire: wait (expireTime - 60s) then
   re-fetch config and reconnect. rc==5 (not authorised) → immediate reconnect.
```

Incoming messages → `Manager.on_message`:
- `protocol == 4` → **device status report**. For cloud (`support_local == false`) frames are `[{code, value}, ...]` → set `device.status[code]=value`, emit update. For local-DP devices frames are `[{dpId, value, t}, ...]` and need the `local_strategy` conversion table — **for this cloud-only project, the gateway-bridged BT devices generally report in cloud `{code,value}` form; design the hub for the `{code,value}` path first and treat dpId/strategy conversion as a later concern.**
- `protocol == 20` → lifecycle events: `online`/`offline`, `nameUpdate`, `bindUser` (new device → fetch detail + subscribe), `delete` (remove accessory).

### Polling fallback

MQTT can fail (creds, network, partner gating). Provide a poller that periodically calls device list/status and diffs into the same update path. Strategy:
- Push primary; poll as **safety net** (e.g. every 60–120s) and on MQTT disconnect.
- Always do one authoritative status fetch at startup (`updateDeviceCache`) so HomeKit has correct initial state regardless of push.

**Recommendation:** build polling **first** (simpler, no broker dependency, proves the signed API end-to-end), then layer MQTT push as an enhancement. This de-risks the schedule: a poll-only v1 is shippable; push is a latency/CPU optimization.

---

## Recommended Project Structure

```
src/
├── index.ts                  # registerPlatform(PLUGIN_NAME, PLATFORM_NAME, TuyaPlatform)
├── settings.ts               # PLUGIN_NAME, PLATFORM_NAME constants
├── platform.ts               # TuyaPlatform: DynamicPlatformPlugin (cache, discover, prune)
│
├── auth/
│   ├── qrLoginFlow.ts        # qrCode() + pollLoginResult()  (LoginControl port)
│   ├── tokenManager.ts       # persist/load + refresh-if-needed + TokenListener
│   └── tokenStore.ts         # JSON read/write under api.user.storagePath()
│
├── cloud/
│   ├── sharingClient.ts      # TuyaDeviceSharingClient: signing + AES-GCM + request
│   ├── crypto.ts             # secretGenerating, aesGcmEncrypt/Decrypt, restfulSign, md5/hmac
│   ├── deviceRepository.ts   # homes/devices/specs/commands API
│   └── types.ts              # CustomerDevice, DeviceFunction, DeviceStatusRange, TokenInfo
│
├── updates/
│   ├── updateHub.ts          # orchestrates push + poll, emits {deviceId, changes}
│   ├── mqttClient.ts         # SharingMQ port (config fetch, subscribe, reconnect)
│   └── poller.ts             # interval status fetch + diff fallback
│
├── mappers/
│   ├── registry.ts           # category → mapper lookup
│   ├── switch.ts             # category 'kg'/'cz' → Switch
│   ├── outlet.ts             # → Outlet
│   ├── climate.ts            # → Thermostat/HeaterCooler + temp/humidity
│   └── sensor.ts             # → Temperature/Humidity/Contact sensors
│
└── accessories/
    ├── baseAccessory.ts      # shared: AccessoryInfo service, context, update binding
    ├── switchAccessory.ts
    ├── climateAccessory.ts
    └── sensorAccessory.ts

config.schema.json            # homebridge-config-ui-x schema (userCode + QR setup UI)
```

### Structure Rationale

- **`auth/` vs `cloud/`:** auth is the *one-time + refresh* concern; `cloud/` is the *every-request* transport. They share only the token bundle, keeping the high-risk crypto isolated and unit-testable in isolation (critical for the 85% TDD gate — crypto + signing are pure functions, ideal for table-driven tests against known SDK vectors).
- **`crypto.ts` is pure & dependency-light:** lets you write deterministic tests reproducing the SDK's exact `X-sign` for fixed inputs before any network code exists. This is the highest-value early test surface.
- **`mappers/` are pure functions** (Tuya status ↔ HK characteristic): independently testable, and the single place that grows when adding device categories — keeps `accessories/` thin and Homebridge-API-bound (exempt-able via `// tdd-audit: exempt`).
- **`updates/` separates push from poll** behind one `UpdateHub` so accessories subscribe to a single event source regardless of transport.

---

## Architectural Patterns

### Pattern 1: Cache-restore + discover (Homebridge dynamic platform)

**What:** `configureAccessory` only *restores into the cache map*; all registration/pruning happens in `discoverDevices` on `didFinishLaunching`.
**When to use:** any cloud-backed plugin where the device set is fetched at runtime.
**Trade-offs:** correct lifecycle, avoids "duplicate UUID" crashes; requires a *stable* UUID seed (use the Tuya `device.id`).

```typescript
configureAccessory(accessory: PlatformAccessory) {
  this.accessories.set(accessory.UUID, accessory);   // restore only
}
async discoverDevices() {
  const devices = await this.deviceManager.updateDeviceCache();
  for (const d of devices) {
    const uuid = this.api.hap.uuid.generate(d.id);
    const existing = this.accessories.get(uuid);
    if (existing) { new TuyaAccessory(this, existing, d); }
    else {
      const acc = new this.api.platformAccessory(d.name, uuid);
      acc.context.device = d;
      new TuyaAccessory(this, acc, d);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
    }
    this.discoveredUUIDs.push(uuid);
  }
  // prune accessories no longer in the cloud account
  for (const [uuid, acc] of this.accessories)
    if (!this.discoveredUUIDs.includes(uuid))
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [acc]);
}
```

### Pattern 2: Push-back via `updateCharacteristic`, never poll-on-get

**What:** HomeKit `onGet` returns last-known cached status (fast); the `UpdateHub` pushes changes into HomeKit asynchronously via `service.updateCharacteristic(...)`.
**When to use:** always, for cloud devices — `onGet` must not block on a network round-trip (HomeKit times out ~10s and marks "No Response").
**Trade-offs:** requires a reliable update source (push or poll) to keep the cache fresh; slight staleness window.

```typescript
// UpdateHub emits → accessory handler:
onTuyaUpdate(changes: {code: string; value: unknown}[]) {
  for (const c of changes) {
    const m = this.mapper.toCharacteristic(c.code, c.value);
    if (m) this.service.updateCharacteristic(m.characteristic, m.value);
  }
}
// onGet returns cached:
this.service.getCharacteristic(this.C.On)
  .onGet(() => this.mapper.readOnOff(this.device.status))
  .onSet(v => this.deviceManager.sendCommands(this.device.id, [{code:'switch_1', value:v}]));
```

### Pattern 3: Listener/observer for token + device events

**What:** `TokenManager` implements a `TokenListener` (persist on refresh); `DeviceManager` exposes a `DeviceListener` (`updateDevice`/`addDevice`/`removeDevice`). Mirrors the SDK/HA split so the port stays faithful.
**When to use:** to decouple the transport (who refreshed / who got an MQTT frame) from the side effect (write file / update HomeKit).
**Trade-offs:** a little indirection; pays off in testability and matching the proven HA architecture.

---

## Data Flow

### Setup (one-time auth)

```
User enters USER_CODE in config UI
  → QrLoginFlow.qrCode(userCode)         POST .../qrcode/tokens
  → render QR "tuyaSmart--qrLogin?token=…", user scans in Smart Life app
  → poll QrLoginFlow.loginResult(token)  GET .../qrcode/tokens/{token}
  → {access_token, refresh_token, expire_time, uid, endpoint, terminal_id}
  → TokenManager.persist(bundle)
```

### Control (HomeKit → device)

```
iOS toggle → onSet(value)
  → mapper: characteristic→{code,value}
  → DeviceManager.sendCommands(id, [{code,value}])
  → SharingClient.post(/v1.1/m/thing/{id}/commands)   [sign + AES-GCM]
  → (echo arrives back via MQTT/poll, confirming state)
```

### State (device → HomeKit)

```
Device changes
  → MQTT frame protocol=4 [{code,value}] (or poll diff)
  → UpdateHub normalizes → device.status[code]=value
  → DeviceListener.updateDevice → AccessoryHandler.onTuyaUpdate
  → mapper: code→characteristic
  → service.updateCharacteristic(Characteristic.X, value)
```

---

## Dependency-Ordered Build Sequence (derives roadmap phases)

> Each step is independently testable; later steps depend only on earlier ones. This ordering maximizes how much can be proven before touching network/Homebridge glue (helps the 85% coverage gate).

1. **Foundation** — TS/Jest/ESLint/Prettier, CI, TDD gates (PROJECT.md Phase 1). *No domain code.*
2. **`cloud/crypto.ts` (pure)** — `md5`, `hmacSha256`, `secretGenerating`, `aesGcmEncrypt/Decrypt`, `restfulSign`. *Verify against known vectors / the SDK's exact `X-sign`.* **Highest-value early tests; unblocks everything signed.**
3. **`TuyaDeviceSharingClient`** — request builder using crypto: headers, encdata, sign, response decrypt, error mapping. Depends on (2) + a `TokenInfo` shape.
4. **`auth/` (QrLoginFlow + TokenManager + tokenStore)** — QR endpoints (unsigned), persistence, refresh-if-needed (signed → depends on 3). *Resolves the project's #1 risk early: if the QR flow rejects a non-HA client, you learn it here.*
5. **`DeviceRepository` + `DeviceManager`** — homes/devices/specs/commands; `updateDeviceCache`; `device_map`. Depends on (3)+(4).
6. **Mappers (pure) + AccessoryHandlers** — category→HK Service mapping; `onGet`/`onSet`; wire commands through (5). Start with **switch/outlet** (simplest), then **climate/sensor**.
7. **TuyaPlatform glue** — `registerPlatform`, `configureAccessory`, `discoverDevices`, cache/prune. Depends on (5)+(6). *(Homebridge-API glue — TDD-exempt as needed.)*
8. **UpdateHub — polling first** — interval status fetch + diff → `updateCharacteristic`. Depends on (5)+(6). **Ship-able v1 boundary.**
9. **UpdateHub — MQTT push** — `SharingMQ` port: config fetch, subscribe, reconnect, `on_message` protocol 4/20 routing. Enhancement over (8).
10. **config.schema.json + UI** — `userCode` field + QR setup screen (custom UI plugin) so end users complete (4) without editing JSON.

Suggested phase grouping for the roadmap: **(1) Foundation → (2–4) Auth & signed transport → (5) Discovery → (6–7) Mappers/accessories/platform → (8) Polling updates [MVP ship] → (9) MQTT push → (10) Config UI.**

---

## Scaling Considerations

A Homebridge plugin runs on one host for one account — "scale" = device count and API politeness, not concurrent users.

| Scale | Adjustments |
|-------|-------------|
| 1–20 devices | Single MQTT connection + startup fetch is plenty; polling fallback at 120s is fine. |
| 20–100 devices | Batch MQTT subscribes (SDK uses batches of 20); cache specifications (don't re-fetch every poll); debounce commands (SDK's 10s identical-command `Filter`). |
| 100+ devices | Lengthen poll interval / rely on push; avoid per-device spec calls on every discovery — persist specs in `accessory.context` and refresh lazily. |

### Scaling Priorities
1. **First bottleneck: API call volume on discovery** — each device triggers spec + strategy + report-type GETs. Cache in `accessory.context`; refresh on demand.
2. **Second bottleneck: MQTT reconnect storms** — honor `expireTime - 60s` refresh and exponential backoff on disconnect (mirror SDK `run()` backoff).

---

## Anti-Patterns

### Anti-Pattern 1: Porting the developer-API HMAC signing scheme
**What people do:** Reuse the well-documented Tuya IoT `stringToSign = method + "\n" + sha256(body) + "\n" + headers + "\n" + url` and `sign = HMAC-SHA256(secret, client_id + access_token + t + nonce + stringToSign)`.
**Why it's wrong:** The device-sharing (QR) flow uses an entirely different scheme — HMAC key = `md5(rid+refresh_token)`, payloads AES-GCM encrypted into `encdata`, sign over `K=V||` headers + encdata. Mixing them yields `sign invalid`.
**Do this instead:** Implement exactly the algorithm in "Auth & Signing §4"; test against fixed vectors.

### Anti-Pattern 2: Blocking `onGet` on a cloud round-trip
**What people do:** Fetch device status from the cloud inside the characteristic `onGet`.
**Why it's wrong:** HomeKit times out (~10s) → "No Response"; also hammers the API.
**Do this instead:** Return cached `device.status`; keep it fresh via UpdateHub (push/poll).

### Anti-Pattern 3: Registering accessories inside `configureAccessory`
**What people do:** Call `registerPlatformAccessories` while restoring cache.
**Why it's wrong:** Duplicate-UUID errors; cached accessories are already registered.
**Do this instead:** Restore into the map only; register/prune in `discoverDevices` after `didFinishLaunching`.

### Anti-Pattern 4: Hardcoding the API endpoint/region
**What people do:** Bake one base URL.
**Why it's wrong:** The signed-API `endpoint` is returned by QR login and is region-specific; using the wrong one fails auth.
**Do this instead:** Persist and use the `endpoint` from the login result for all signed calls (only the QR-login host `apigw.iotbing.com` is fixed).

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Tuya QR-login host `apigw.iotbing.com` | Unsigned HTTPS GET/POST | Fixed host; only used at setup/reauth. Uses shared `client_id`/`schema`. **Partner-gating risk lives here.** |
| Tuya signed API `<endpoint>` | Signed + AES-GCM HTTPS | Per-region base URL from login; all device ops. |
| Tuya MQTT broker | TLS MQTT (paho-equivalent npm `mqtt`) | Creds + topics from `/v1.0/m/life/ha/access/config`; expiring creds → periodic reconnect. |
| Homebridge / HAP | `registerPlatform`, `PlatformAccessory`, Service/Characteristic | `api.user.storagePath()` for token persistence. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| TokenManager ↔ SharingClient | direct (read token) + listener (persist on refresh) | Client triggers refresh; manager persists. |
| SharingClient ↔ DeviceRepository | direct method calls | Repo is the typed domain layer over raw client. |
| UpdateHub ↔ AccessoryHandlers | event/observer (`DeviceListener`) | One event source; transport (push/poll) hidden. |
| Mappers ↔ AccessoryHandlers | pure function calls | Mappers are stateless; handlers hold HK Service refs. |
| Platform ↔ everything | composition root | Wires managers; owns accessory cache. |

---

## Sources

- `tuya/tuya-device-sharing-sdk` (master) — read verbatim: `tuya_sharing/customerapi.py` (signing/encryption/refresh), `user.py` (`LoginControl` QR flow), `device.py` (device + command APIs), `home.py` (homes), `manager.py` (orchestration, `on_message`), `mq.py` (`SharingMQ` MQTT push). **HIGH** confidence (source-level).
- `home-assistant/core` (dev) — read verbatim: `components/tuya/config_flow.py` (QR setup steps), `coordinator.py` (`DeviceListener`/`_TokenListener`), `__init__.py` (`async_setup_entry` wiring, `refresh_mq`, `sign invalid`→reauth), `const.py` (`TUYA_CLIENT_ID=HA_3y9q4ak7g4ephrvke`, `TUYA_SCHEMA=haauthorize`). **HIGH**.
- `homebridge/homebridge-plugin-template` (`src/platform.ts`) + Homebridge `DynamicPlatformPlugin` docs — cache/restore/discover pattern, `updateCharacteristic`. **HIGH**.
- `0x5e/homebridge-tuya-platform` — referenced for TS Homebridge Tuya accessory-handler structure (dev-account API path; structure transfers, signing does not). **MEDIUM** (not re-read at source this pass).

---
*Architecture research for: Homebridge Tuya/Smart Life device-sharing plugin*
*Researched: 2026-06-24*
