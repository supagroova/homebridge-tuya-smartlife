<!-- GSD:project-start source:PROJECT.md -->

## Project

**homebridge-tuya-smartlife (working title)**

A maintained Homebridge plugin that brings Tuya / Smart Life devices into Apple HomeKit — a
community replacement for the abandoned `homebridge-tuya-web`. It connects to the Tuya cloud using
the Smart Life app's **User Code + QR-code "device sharing" login** (the same mechanism the official
Home Assistant Tuya integration now uses), so end users do **not** need to create a Tuya developer
account. Primary users: Homebridge owners with Tuya/Smart Life devices — starting with the author's
own switches/outlets and climate/sensors.

**Core Value:** A user can control their Tuya devices in HomeKit after a simple **Smart Life QR-code login** — no
per-user Tuya developer account and no 6-month API-trial renewals. If everything else fails, that
frictionless cloud onboarding + reliable control is what must work.

### Constraints

- **Tech stack**: TypeScript on Node, packaged as a Homebridge dynamic platform plugin. **npm + Jest + ESLint + Prettier + tsc**.
- **Connectivity**: Cloud-only via the Tuya device-sharing (QR) flow; depends on the Tuya cloud + internet.
- **Testing**: strict TDD enforced by repo hooks — test-first write guard, typecheck/lint/format on edit, **85% coverage** Stop gate, `tdd-audit` + `tdd-debt.txt` allowlist, `npm ci` lockfile guard. Homebridge-API glue exempt via `// tdd-audit: exempt`.
- **CI**: GitHub Actions running the full gate (`make check`) on PR/push across a Node version matrix; publish-on-tag.
- **Compatibility**: current Homebridge LTS + HAP; configured via the `homebridge-config-ui-x` schema.
- **Distribution**: published npm package; aim for Homebridge "verified plugin" status eventually.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## TL;DR — the load-bearing conclusions

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **TypeScript** | `~5.9` (pin) — *not* 6.x yet | Language | TS **6.0.3** is now `latest` on npm but is days old; the Homebridge ecosystem, `ts-jest@29`, and `typescript-eslint@8` are all validated against 5.x. Use `~5.9.x` for a greenfield plugin in mid-2026 and revisit 6.x after the toolchain catches up. (MEDIUM — 6.x works but is unproven against this toolchain.) |
| **Node.js** | `22 LTS` (dev + min engine), test also on `24` | Runtime | Homebridge 2.x `engines` is `^22 \|\| ^24`. Node 22 is the active LTS; gives you global `fetch`, `crypto.webcrypto`/`node:crypto` AES-GCM, and stable `node:test` if ever wanted. Set `"engines": { "node": "^22 \|\| ^24" }`. (HIGH) |
| **homebridge** (peer + dev) | peer `^2.0.0`, dev-install `2.1.0` | Plugin host API | v2 is `latest`. A new plugin should not carry 1.x baggage. Declare as `peerDependencies` + `devDependencies`, never a runtime `dependency`. (HIGH) |
| **hap-nodejs** | `0.14.x` (transitive via homebridge) | HAP types/Characteristics | Comes with Homebridge 2.x. Import HAP types via the `homebridge` API (`api.hap`), not by depending on `hap-nodejs` directly. (HIGH) |
| **mqtt** | `^5.x` (latest `5.x`) | Real-time device state | The Python SDK uses paho-mqtt over the Tuya "Open IOT HUB". Node equivalent is `mqtt` (MQTT.js). Config is fetched from `/v1.0/m/life/ha/access/config`; payloads are AES-GCM encrypted. This is the same lib `homebridge-tuya-without-developer-account` uses. (HIGH) |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **qrcode** | `^1.5.x` | Render the login QR (`tuyaSmart--qrLogin?token=<token>`) in the config-UI custom UI | Needed for the onboarding flow. Both reference Node plugins use it. The custom UI shows the QR; the user scans it in Smart Life. (HIGH) |
| **@homebridge/plugin-ui-utils** | `^2.x` | Custom config-UI server (the QR/user-code login screen) | Required: the QR login is interactive, so a static `config.schema.json` is not enough — you need a custom UI (`homebridge-ui/`) that calls into your auth client. (HIGH) |
| *(optional)* **debug** | `^4.x` | Namespaced logging beyond Homebridge's logger | Only if you want fine-grained debug toggles; Homebridge's `Logger` is usually sufficient. (LOW — optional) |

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

## The Tuya cloud client — what we build (no library exists)

