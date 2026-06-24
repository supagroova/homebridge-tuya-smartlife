# Pitfalls Research

**Domain:** Homebridge plugin over the Tuya cloud "device sharing" (Smart Life QR) flow — a TypeScript port of the Python `tuya-device-sharing-sdk` auth used by Home Assistant
**Researched:** 2026-06-24
**Confidence:** MEDIUM (partner-gating verdict corroborated across HA source code + Tuya official docs + community issues; several operational details are MEDIUM/LOW and flagged inline)

---

## ⭐ #1 RISK — Partner gating of the device-sharing / QR-login flow

**VERDICT: VIABLE-WITH-CAVEATS (conditional on registering a partner credential with Tuya). NOT viable by silently reusing Home Assistant's identity.**

This is the project-defining conclusion. Read this section before any roadmap decision.

### What the QR flow actually requires

The QR/device-sharing login posts three parameters to a Tuya public endpoint: `client_id`, `schema`, and `user_code` (the code the end user reads from Smart Life → Settings → Account & Security → User Code). [Confidence: HIGH — confirmed in the SDK's `LoginControl.qr_code` flow and Tuya app-SDK QR docs.]

- `client_id` and `schema` are **NOT generic/public**. They are a Tuya-provisioned application identity. Home Assistant uses **hard-coded constants baked into the integration**:
  - `TUYA_CLIENT_ID = "HA_3y9q4ak7g4ephrvke"`
  - `TUYA_SCHEMA = "haauthorize"`

  [Confidence: HIGH — quoted verbatim from `home-assistant/core` `homeassistant/components/tuya/const.py`.] The `HA_` prefix and `haauthorize` schema make clear these were issued **specifically to Home Assistant** as an approved partner. There is no per-user developer account — but there IS a per-*application* registration that HA did once, on behalf of all its users.

- The `schema` is the **app/application identifier Tuya validates**. It associates the login session with a registered application and (combined with the user's account/region and which consumer app the devices live in) determines whether the QR scan is accepted. [Confidence: MEDIUM — schema described as "unique identifier of the App application" in Tuya app-SDK docs; its exact validation logic is not publicly documented.]

### Is the "use the designated APP to login" error caused by client gating?

**Mostly no — it is usually the WRONG consumer app or a transient cloud-side problem, not a hard rejection of the developer credential.** [Confidence: MEDIUM, from multiple HA issue threads — #123177, #131804, #164602, and the long "designated APP" community thread.] Observed causes, in rough order:

1. **App-variant mismatch** — devices registered in the *Smart Life* app but the user scans with *Tuya Smart* (or vice versa); or a **vendor-branded fork** of Smart Life (e.g. a manufacturer's white-label app) that rejects the QR. The fix is to use the matching unbranded Smart Life / Tuya Smart app where the devices actually live.
2. **Transient Tuya backend state** — the error appeared en masse in early March 2026 for previously-working installs and resolved itself in a day or two, indicating a Tuya cloud-side change, not user error.
3. **Region/account** — creating a fresh Smart Life account in the correct data center sometimes resolves it.

The important inference: HA's `HA_...` client_id is *accepted* by Tuya (logins succeed for most users most of the time), which it would not be if the credential itself were the gate. The gate is real but operates at the application-registration layer, which HA satisfied once.

### Can a NEW OSS plugin get its own credential?

There are **two** registration realities, and they are not the same thing:

| Path | What it is | Region | Cost | Fit for this plugin |
|------|-----------|--------|------|---------------------|
| **A. Approved partner app schema (HA's model)** | Tuya issues an app `client_id`/`schema` to a named application. This is what HA has. | Global | Negotiated / partner program | The *correct* target, but obtaining it is a **business/partner relationship with Tuya**, not a self-serve form. No documented public self-serve path for a hobby OSS plugin. |
| **B. "Device Data Sharing" (platform.tuya.com/cloud)** | A genuinely public OAuth2 + H5/QR authorization product. Third party registers, subscribes to a cloud service, generates an authorization QR. | **EU region ONLY** (Central Europe Data Center), per the **EU Data Act**. Requires **enterprise account verification**; consumer/personal accounts and non-EU users are excluded. | **Paid** cloud subscription (platform usage fees). | Blocks non-EU users; requires enterprise verification + payment. Not a frictionless OSS fit, but it is a *real, documented* path for EU. |

[Confidence: HIGH for the existence and EU-only/enterprise/paid nature of path B — Tuya "Device Data Sharing usage" official docs, effective Sept 12 2025. MEDIUM for path A being effectively partner-gated — inferred from the `HA_`-prefixed credential and absence of any public self-serve schema-issuance docs.]

### Region / EU Data Act constraint

The **consumer QR device-sharing flow that HA uses is global** (HA users worldwide rely on it). The EU Data Act framing applies to **path B (Device Data Sharing)**, which Tuya restricts to EU enterprises. So the Data Act does **not** block HA's flow by region — but it *does* mean the only fully-documented self-serve registration path (B) is EU-locked. [Confidence: MEDIUM-HIGH.]

### 6-month trial extension

The 6-month "Extend Trial Period" applies to the **developer-project / IoT Core path** (Access ID + Secret), i.e. the path this project is explicitly avoiding (PROJECT.md "Out of Scope"). It is **irrelevant to the device-sharing/QR flow** — which is precisely the appeal of the QR flow (no trial renewals). [Confidence: HIGH.]

### Conclusion + fallbacks (decision input for the roadmap)

**VIABLE-WITH-CAVEATS.** The mechanism works for a non-HA client *only* with a registered application identity. Ranked options:

1. **Register the plugin as a Tuya partner application** and obtain its own `client_id`/`schema` (the clean, ToS-safe analogue of what HA did). **Blocker:** no confirmed public self-serve path — requires contacting Tuya. **This must be confirmed before committing the architecture.** ← *highest-priority open action.*
2. **Reuse HA's `HA_3y9q4ak7g4ephrvke` / `haauthorize` credential.** Technically would likely work (it's how `tuya-device-sharing-sdk` is configured for HA). **Risks:** (a) almost certainly violates HA's and/or Tuya's ToS and impersonates HA to Tuya; (b) Tuya can revoke/rotate it, instantly bricking every install; (c) HA could object. **Treat as a throwaway spike to prove the protocol port works — NOT a shippable strategy.**
3. **Device Data Sharing (path B)** — viable for EU enterprise users only, paid. A poor fit for a global hobby plugin but a documented fallback for the author's own EU use.
4. **Fall back to the developer-project API** (Access ID + Secret, 6-month trial) — explicitly out of scope per PROJECT.md, but it is the *known-working, fully-documented, self-serve* path. Keep it as the architectural escape hatch if 1–3 all fail.

**Roadmap implication:** Add a **Phase 0 / pre-foundation feasibility spike** that (a) attempts to register a partner app schema with Tuya, and (b) proves the TS auth port can complete a QR login end-to-end. Do not build device discovery/accessory layers until the credential question is resolved, because the answer may force the pivot to option 4.

**Phase to address:** Phase 0 (feasibility spike) + Phase 1 (auth foundation).

---

## Critical Pitfalls

### Pitfall 1: Shipping without a legitimate application credential

**What goes wrong:** Plugin ships reusing HA's baked-in `client_id`/`schema`; Tuya rotates or revokes it, or HA/Tuya issues a takedown. Every install stops authenticating at once.

**Why it happens:** It's the path of least resistance — the Python SDK is pre-wired for HA's credential, so a naive port "just works" in testing.

**How to avoid:** Resolve credential ownership in Phase 0 (see #1 RISK). Make `client_id`/`schema` a single, clearly-labelled configuration constant so swapping a legitimately-issued credential later is a one-line change, not a refactor.

**Warning signs:** The only credential in the repo is `HA_...`; auth tests pass only because they impersonate HA.

**Phase to address:** Phase 0 (feasibility) / Phase 1 (auth).

---

### Pitfall 2: Token-refresh fragility — "sign invalid" (E0020003 / sign errors)

**What goes wrong:** Tokens expire (sometimes in under 2 hours after a restart); refresh fails with `sign invalid` / signature errors; the plugin needs a manual Homebridge restart to recover. A particularly nasty variant: on a *failed/incomplete* login the cleanup path tries to expire a terminal token that was never validated, throwing `network error:(-9999999) sign invalid` (HA issue #164602).

**Why it happens:** (a) The HMAC signature is computed over method + path + body + timestamp + token; any drift in how the TS port canonicalises the request (sorted query, body hash, content-type) yields a wrong signature → `sign invalid`. (b) Refresh isn't proactive — the token lapses before a refresh fires. (c) Teardown/error paths assume a fully-authenticated session.

**How to avoid:**
- Port the signing algorithm byte-for-byte from `tuya-device-sharing-sdk` and pin it with golden-vector unit tests (known input → known signature). TDD this first.
- Refresh **proactively** on a timer set to a safe margin (e.g. 80% of `expire_time`), not lazily on 1010/expiry.
- Make all teardown/cleanup idempotent and guard against expiring tokens that were never established.
- Treat `sign invalid` on a previously-working session as a clock-skew or canonicalisation bug, not a credential problem.

**Warning signs:** Auth works for an hour then dies; `sign invalid` only after restart; intermittent signature failures that vanish on retry (clock skew).

**Phase to address:** Phase 1 (auth + token lifecycle). Highest-leverage TDD target.

---

### Pitfall 3: Clock skew silently breaking signatures (code 1013 "request time is invalid")

**What goes wrong:** The host clock drifts; Tuya rejects requests with `code=1013, msg=request time is invalid` or generic `sign invalid`. Common on RPi/NAS Homebridge hosts without NTP.

**Why it happens:** The signature includes a millisecond timestamp Tuya validates against a tolerance window. Drift > the window → rejection.

**How to avoid:** Use millisecond timestamps exactly as the SDK does. On repeated 1013/sign failures, log a clear "check host clock / NTP" diagnostic rather than retrying blindly. Optionally fetch server time and compute an offset.

**Warning signs:** Failures correlate with host uptime; a reboot/NTP-sync "fixes" it.

**Phase to address:** Phase 1 (auth), with a diagnostic surfaced in Phase 2 logging.

---

### Pitfall 4: QR-code expiry during setup

**What goes wrong:** The QR/user-code is short-lived. Users dawdle, scan an expired code, and hit "QR code expired" / `E0020003` "Login failed, please scan and try again". Setup feels broken.

**Why it happens:** The QR token has a tight TTL and the polling loop (`login_result`) keeps polling a dead session.

**How to avoid:** Implement the poll loop with a clear timeout, auto-regenerate the QR on expiry, and surface "code expired — regenerate" in the config UI rather than a stack trace. Detect `E0020003` specifically and present a retry, not a failure.

**Warning signs:** Setup works only when done fast; users report `E0020003`.

**Phase to address:** Phase 1 (auth) + the config-UI setup flow.

---

### Pitfall 5: Endpoint / data-center mismatch (1106 / 2406)

**What goes wrong:** The plugin talks to the wrong regional endpoint (US/EU/China/India); calls fail with `1106` (permission denied) or `2406`. Devices "don't exist" because they're in another data center.

**Why it happens:** The device-sharing flow returns the correct `endpoint` after login (it's a stored config value, `CONF_ENDPOINT`). If the port hard-codes one region or ignores the returned endpoint, regional users break.

**How to avoid:** Persist and always use the `endpoint` Tuya returns at login; never hard-code a region. Allow a manual override in config as an escape hatch.

**Warning signs:** Works for you, fails for users in other regions; empty device list despite a valid login.

**Phase to address:** Phase 1 (auth — capture endpoint) / Phase 2 (discovery).

---

### Pitfall 6: Devices the cloud lists but cannot control (offline / BT-gateway)

**What goes wrong:** Discovery returns a device; commands time out or HomeKit shows "No Response". Common with **Bluetooth sub-devices bridged through a Zigbee/BT gateway** — the author's exact setup — when the gateway drops the sub-device or the cloud caches a stale online state.

**Why it happens:** Cloud "online" status for gateway-bridged BT devices lags reality; the gateway itself can be online while a sub-device is unreachable. The cloud lists the device regardless.

**How to avoid:** Read and honour the device's `online` flag; mark HomeKit accessories as not-responding (don't throw) when offline. Don't assume listed == controllable. Treat command failures gracefully with bounded retries, not a crash.

**Warning signs:** A device works in Smart Life (which talks to the gateway live) but is flaky in HomeKit; intermittent "No Response."

**Phase to address:** Phase 2 (discovery/state) + Phase 3 (accessory control).

---

### Pitfall 7: Multi-gang devices and non-standard datapoints (DPs)

**What goes wrong:** A 3-gang switch shows as one accessory, or the wrong DP toggles. Some DPs aren't reported via the cloud push channel at all ("DP instruction mode" / non-standard DPs), so state never updates.

**Why it happens:** Tuya models a multi-gang device as one device with multiple `status` codes (`switch_1`, `switch_2`, …). Mapping one Tuya device to one HomeKit accessory loses the gangs; relying only on pushed status misses non-standard DPs.

**How to avoid:** Map each controllable DP/sub-function to its own HomeKit service within the accessory (or separate accessories). Build a DP→characteristic mapping table with per-device overrides. Verify against the device's actual `status`/`functions` list, not assumptions.

**Warning signs:** Only gang 1 works; toggling gang 2 in HomeKit does nothing; state never refreshes for some devices.

**Phase to address:** Phase 3 (device/accessory modelling), per-category.

---

### Pitfall 8: HomeKit characteristic constraints causing HAP warnings

**What goes wrong:** Tuya values fall outside the HomeKit characteristic's range/step/enum (e.g. temperature in 0.5° steps vs Tuya integers, or an enum value HomeKit doesn't define). HAP logs "characteristic was supplied illegal value" warnings; the value is clamped or rejected.

**Why it happens:** Tuya DP scales/units differ from HAP (Tuya often sends integers scaled by 10; HomeKit expects a float in a defined range with `minStep`).

**How to avoid:** For each characteristic, set `minValue`/`maxValue`/`minStep`/`validValues` from the Tuya DP spec, and clamp+scale every value before `updateValue`. Add unit tests for boundary and out-of-range values.

**Warning signs:** HAP "illegal value" warnings in the log; sliders snap oddly; thermostat won't accept a setpoint.

**Phase to address:** Phase 3 (accessory modelling), with tests.

---

### Pitfall 9: Accessory cache / UUID churn across restarts

**What goes wrong:** On restart the plugin generates new UUIDs (or changes the seed), so HomeKit drops and re-adds accessories — users lose room assignments, automations, and names. Or the opposite: stale cached accessories linger after a device is removed.

**Why it happens:** UUID must be a **stable, deterministic** function of an immutable device id. Seeding it with anything mutable (name, index, IP) churns it. Dynamic platforms must also reconcile the cache (restore vs register vs unregister).

**How to avoid:** Derive `UUID = api.hap.uuid.generate(stableDeviceId)`. On startup, restore cached accessories, register genuinely new ones, and unregister only those confirmed gone. Never key UUIDs on names or list order.

**Warning signs:** Automations/room assignments reset after restarts; duplicate accessories; "ghost" accessories for deleted devices.

**Phase to address:** Phase 2 (platform/cache lifecycle) — the dynamic-platform skeleton.

---

### Pitfall 10: Rate limits / throttling and polling storms

**What goes wrong:** Aggressive polling of device status across many devices trips Tuya rate limits; calls start failing; in extreme cases the account is throttled.

**Why it happens:** Per-device synchronous status polls on a tight interval scale linearly with device count.

**How to avoid:** Prefer the cloud push/MQTT channel for state where available; batch status reads; use a sane poll interval with jitter; back off on throttle responses. Coalesce rapid HomeKit set-requests.

**Warning signs:** Failures scale with device count; errors cluster at poll boundaries.

**Phase to address:** Phase 2 (state sync strategy).

---

## History: why `homebridge-tuya-web` broke (and what transfers)

`homebridge-tuya-web` was built on the **old "Home Assistant Tuya Web API" / Tuya "Smart Home PaaS"** cloud — the original cloud the *first-generation* HA Tuya integration used. Around **May 2021 Tuya retired the Smart Home PaaS** for older projects and migrated everyone to the **IoT Core developer-project model** (Access ID/Secret, cloud projects, the 6-month trial). The old web API that the plugin depended on stopped being a supported path; the plugin stagnated (last meaningful release Oct 2023) and is now effectively abandoned — issue #615 is a "support Homebridge 2.0" request the maintainer didn't action, and the maintainer pointed toward a rewrite based on the *current* HA integration (i.e. the device-sharing flow this project targets). [Confidence: MEDIUM-HIGH — Tuya migration timeline confirmed by Tuya migration docs + HA community; plugin abandonment inferred from release cadence + #615.]

**Lessons that transfer:**
1. **Tuya retires whole cloud surfaces with little notice.** A plugin pinned to one undocumented/legacy API is one deprecation away from death. The device-sharing flow is *also* undocumented for third parties → same structural risk. Mitigation: isolate the Tuya API behind a thin client layer so a future pivot (e.g. to the dev-project API) touches one module.
2. **"Works today" ≠ "sanctioned."** The first plugin rode an API not meant for it; it broke when Tuya cleaned house. Reusing HA's credential is the same gamble (see #1 RISK).
3. **The dev-project API is the survivor.** Through every retirement, the Access-ID/Secret IoT-Core path kept working. That's why it remains the credible fallback (option 4).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse HA's `HA_...` client_id/schema | QR login "just works" instantly | Revocable by Tuya overnight; ToS/impersonation risk; bricks all installs | **Only** as a throwaway feasibility spike, never shipped |
| Lazy token refresh (refresh on 401/1010) | Less code | Sessions die mid-use; manual restarts; bad UX | Never — proactive refresh is mandatory |
| Hard-code a single regional endpoint | Simpler config | Breaks all non-author-region users | Never — always use the login-returned endpoint |
| One Tuya device → one HomeKit accessory | Faster v1 | Multi-gang devices half-work; later remodel churns the accessory cache | Acceptable only for genuinely single-function devices |
| Poll every device on a tight loop | Trivial state sync | Rate-limit trips as device count grows | MVP only, with conservative interval + jitter |
| UUID seeded from device name/index | Quick | Renames/reorders churn HomeKit, losing automations | Never — seed from immutable device id |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tuya QR login | Assuming client_id/schema are public/generic | They're a registered app identity; resolve credential ownership first |
| Tuya signing | Re-implementing HMAC with subtly different canonicalisation | Port byte-for-byte from the SDK; pin with golden-vector tests |
| Tuya endpoint | Hard-coding region | Persist and use the endpoint returned at login |
| Tuya device list | Treating "listed" as "controllable" | Honour the `online` flag; mark not-responding when offline |
| Tuya DPs | Assuming standard DP names/scales | Read actual `status`/`functions`; scale + clamp per DP; allow overrides |
| Homebridge dynamic platform | Re-registering accessories each boot | Restore cache → register new → unregister gone; stable UUIDs |
| HAP characteristics | Pushing raw Tuya values | Set range/step/validValues from DP spec; clamp before updateValue |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-device tight polling | Errors at poll boundaries; throttling | Push/MQTT first; batch reads; interval + jitter | Scales with device count (tens of devices) |
| Synchronous command bursts | "No Response" under rapid HomeKit changes | Coalesce/debounce set-requests | Scenes that hit many devices at once |
| Re-auth storms | Repeated logins after each failure | Single refresh path with backoff | Any sign/clock failure loop |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging tokens / user_code / qr session | Account takeover from shared logs | Redact secrets in all log levels |
| Storing token info world-readable | Local creds leak | Store in Homebridge's persist dir with restrictive perms |
| Shipping a borrowed/partner client_id as the product identity | Impersonation; mass revocation | Use a credential legitimately issued to this plugin |
| Trusting cloud `online` blindly for security-relevant devices | Stale state on locks/doors | Out of v1 scope (no covers/locks); revisit before adding them |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Raw `E0020003` / "sign invalid" shown to user | Confusing, looks broken | Map to friendly messages ("QR expired — regenerate", "check device app/region") |
| No app-variant guidance | Users scan with the wrong app, see "designated APP" error | Tell users to use the *same* app (Smart Life vs Tuya Smart) their devices live in |
| Silent token death | Devices go unresponsive with no explanation | Proactive refresh + a clear log when re-auth is needed |
| Accessory churn on restart | Lost room/automation assignments | Stable UUIDs + proper cache reconciliation |

## "Looks Done But Isn't" Checklist

- [ ] **QR login:** Often missing expiry handling — verify an expired code auto-regenerates and `E0020003` is caught, not thrown.
- [ ] **Token lifecycle:** Often missing proactive refresh — verify the session survives > 24h unattended and across a Homebridge restart.
- [ ] **Signing:** Often missing edge cases — verify golden-vector tests for GET, POST-with-body, and empty-body requests.
- [ ] **Region:** Often missing multi-DC support — verify the login-returned endpoint is used, not a hard-coded one.
- [ ] **Offline devices:** Often missing graceful handling — verify an offline gateway sub-device shows "not responding," not a crash.
- [ ] **Multi-gang:** Often missing per-gang services — verify each gang toggles independently.
- [ ] **Characteristics:** Often missing clamping — verify out-of-range Tuya values produce no HAP warnings.
- [ ] **Cache:** Often missing reconciliation — verify removing a device in Smart Life eventually unregisters its accessory.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tuya revokes the (borrowed) credential | HIGH | Pivot to a registered partner credential or the dev-project API; ship emergency release |
| Signature/`sign invalid` regression | MEDIUM | Re-run golden-vector tests; diff canonicalisation against the SDK; check host clock |
| Token death in the field | LOW | Implement proactive refresh; ship; users restart once |
| Region breakage for non-author users | MEDIUM | Capture and use login-returned endpoint; add manual override |
| Accessory cache churn shipped | MEDIUM | Fix UUID seed to immutable id; one painful re-add for affected users, then stable |
| Multi-gang half-working | LOW–MEDIUM | Add per-DP service mapping; re-add accessory |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Partner gating / credential | Phase 0 (spike) + Phase 1 | Documented credential decision; QR login completes end-to-end with a legitimate identity |
| #2 Token refresh / sign invalid | Phase 1 | Golden-vector signing tests pass; 24h+ unattended session survives |
| #3 Clock skew (1013) | Phase 1 | ms timestamps match SDK; skew produces a clear diagnostic |
| #4 QR expiry (E0020003) | Phase 1 + config UI | Expired code auto-regenerates; error mapped to friendly message |
| #5 Endpoint mismatch | Phase 1 → Phase 2 | Login-returned endpoint persisted and used; manual override exists |
| #6 Offline/BT-gateway devices | Phase 2 → Phase 3 | Offline device → "not responding," no crash |
| #7 Multi-gang / DPs | Phase 3 | Each gang toggles independently; non-pushed DPs still read |
| #8 HAP characteristic constraints | Phase 3 | No "illegal value" HAP warnings on boundary inputs |
| #9 Accessory cache / UUID | Phase 2 | Restart preserves rooms/automations; removed device unregisters |
| #10 Rate limits / polling | Phase 2 | No throttling at expected device counts; push preferred over poll |

## Sources

- `home-assistant/core` — `homeassistant/components/tuya/const.py` (`TUYA_CLIENT_ID = "HA_3y9q4ak7g4ephrvke"`, `TUYA_SCHEMA = "haauthorize"`) [HIGH — primary source code]
- `tuya/tuya-device-sharing-sdk` — issue #4 (client_id/schema question) + SDK auth/LoginControl docs [MEDIUM]
- Tuya Developer — "Device Data Sharing usage" (EU-only, enterprise-verified, paid, OAuth2/QR) [HIGH — official docs]
- Tuya Developer — app-SDK QR login docs; "what is the app schema" [MEDIUM]
- Tuya Developer — global error codes; "How to Migrate to Tuya v2" (Smart Home PaaS retirement, May 2021) [MEDIUM-HIGH]
- HA core issues #164602 (E0020003 + "sign invalid"), #123177, #131804, #164631 [MEDIUM — corroborating community reports]
- HA community thread "Tuya/Smart life: Please use designated APP to login" (transient/app-variant causes) [MEDIUM]
- `homebridge-plugins/homebridge-tuya-web` issue #615; `milo526/homebridge-tuya-web` (abandonment context) [MEDIUM]
- `0x5e/homebridge-tuya-platform` issues (#227 login, token 1010, time 1013) + `tuya/tuya-homebridge` issues (#296, #352) [MEDIUM — real-world failure modes]
- `homebridge-plugins/homebridge-tuya` troubleshooting (offline, multi-gang DPs, endpoint 1106/2406, HAP characteristic warnings) [MEDIUM]

---
*Pitfalls research for: Homebridge plugin over the Tuya device-sharing (Smart Life QR) cloud flow*
*Researched: 2026-06-24*
