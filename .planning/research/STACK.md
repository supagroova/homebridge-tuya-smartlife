# Stack Research

**Domain:** TypeScript Homebridge dynamic-platform plugin → Tuya/Smart Life cloud via the device-sharing / QR (user-code) login flow (NOT the developer-project Access ID/Secret API; NOT local/LAN/BLE)
**Researched:** 2026-06-24
**Confidence:** HIGH (versions verified live against the npm registry; Tuya auth flow verified against the actual Python `tuya-device-sharing-sdk` source and Home Assistant `tuya` integration source)

---

## TL;DR — the load-bearing conclusions

1. **No Node library implements the device-sharing / QR-login flow. We must build it ourselves in TypeScript.** The only official Node SDK, `@tuya/tuya-connector-nodejs`, targets the developer-project OpenAPI (Access ID + Secret) — the exact path PROJECT.md puts out of scope — and is effectively abandoned (last published April 2022, still pinned to `axios@^0.21`). The reference implementation is Python-only (`tuya/tuya-device-sharing-sdk` + the `LoginControl` flow that lives in Home Assistant's `tuya` integration). Porting its auth + signing + API to TS is the core engineering work of this project. **(HIGH confidence — read the source.)**

2. **Homebridge v2 is now `latest` (2.1.0) and is a hard pivot point: it requires Node `^22 || ^24` and ships `hap-nodejs@0.14.x`.** Target Homebridge `^2.0.0` and Node 22/24. Supporting Homebridge 1.x is not worth it for a greenfield 2026 plugin.

3. **The signing is non-trivial and must be ported precisely.** It is *not* the simple `clientId + t + nonce + stringToSign` HMAC of the dev-project API. Each request derives a per-request secret, AES-256-GCM-encrypts the params/body into an `encdata` field, and signs headers+encdata with HMAC-SHA256. All reproducible with Node's built-in `crypto` (no third-party crypto needed). Details in the appendix.

4. **The baked-in `client_id` is `HA_3y9q4ak7g4ephrvke` — a Home-Assistant-branded credential.** This is the technical root of the project's #1 risk (Tuya partner-gating). The stack can be built regardless; whether Tuya *permits* a non-HA `client_id` to use the flow is a research/legal question, not a library question. Flag for the roadmap, do not let it block stack setup.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **TypeScript** | `~5.9` (pin) — *not* 6.x yet | Language | TS **6.0.3** is now `latest` on npm but is days old; the Homebridge ecosystem, `ts-jest@29`, and `typescript-eslint@8` are all validated against 5.x. Use `~5.9.x` for a greenfield plugin in mid-2026 and revisit 6.x after the toolchain catches up. (MEDIUM — 6.x works but is unproven against this toolchain.) |
| **Node.js** | `22 LTS` (dev + min engine), test also on `24` | Runtime | Homebridge 2.x `engines` is `^22 \|\| ^24`. Node 22 is the active LTS; gives you global `fetch`, `crypto.webcrypto`/`node:crypto` AES-GCM, and stable `node:test` if ever wanted. Set `"engines": { "node": "^22 \|\| ^24" }`. (HIGH) |
| **homebridge** (peer + dev) | peer `^2.0.0`, dev-install `2.1.0` | Plugin host API | v2 is `latest`. A new plugin should not carry 1.x baggage. Declare as `peerDependencies` + `devDependencies`, never a runtime `dependency`. (HIGH) |
| **hap-nodejs** | `0.14.x` (transitive via homebridge) | HAP types/Characteristics | Comes with Homebridge 2.x. Import HAP types via the `homebridge` API (`api.hap`), not by depending on `hap-nodejs` directly. (HIGH) |
| **mqtt** | `^5.x` (latest `5.x`) | Real-time device state | The Python SDK uses paho-mqtt over the Tuya "Open IOT HUB". Node equivalent is `mqtt` (MQTT.js). Config is fetched from `/v1.0/m/life/ha/access/config`; payloads are AES-GCM encrypted. This is the same lib `homebridge-tuya-without-developer-account` uses. (HIGH) |

> **Crypto + HTTP need NO extra library.** Use **`node:crypto`** (HMAC-SHA256, MD5, AES-256-GCM, `randomUUID`) and the **global `fetch`** (Node 18+). Do not add `axios` or `crypto-js` — they're pure overhead here and `crypto-js` is unmaintained/weaker. (HIGH)

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **qrcode** | `^1.5.x` | Render the login QR (`tuyaSmart--qrLogin?token=<token>`) in the config-UI custom UI | Needed for the onboarding flow. Both reference Node plugins use it. The custom UI shows the QR; the user scans it in Smart Life. (HIGH) |
| **@homebridge/plugin-ui-utils** | `^2.x` | Custom config-UI server (the QR/user-code login screen) | Required: the QR login is interactive, so a static `config.schema.json` is not enough — you need a custom UI (`homebridge-ui/`) that calls into your auth client. (HIGH) |
| *(optional)* **debug** | `^4.x` | Namespaced logging beyond Homebridge's logger | Only if you want fine-grained debug toggles; Homebridge's `Logger` is usually sufficient. (LOW — optional) |

> **No date/UUID/qs libraries needed.** `Date.now()`, `crypto.randomUUID()`, and `URLSearchParams`/`JSON.stringify` cover everything the Python SDK does with `time`, `uuid`, and `qs`.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **jest** `^30` + **ts-jest** `^29.4` | Test runner + TS transform | **Recommended over swc/babel** — see decision below. ts-jest 29.4.x officially supports Jest 30 and TS 5.x. Gives real type-checking in tests, which matters for a port where type fidelity = correctness. (HIGH) |
| **@types/jest** `^30` | Jest types | Match Jest major. (HIGH) |
| **nock** `^14` | Mock the Tuya cloud HTTP API in tests | **Recommended over msw for this project** — see decision below. nock 14 supports native `fetch` interception (the gap that previously pushed people to msw). (HIGH) |
| **eslint** `^9` (flat config) + **typescript-eslint** `^8.62` | Lint | ESLint 10 is now `latest` but is brand-new (mid-2026); `typescript-eslint@8` targets ESLint 9 flat config. Pin **eslint `^9`** until typescript-eslint ships a v9-blessed major. (MEDIUM — 10 may work, 9 is the safe, documented combo.) |
| **prettier** `^3.8` + **eslint-config-prettier** `^10` | Formatting | Standard. `eslint-config-prettier` disables ESLint's stylistic rules so Prettier owns formatting. (HIGH) |
| **rimraf** `^6` | Clean `dist/` | Cross-platform `rm -rf` for the build script. (HIGH) |
| **tsc** (no bundler) | Build | Homebridge plugins ship as plain compiled CommonJS/`dist`. **Do not bundle** (no esbuild/rollup) — Homebridge loads from `dist/` and verified-plugin tooling expects a conventional layout. (HIGH) |

---

## Key Toolchain Decisions (the WHY)

### Jest transform: `ts-jest` over `@swc/jest` / `babel-jest`
- **Recommend `ts-jest`.** This is a *port* of a cryptographic/auth protocol where a wrong type (string vs Buffer, base64 vs hex, ms vs s) silently produces an invalid signature. `ts-jest` type-checks during test runs, catching exactly those mistakes. The build is small (one package, mostly auth + accessories) so ts-jest's slower transform is irrelevant.
- **`@swc/jest`** (`0.2.x` + `@swc/core@1.15`) is faster but does *no* type-checking — wrong tradeoff for this codebase. Use it only if test suite runtime ever becomes a real pain (it won't at this size).
- **`babel-jest`** — no, it adds a Babel toolchain with no benefit over the above. (Decision confidence: HIGH)

### HTTP mocking: `nock` over `msw`
- **Recommend `nock@^14`.** Historically `msw` was preferred because nock didn't intercept `fetch`; **nock 14 added native `fetch` support**, removing that reason. nock is lower-ceremony for "intercept this exact Tuya endpoint, assert the signed headers, return this `encdata` blob" — which is most of our test surface. It also lets you assert on outgoing `X-sign`/`X-time`/`X-token` headers directly.
- **`msw@^2`** is the better choice if you later add a browser/custom-UI layer that also needs request mocking (it works in-browser); for a pure Node plugin, nock is leaner. (Decision confidence: HIGH for nock; msw is a legitimate alternative.)

### Coverage gate (85% lines)
- Configure in `jest.config` via `coverageThreshold`. `ts-jest` uses Jest's built-in V8/babel coverage — no extra package.
- **Exempt the Homebridge glue** (accessory registration, `api.on('didFinishLaunching')`) — these are thin adapters over the Homebridge API and are the natural home for the `// tdd-audit: exempt` marker the project already mandates. Concentrate the 85% on the **auth client, signing, token refresh, the Tuya HTTP client, and DP→HomeKit mapping** — the parts where bugs actually live.

```js
// jest.config.js (essentials)
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', 'src/index.ts' /* HB registration */],
  coverageThreshold: { global: { lines: 85, statements: 85, branches: 75, functions: 80 } },
};
```

---

## The Tuya cloud client — what we build (no library exists)

**Verdict: BUILD IT. There is no maintained Node package for the device-sharing / QR flow.** This is the single most important finding for the roadmap. The work breaks into four hand-built modules (all portable from the Python source with `node:crypto`):

| Module to build | Ports from (Python) | Key detail |
|-----------------|---------------------|------------|
| **`LoginControl` / QR auth** | `tuya_sharing/login.py` (+ HA `config_flow.py`) | User enters a **user code** (from Smart Life → Me → Account & Security). Plugin requests a QR token, renders `tuyaSmart--qrLogin?token=<token>`, user scans in Smart Life app, plugin polls for the granted token. `client_id = HA_3y9q4ak7g4ephrvke`. |
| **`CustomerApi` (signed HTTP client)** | `tuya_sharing/customerapi.py` | The signing scheme — see appendix. Token auto-refresh via `GET /v1.0/m/token/{refresh_token}`; persists tokens via a listener (we persist to Homebridge storage, like HA's `tuya-...-qr-auth.json`). |
| **Device/Home repositories** | `device.py`, `home.py`, `scenes.py` | `query_homes()`, `query_devices_by_home(homeId)`, `send_commands(deviceId, commands)`. Returns DP (data-point) status to map to HomeKit characteristics. |
| **MQTT real-time** | `mq.py` (paho) → `mqtt` (MQTT.js) | Config from `POST /v1.0/m/life/ha/access/config` with a `linkId`. Subscribe to owner/device topics; messages are AES-GCM encrypted with the same scheme. |

**Regional endpoints** (set per user's app region, ported from HA): `https://apigw.tuyaus.com` (US), `https://apigw.tuyaeu.com` (EU), `https://apigw.tuyacn.com` (China), `https://apigw.tuyain.com` (India).

---

## Installation

```bash
# (no runtime deps required for the core HTTP/crypto client — node:crypto + global fetch)

# Runtime
npm install mqtt qrcode @homebridge/plugin-ui-utils

# Peer (Homebridge is a peer dep, also install for local dev)
npm install -D homebridge

# Dev / toolchain
npm install -D typescript@~5.9 @types/node ts-jest@^29.4 jest@^30 @types/jest@^30 \
  nock@^14 eslint@^9 typescript-eslint@^8 prettier@^3.8 eslint-config-prettier@^10 rimraf@^6
```

---

## `package.json` shape (Homebridge conventions)

```jsonc
{
  "name": "homebridge-tuya-smartlife",          // homebridge-* prefix → discoverability
  "displayName": "Homebridge Tuya SmartLife",
  "version": "0.1.0",
  "engines": { "node": "^22 || ^24", "homebridge": "^2.0.0" },
  "main": "dist/index.js",
  "keywords": [                                  // REQUIRED for discovery + verification
    "homebridge-plugin", "tuya", "smart-life", "smartlife", "homekit"
  ],
  "scripts": {
    "build": "rimraf dist && tsc",
    "lint": "eslint .",
    "test": "jest",
    "prepublishOnly": "npm run lint && npm test && npm run build"
  },
  "peerDependencies": { "homebridge": "^2.0.0" },
  "dependencies": { "mqtt": "^5", "qrcode": "^1.5", "@homebridge/plugin-ui-utils": "^2" },
  "files": ["dist", "config.schema.json", "homebridge-ui"]
}
```

- **`keywords` MUST include `homebridge-plugin`** — this is how the Homebridge UI/registry discovers it.
- **Name MUST start with `homebridge-`** (or be a scoped `@scope/homebridge-*`).
- **`config.schema.json` at the package root** drives the homebridge-config-ui-x form; ship it via `files`.

## `config.schema.json` (homebridge-config-ui-x)

Minimum shape — `pluginAlias` must equal the platform name you register, `pluginType: "platform"`:

```jsonc
{
  "pluginAlias": "TuyaSmartLife",
  "pluginType": "platform",
  "singular": true,
  "customUi": true,                  // enables the homebridge-ui/ QR-login screen
  "schema": {
    "type": "object",
    "properties": {
      "name":      { "title": "Name", "type": "string", "default": "Tuya SmartLife", "required": true },
      "userCode":  { "title": "Smart Life User Code", "type": "string", "required": true },
      "endpoint":  { "title": "Region", "type": "string",
                     "oneOf": [
                       { "title": "Europe", "enum": ["https://apigw.tuyaeu.com"] },
                       { "title": "Americas", "enum": ["https://apigw.tuyaus.com"] },
                       { "title": "China", "enum": ["https://apigw.tuyacn.com"] },
                       { "title": "India", "enum": ["https://apigw.tuyain.com"] }
                     ] }
    }
  }
}
```

> The token itself is **not** stored in config.json — it's persisted to the plugin's storage dir by the auth client (mirroring HA), so the QR login happens in the custom UI, not the static form.

## `tsconfig.json` (recommended)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",            // Node 22/24
    "module": "CommonJS",          // Homebridge loads CommonJS
    "moduleResolution": "Node",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "strict": true,                // non-negotiable for a crypto port
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["**/*.test.ts", "dist"]
}
```

## Scaffolding & "verified plugin" expectations

- **Start from `homebridge/homebridge-plugin-template`** (the official dynamic-platform template). It gives you `src/platform.ts` (implements `DynamicPlatformPlugin`), `src/platformAccessory.ts`, `src/index.ts` (registers the platform), and ESLint/tsconfig/`config.schema.json` skeletons. Strip its example accessory and replace with the Tuya platform.
- **Dynamic platform pattern:** register with `api.registerPlatform(PLATFORM_NAME, Platform)`; on `didFinishLaunching`, run device discovery from the Tuya cloud, then `configureAccessory` / `api.registerPlatformAccessories(...)` for cached vs new accessories.
- **Verified-plugin bar** (Homebridge program): MIT/Apache-style license, `homebridge-plugin` keyword, a working `config.schema.json`, no blocking of the main thread, runs on current Homebridge + Node LTS, no security issues, and (increasingly expected) CI. Our TDD gate + GH Actions matrix exceeds the bar.

---

## CI — GitHub Actions (Node library, publish-on-tag)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [22, 24]            # match engines: ^22 || ^24
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node }}', cache: 'npm' }
      - run: npm ci               # lockfile guard (matches PROJECT.md constraint)
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```

```yaml
# .github/workflows/publish.yml — publish on version tag
name: Publish
on: { push: { tags: ['v*'] } }
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions: { contents: read, id-token: write }   # npm provenance / trusted publishing
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run build
      - run: npm publish --provenance --access public
        env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' }
```

- **Use `actions/setup-node` built-in npm cache** (`cache: 'npm'`) — no manual cache step needed.
- **Prefer npm Trusted Publishing / provenance** (`id-token: write` + `--provenance`) over a long-lived `NPM_TOKEN` where possible in 2026; falls back to `NODE_AUTH_TOKEN` if your org hasn't enabled trusted publishing.
- This satisfies PROJECT.md's "full gate on PR/push across a Node matrix; publish-on-tag."

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Build our own TS device-sharing client | `@tuya/tuya-connector-nodejs` | **Never for this project** — it's the dev-project API (Access ID/Secret), explicitly out of scope, and abandoned since 2022. |
| Build our own client | Wrap/shell-out to the Python SDK | Only as a last-resort prototype — shipping a Python runtime dependency in a Homebridge plugin is unacceptable for distribution. |
| `ts-jest` | `@swc/jest` | If test-suite runtime becomes painful at large scale (unlikely here). |
| `nock` | `msw` | If a browser-side custom-UI layer later needs the same mocks. |
| `node:crypto` + global `fetch` | `axios` + `crypto-js` | Never — adds deps, `crypto-js` is weaker/unmaintained, and `fetch`/`node:crypto` cover 100% of the Python SDK's crypto/HTTP. |
| Homebridge `^2` only | Also support `^1.8` | Only if a large existing 1.x user base demanded it — N/A for greenfield. |
| TypeScript `~5.9` | TypeScript `6.x` | Once `ts-jest`/`typescript-eslint` ship versions explicitly validated against TS 6. |
| ESLint `^9` flat config | ESLint `^10` | Once `typescript-eslint` ships a major that lists ESLint 10 as supported. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **`@tuya/tuya-connector-nodejs`** | Targets the developer-project OpenAPI (Access ID + Secret) — the exact friction this project exists to remove — and is abandoned (last publish 2022-04-07, `axios@^0.21`). | Hand-built `CustomerApi` ported from `tuya-device-sharing-sdk`. |
| **`tuyapi` / `@tuyapi/*` / TuyAPI-based plugins** (`homebridge-tuya`, `@ruicout0/homebridge-tuya`) | Local LAN/protocol control — explicitly out of scope (host has no LAN/BT path to devices). | Cloud client (this project). |
| **`@0x5e/homebridge-tuya-platform` / official `tuya-homebridge` as a base** | Good *structural* reference, but built on the dev-project API; not the device-sharing flow. | Borrow plugin structure; do **not** inherit its auth. |
| **`homebridge-tuya-without-developer-account`** as a dependency | Closest functional precedent (QR flow, JS, updated 2026) — but it's JavaScript, 3 stars, no real test suite, and not a library. | Use it as a *reference implementation to read*, not a dependency. |
| **`crypto-js`** | Unmaintained, weaker, and unnecessary. | `node:crypto` (AES-256-GCM, HMAC-SHA256, MD5). |
| **`axios`** | The whole API surface is reachable with global `fetch`. | `fetch`. |
| **Bundlers (esbuild/rollup) for the plugin** | Homebridge expects a conventional `dist/` layout; bundling complicates verified-plugin review and source maps. | Plain `tsc`. |
| **Depending on `hap-nodejs` directly** | Version-skew with whatever Homebridge ships. | `api.hap` from the Homebridge API. |

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `homebridge@^2.0.0` | Node `^22 \|\| ^24`, `hap-nodejs@0.14.x` | Engines enforced by Homebridge 2.x; do not target Node 20. |
| `ts-jest@^29.4` | `jest@^30`, `typescript@5.x` | 29.4.x is the line that supports Jest 30. **TS 6.x not yet validated** — pin TS `~5.9`. |
| `typescript-eslint@^8.62` | `eslint@^9` (flat config), `typescript@5.x` | Pin ESLint to `^9` even though `eslint@10` is `latest`. |
| `nock@^14` | global `fetch` (Node 18+) | v14 added native fetch interception — this is why it now beats msw for Node. |
| `mqtt@^5` | Node `^22` | Matches the Python SDK's paho usage; AES-GCM payloads handled in our code, not the lib. |

---

## Sources

- **npm registry (live, 2026-06-24)** — verified `latest` versions: `homebridge@2.1.0` (engines `^22 || ^24`), `hap-nodejs@0.14.3`, `@tuya/tuya-connector-nodejs@2.1.2` (last modified **2022-04-07**, deps `axios@^0.21.1`), `jest@30.4.2`, `ts-jest@29.4.11`, `@swc/jest@0.2.39`, `typescript@6.0.3`, `eslint@10.5.0`, `typescript-eslint@8.62.0`, `prettier@3.8.4`, `nock@14.0.15`, `msw@2.14.6`, `homebridge-config-ui-x@5.24.0`, `@types/node@26.0.0`, `rimraf@6.1.3`. **(HIGH)**
- **`tuya/tuya-device-sharing-sdk` source** (`customerapi.py`, `manager.py`, `mq.py`, `version.py@0.1.9`) — verified the signing scheme (per-request AES-GCM `encdata` + HMAC-SHA256 `X-sign`), token-refresh endpoint `GET /v1.0/m/token/{refresh_token}`, MQTT config endpoint `POST /v1.0/m/life/ha/access/config`, and that `Manager` consumes an already-obtained `token_response` (i.e. QR login lives in `login.py`/`LoginControl`). **(HIGH — read source directly.)**
- **Home Assistant `core` `tuya` integration** (`config_flow.py`, `const.py`) — verified `from tuya_sharing import LoginControl`, baked-in `TUYA_CLIENT_ID = "HA_3y9q4ak7g4ephrvke"`, QR payload format `tuyaSmart--qrLogin?token=<token>`, user-code + region/endpoint config flow. **(HIGH)**
- **`homebridge-tuya-without-developer-account@1.0.14`** (kosztyk, updated 2026-06-05) — confirms a Node plugin does the QR flow with `mqtt` + `qrcode` and **no** Tuya SDK dependency; it is JavaScript, ~3 stars, not a library. Reference only. **(MEDIUM — community, low adoption.)**
- **`@0x5e/homebridge-tuya-platform` / `tuya/tuya-homebridge`** — structural reference for dynamic-platform layout; both use the dev-project API. **(MEDIUM)**
- **Homebridge developer docs + `homebridge/homebridge-plugin-template`** — dynamic platform scaffold, `config.schema.json`, verified-plugin expectations. **(HIGH)**

---

## Appendix — the exact request-signing we must port (from `customerapi.py`)

For every authenticated request (`__request`):

1. `rid = randomUUID()`; `sid = ""`.
2. `hashKey = md5(rid + refresh_token)` (hex).
3. `secret = HMAC_SHA256(key=rid, msg=hashKey).hex().slice(0,16)` (when `sid` is empty; non-empty `sid` mixes in a derived `ecode`).
4. If params/body present: `encdata = base64(nonce12) + base64(AES_256_GCM(secret, nonce12, JSON.stringify(payload)))`, sent as `{ "encdata": ... }`.
5. Headers: `X-appKey=client_id`, `X-requestId=rid`, `X-sid=""`, `X-time=Date.now()`, `X-token=access_token`.
6. `signStr = join(["X-appKey","X-requestId","X-sid","X-time","X-token"] present as key=val with "||" separator) + queryEncdata + bodyEncdata`.
7. `X-sign = HMAC_SHA256(key=hashKey, msg=signStr).hex()`.
8. Response `result` is AES-256-GCM-decrypted with the same `secret` (nonce = first 12 bytes after base64-decode).

All of steps 1–8 map directly to `node:crypto`: `randomUUID`, `createHash('md5')`, `createHmac('sha256', ...)`, and `createCipheriv/createDecipheriv('aes-256-gcm', secret, nonce)` (note: `secret` is the 16-char hex string used as a 16-byte UTF-8 key → that's AES-128-GCM keying in practice; verify byte length when porting). **This is the single highest-risk module to port — write its tests first, against `nock`-captured fixtures.**

---
*Stack research for: TypeScript Homebridge plugin → Tuya/Smart Life device-sharing (QR) cloud flow*
*Researched: 2026-06-24*
