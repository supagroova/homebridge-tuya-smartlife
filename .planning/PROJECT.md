# homebridge-tuya-smartlife

## What This Is

A maintained Homebridge plugin that brings Tuya / Smart Life devices into Apple HomeKit — a
community replacement for the abandoned `homebridge-tuya-web`. It connects to the Tuya cloud using
the Smart Life app's **User Code + QR-code "device sharing" login** (the same mechanism the official
Home Assistant Tuya integration now uses), so end users do **not** need to create a Tuya developer
account. Primary users: Homebridge owners with Tuya/Smart Life devices — starting with the author's
own switches/outlets and climate/sensors.

## Core Value

A user can control their Tuya devices in HomeKit after a simple **Smart Life QR-code login** — no
per-user Tuya developer account and no 6-month API-trial renewals. If everything else fails, that
frictionless cloud onboarding + reliable control is what must work.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — greenfield; ship to validate)

### Active

<!-- Current scope. Building toward these. Hypotheses until shipped. -->

- [ ] Cloud auth via the Smart Life **User Code + QR device-sharing flow** (no per-user dev account)
- [ ] Persist + refresh auth tokens across Homebridge restarts
- [ ] Discover devices from the Tuya cloud and expose them to HomeKit
- [ ] Support **switches / outlets** (on/off)
- [ ] Support **climate & sensors** (the author's gateway-bridged BT devices)
- [ ] Homebridge config-UI schema (`config.schema.json`) for setup
- [x] Strict TDD gates + GitHub Actions CI (Phase 1 foundation) — ✓ delivered in Phase 1
- [ ] Published to npm + discoverable in Homebridge
- [ ] v1.0 release hardening: debug logs gated, sensitive values redacted, package metadata verified, changelog added, version set to `1.0.0`
- [ ] README release badges added, with the Homebridge verified badge only after verification is actually granted

### Out of Scope

<!-- Explicit boundaries with reasoning to prevent re-adding. -->

- **Local LAN control** (Tuya Wi-Fi protocol) — author's devices are BT/gateway-bridged; the Homebridge host is remote with no Bluetooth, so local is impossible for this setup.
- **Local BLE control** — host can't reach devices over Bluetooth.
- **Developer-project API path** (Access ID + Secret, IoT Core trial) — this is the exact friction (per-user account, 6-month renewals) the project exists to avoid.
- **Lights / dimmers / covers** — deferred to v2; not in the author's v1 device set.
- **Full feature parity with `homebridge-tuya-web`** — goal is "cover my devices well," not match every accessory type.

## Context

- Author has shipped one Homebridge plugin before ([homebridge-klereo-connect](https://github.com/supagroova/homebridge-klereo-connect)) — familiar with the platform.
- Replaces [homebridge-tuya-web](https://github.com/homebridge-plugins/homebridge-tuya-web) (abandoned). Its author suggested a rewrite based on the HA Tuya integration in [issue #615](https://github.com/homebridge-plugins/homebridge-tuya-web/issues/615).
- Architectural reference: the [HA Tuya integration](https://www.home-assistant.io/integrations/tuya/) and [tuya/tuya-device-sharing-sdk](https://github.com/tuya/tuya-device-sharing-sdk) (Python). There is **no** official Node SDK for this device-sharing flow — the core work is porting its auth + API to TypeScript.
- Author's Tuya devices are mostly **Bluetooth**, bridged to the Tuya cloud by a **gateway** (confirmed: controllable from the Smart Life app while away from home).
- The Homebridge host runs **remotely** from the devices and has **no Bluetooth** → the cloud is the only viable connection path (this is what makes local control out of scope).
- Dev practices modeled on the author's `localizer` project (TDD enforced by repo hooks).

## Constraints

- **Tech stack**: TypeScript on Node, packaged as a Homebridge dynamic platform plugin. **npm + Jest + ESLint + Prettier + tsc**.
- **Connectivity**: Cloud-only via the Tuya device-sharing (QR) flow; depends on the Tuya cloud + internet.
- **Testing**: strict TDD enforced by repo hooks — test-first write guard, typecheck/lint/format on edit, **85% coverage** Stop gate, `tdd-audit` + `tdd-debt.txt` allowlist, `npm ci` lockfile guard. Homebridge-API glue exempt via `// tdd-audit: exempt`.
- **CI**: GitHub Actions running the full gate (`make check`) on PR/push across a Node version matrix; publish-on-tag.
- **Compatibility**: current Homebridge LTS + HAP; configured via the `homebridge-config-ui-x` schema.
- **Distribution**: published npm package; aim for Homebridge "verified plugin" status eventually.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cloud-only via the Smart Life QR device-sharing flow | No per-user dev account; matches current HA approach; author's BT devices are cloud-reachable via a gateway; host has no local/BT access | — Pending (gated by Tuya partner-access research) |
| npm + Jest toolchain (not pnpm/Vitest as in `localizer`) | Homebridge ecosystem convention; easiest for outside contributors | — Pending |
| TDD gates modeled on `localizer`, adapted to a single package, built in Phase 1 | Author's established quality practice; appropriate bar for a community plugin | — Pending |
| v1 covers switches/outlets + climate/sensors only | Author's actual devices; "cover my devices well" over parity | — Pending |
| Defer local control + lights/covers to v2 | Keep v1 shippable and focused on the author's setup | — Pending |
| v1.0 release hardening is its own milestone phase | Real Homebridge testing proved QR login and device exposure; npm publication now needs packaging, logging, and docs hardening rather than more feature work | — Active |

## Open Questions / Top Risks

- **Tuya QR credential path:** For development, proceed with the Tuya-published HA-compatible `client_id`/`schema` used by Home Assistant so the Homebridge port can work without per-user developer accounts. Before a broad public/verified release, revisit whether Tuya will issue or bless a Homebridge-specific credential.
- **Author-side credentials:** not per-user; centralized QR credential values are used by the plugin, with any Homebridge-specific credential acquisition deferred until the port works.
- **Region nuance:** the EU Data Act framing around device data sharing — confirm it doesn't block the consumer QR flow for the author's region.
- **Token fragility:** QR expiry and token-refresh ("sign invalid") issues observed in HA — design refresh/recovery accordingly.
- **Release logging:** QR/auth debugging helped validate the real Homebridge flow, but public builds must gate verbose diagnostics behind the existing debug config and never log user codes, QR tokens, access tokens, refresh tokens, raw token payloads, encrypted payloads, or request signatures.

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-01 when planning the v1.0 release milestone*