| Module to build | Ports from (Python) | Key detail |
|-----------------|---------------------|------------|
| **`LoginControl` / QR auth** | `tuya_sharing/login.py` (+ HA `config_flow.py`) | User enters a **user code** (from Smart Life → Me → Account & Security). Plugin requests a QR token, renders `tuyaSmart--qrLogin?token=<token>`, user scans in Smart Life app, plugin polls for the granted token. `client_id = HA_3y9q4ak7g4ephrvke`. |
| **`CustomerApi` (signed HTTP client)** | `tuya_sharing/customerapi.py` | The signing scheme — see appendix. Token auto-refresh via `GET /v1.0/m/token/{refresh_token}`; persists tokens via a listener (we persist to Homebridge storage, like HA's `tuya-...-qr-auth.json`). |
| **Device/Home repositories** | `device.py`, `home.py`, `scenes.py` | `query_homes()`, `query_devices_by_home(homeId)`, `send_commands(deviceId, commands)`. Returns DP (data-point) status to map to HomeKit characteristics. |
| **MQTT real-time** | `mq.py` (paho) → `mqtt` (MQTT.js) | Config from `POST /v1.0/m/life/ha/access/config` with a `linkId`. Subscribe to owner/device topics; messages are AES-GCM encrypted with the same scheme. |

## Installation

# (no runtime deps required for the core HTTP/crypto client — node:crypto + global fetch)

# Runtime

# Peer (Homebridge is a peer dep, also install for local dev)

# Dev / toolchain

## `package.json` shape (Homebridge conventions)

- **`keywords` MUST include `homebridge-plugin`** — this is how the Homebridge UI/registry discovers it.
- **Name MUST start with `homebridge-`** (or be a scoped `@scope/homebridge-*`).
- **`config.schema.json` at the package root** drives the homebridge-config-ui-x form; ship it via `files`.

## `config.schema.json` (homebridge-config-ui-x)

## `tsconfig.json` (recommended)

## Scaffolding & "verified plugin" expectations

- **Start from `homebridge/homebridge-plugin-template`** (the official dynamic-platform template). It gives you `src/platform.ts` (implements `DynamicPlatformPlugin`), `src/platformAccessory.ts`, `src/index.ts` (registers the platform), and ESLint/tsconfig/`config.schema.json` skeletons. Strip its example accessory and replace with the Tuya platform.
- **Dynamic platform pattern:** register with `api.registerPlatform(PLATFORM_NAME, Platform)`; on `didFinishLaunching`, run device discovery from the Tuya cloud, then `configureAccessory` / `api.registerPlatformAccessories(...)` for cached vs new accessories.
- **Verified-plugin bar** (Homebridge program): MIT/Apache-style license, `homebridge-plugin` keyword, a working `config.schema.json`, no blocking of the main thread, runs on current Homebridge + Node LTS, no security issues, and (increasingly expected) CI. Our TDD gate + GH Actions matrix exceeds the bar.

## CI — GitHub Actions (Node library, publish-on-tag)

# .github/workflows/ci.yml

# .github/workflows/publish.yml — publish on version tag

- **Use `actions/setup-node` built-in npm cache** (`cache: 'npm'`) — no manual cache step needed.
- **Prefer npm Trusted Publishing / provenance** (`id-token: write` + `--provenance`) over a long-lived `NPM_TOKEN` where possible in 2026; falls back to `NODE_AUTH_TOKEN` if your org hasn't enabled trusted publishing.
- This satisfies PROJECT.md's "full gate on PR/push across a Node matrix; publish-on-tag."

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

## Sources

- **npm registry (live, 2026-06-24)** — verified `latest` versions: `homebridge@2.1.0` (engines `^22 || ^24`), `hap-nodejs@0.14.3`, `@tuya/tuya-connector-nodejs@2.1.2` (last modified **2022-04-07**, deps `axios@^0.21.1`), `jest@30.4.2`, `ts-jest@29.4.11`, `@swc/jest@0.2.39`, `typescript@6.0.3`, `eslint@10.5.0`, `typescript-eslint@8.62.0`, `prettier@3.8.4`, `nock@14.0.15`, `msw@2.14.6`, `homebridge-config-ui-x@5.24.0`, `@types/node@26.0.0`, `rimraf@6.1.3`. **(HIGH)**
- **`tuya/tuya-device-sharing-sdk` source** (`customerapi.py`, `manager.py`, `mq.py`, `version.py@0.1.9`) — verified the signing scheme (per-request AES-GCM `encdata` + HMAC-SHA256 `X-sign`), token-refresh endpoint `GET /v1.0/m/token/{refresh_token}`, MQTT config endpoint `POST /v1.0/m/life/ha/access/config`, and that `Manager` consumes an already-obtained `token_response` (i.e. QR login lives in `login.py`/`LoginControl`). **(HIGH — read source directly.)**
- **Home Assistant `core` `tuya` integration** (`config_flow.py`, `const.py`) — verified `from tuya_sharing import LoginControl`, baked-in `TUYA_CLIENT_ID = "HA_3y9q4ak7g4ephrvke"`, QR payload format `tuyaSmart--qrLogin?token=<token>`, user-code + region/endpoint config flow. **(HIGH)**
- **`homebridge-tuya-without-developer-account@1.0.14`** (kosztyk, updated 2026-06-05) — confirms a Node plugin does the QR flow with `mqtt` + `qrcode` and **no** Tuya SDK dependency; it is JavaScript, ~3 stars, not a library. Reference only. **(MEDIUM — community, low adoption.)**
- **`@0x5e/homebridge-tuya-platform` / `tuya/tuya-homebridge`** — structural reference for dynamic-platform layout; both use the dev-project API. **(MEDIUM)**
- **Homebridge developer docs + `homebridge/homebridge-plugin-template`** — dynamic platform scaffold, `config.schema.json`, verified-plugin expectations. **(HIGH)**

## Appendix — the exact request-signing we must port (from `customerapi.py`)

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

- `ship` (`.agents/skills/ship/SKILL.md`) — verify with `make check`, stage files explicitly by path, commit without attribution trailers, and push only under the documented safeguards.

Add new skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-Codex-profile` -- do not edit manually.
<!-- GSD:profile-end -->
