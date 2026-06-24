---
phase: 02-auth-protocol-port-credential-feasibility
status: complete
date: 2026-06-24
requirements: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]
sources:
  - .planning/phases/02-auth-protocol-port-credential-feasibility/02-CONTEXT.md
  - .planning/research/SUMMARY.md
  - .planning/research/PITFALLS.md
  - .planning/research/ARCHITECTURE.md
  - .planning/research/STACK.md
  - https://github.com/tuya/tuya-device-sharing-sdk
  - https://raw.githubusercontent.com/tuya/tuya-device-sharing-sdk/dev/tuya_sharing/customerapi.py
  - https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/tuya/config_flow.py
  - https://developer.tuya.com/en/docs/iot/device_data_sharing_usage?id=Kex4vski8ylak
---

# Phase 2 Research: Auth Protocol Port + Credential Feasibility

## Executive Summary

Phase 2 should be planned as four sequential slices: deterministic crypto/signing parity, signed HTTP/token transport, QR-login/token persistence, and credential feasibility/go-no-go documentation. The core engineering risk is not Homebridge integration; it is byte-correctly porting Tuya's Python `tuya-device-sharing-sdk` request scheme and keeping the shipping package free of Home Assistant's partner credential.

The current Tuya Python SDK source confirms that request signing is **not** the public Tuya OpenAPI Access ID/Secret signature. The device-sharing client derives a per-request secret from `rid + refresh_token`, encrypts query/body payloads into `encdata` with AES-GCM, signs selected `X-*` headers plus encrypted payload strings, and decrypts `result` with the same per-request secret. Home Assistant confirms the user flow: enter Smart Life user code, request a QR token with `LoginControl.qr_code(client_id, schema, user_code)`, render `tuyaSmart--qrLogin?token=<token>`, then poll `login_result` for token info.

Credential feasibility remains the phase gate. Tuya's official Device Data Sharing docs describe an EU Data Act/OAuth authorization service with enterprise verification, Central Europe data-center constraints, app-owner authorization, and paid cloud service subscription. That is related to "device data sharing" but is not obviously the same partner-issued QR credential model Home Assistant uses. The plan therefore needs an explicit non-code workstream: contact Tuya/partner support, record evidence, and decide before Phase 3 whether the project has a legitimate `client_id`/`schema` route or must pivot auth to the developer-project API fallback.

## Implementation-Ready Module Boundaries

Recommended files/symbols for the planner to create:

- `src/auth/crypto.ts`
  - `formToJson(content: Record<string, unknown>): string`
  - `generateSecret(requestId: string, sessionId: string, hashKey: string): string`
  - `encryptAesGcm(rawData: string, secret: string, nonce?: string): string`
  - `decryptAesGcm(cipherData: string, secret: string): string`
  - `restfulSign(hashKey: string, queryEncdata: string, bodyEncdata: string, headers: TuyaSignedHeaders): string`
  - Test-only deterministic nonce injection is needed for golden vectors. Runtime nonce generation must stay random.

- `src/auth/types.ts`
  - `TokenInfo`, `PersistedTokenInfo`, `QrCodeResponse`, `QrLoginResult`, `TuyaEndpoint`, `TuyaSignedHeaders`, `TuyaAuthClientOptions`.
  - Use app-facing TS names (`expireTimeMs`, `accessToken`) while serializers map Tuya response keys (`expire_time`, `access_token`, `expireTime`, `accessToken`).

- `src/auth/tokenStore.ts`
  - `TokenStore` interface with `load(): Promise<PersistedTokenInfo | null>` and `save(token: PersistedTokenInfo): Promise<void>`.
  - `FileTokenStore` for Phase 2 dev/manual tests. It should write JSON atomically enough for local use and never log token contents.
  - Later Homebridge storage integration can implement the same interface without rewriting auth.

- `src/auth/customerApi.ts`
  - `TuyaDeviceSharingClient` or `CustomerApiClient` wrapping global `fetch`.
  - Applies request signing/encryption/decryption, maps Tuya failures into typed errors, performs proactive refresh, and guards refresh with a single in-flight promise.
  - No axios, no crypto-js, no `@tuya/tuya-connector-nodejs`.

- `src/auth/qrLoginFlow.ts`
  - `QrLoginFlow` with `createQrCode(userCode)`, `pollLoginResult(qrCodeToken)`, and a higher-level `loginWithQr(userCode, callbacks)` if needed for the dev script.
  - Runtime production credential should be injected/configured; any HA credential probe must be isolated from package/runtime defaults.

- `scripts/qr-login.ts` or `scripts/qr-login.mjs`
  - Dev-only manual probe. It can prompt/read `TUYA_USER_CODE`, endpoint/region, and temporary credential values from env or CLI flags.
  - It should print a QR URL (`tuyaSmart--qrLogin?token=...`) and optionally terminal-render QR if the planner intentionally adds `qrcode-terminal` or uses existing `qrcode` later. For Phase 2, a URL plus clear instructions is enough unless the planner chooses a dependency.
  - Must not run in CI and must not be part of Homebridge runtime startup.

- `docs/credential-feasibility.md`
  - Records Tuya contact attempt(s), evidence, decision, and fallback trigger.
  - Must explicitly state that HA credentials are never a shipping path.

## Protocol Details To Port

### Signed Request Transport

From `tuya_sharing/customerapi.py`:

1. Compute `rid = uuid.v4()` for each request.
2. Set `sid = ""` for the current sharing API path.
3. Compute `hash_key = md5(rid + refresh_token).hexdigest()`.
4. Compute `secret = generateSecret(rid, sid, hash_key)`.
5. Encrypt query params, when present:
   - JSON stringify compactly with separators equivalent to Python `json.dumps(content, separators=(',', ':'))`.
   - AES-GCM encrypt UTF-8 plaintext with `secret` as the key and a 12-character nonce.
   - Return `base64(nonce) + base64(ciphertextPlusTag)` as bytes/string.
   - Replace query params with `{ encdata: queryEncdata }`.
6. Encrypt request body with the same algorithm and send `{ encdata: bodyEncdata }`.
7. Build headers:
   - `X-appKey: client_id`
   - `X-requestId: rid`
   - `X-sid: sid` (empty string in current source)
   - `X-time: <epoch_ms>`
   - `X-token: access_token` when present
8. Compute `X-sign = restfulSign(hash_key, queryEncdata, bodyEncdata, headers)`.
9. Send request to `endpoint + path`.
10. If HTTP response is not OK, treat as transport failure.
11. If JSON `success` is false, raise a typed API error with Tuya `code` and `msg`.
12. Decrypt JSON `result` with the same per-request `secret`; parse as JSON if possible, else keep string.

### Secret Generation

From the SDK:

- Start `message = hash_key`.
- If `sid` is non-empty, append `"_" + ecode`, where `ecode` is derived from up to 16 chars of `sid` by indexing `sid[ord(sid[i]) % 16]`.
- HMAC-SHA256 key is `rid` bytes, message is the computed message bytes.
- Hex digest is truncated to the first 16 characters and used as the AES-GCM key string.

Planner implication: tests need both the normal empty-`sid` case and at least one non-empty `sid` unit case, even if runtime uses empty `sid`, to prevent accidental divergence from the SDK helper.

### AES-GCM Encoding Shape

The SDK's `encrypt` returns:

```text
base64(nonce) + base64(ciphertext_with_auth_tag)
```

The SDK's `decrypt` does:

```text
decoded = base64(cipher_data)
nonce = decoded[:12]
cipher_text = decoded[12:]
AESGCM(secret).decrypt(nonce, cipher_text, None)
```

That asymmetry is easy to port incorrectly: the concatenated string is itself valid base64 because `base64(12-byte nonce)` has no padding and the second base64 segment carries the encrypted bytes/tag. Golden vectors must lock this exact wire encoding.

### Header Signing

Header order is fixed:

```text
X-appKey, X-requestId, X-sid, X-time, X-token
```

Only non-empty header values are included as `key=value||`; the final trailing separator is removed. Then append `queryEncdata` and `bodyEncdata` directly, with no delimiter, when non-empty. HMAC-SHA256 key is `hash_key`, message is the final sign string, output is lowercase hex.

Planner implication: create unit tests for:

- No token, no query/body.
- Token present, body only.
- Query and body both present.
- Empty `X-sid` omitted from the sign string.
- Stable header order independent of object insertion order.

### Token Refresh

The SDK refresh behavior:

- `CustomerTokenInfo.expire_time = token_info.t + token_info.expire_time * 1000`.
- Refresh is skipped when `expire_time - 60_000 > now`.
- Refresh endpoint is `GET /v1.0/m/token/{refresh_token}`.
- Successful refresh result maps:
  - `response.t`
  - `result.expireTime`
  - `result.uid`
  - `result.accessToken`
  - `result.refreshToken`
- Listener callback persists the updated token.

Planner implication: implement a configurable clock for tests, use a single in-flight refresh promise, and test concurrent requests near expiry only cause one refresh call.

### QR Login Flow

Home Assistant's config flow confirms:

- User provides a Smart Life user code.
- It calls `LoginControl.qr_code(TUYA_CLIENT_ID, TUYA_SCHEMA, user_code)`.
- It renders QR selector data as `tuyaSmart--qrLogin?token=<qrCode>`.
- On submit/poll, it calls `LoginControl.login_result(qr_code, TUYA_CLIENT_ID, user_code)`.
- Successful token entry persists `user_code`, token info (`t`, `uid`, `expire_time`, `access_token`, `refresh_token`), `terminal_id`, and `endpoint`.

Planner implication: Phase 2 should test QR/login through mocked `LoginControl` endpoints first. A live manual probe can validate the flow, but must be outside CI and must not be required for `make check`.

## Credential Feasibility Plan

Phase 2 must produce a written go/no-go artifact before Phase 3. Recommended plan task:

- Create `docs/credential-feasibility.md` with:
  - Goal: obtain this plugin's own legitimate `client_id`/`schema` or select fallback.
  - Constraints: no shipping HA credential; no per-user Tuya developer account as primary UX.
  - Contact path(s): Tuya developer support / partner inquiry / app-device-sharing docs reviewed.
  - Evidence table: date, contact/source, response/status, implication.
  - Decision section:
    - `selected_path: device-sharing-qr` when own credential path is confirmed; or
    - `selected_path: developer-project-api-fallback` when no legitimate QR credential route exists inside the time-box.
  - Consequences for later phases.

Tuya's current Device Data Sharing docs are important but not sufficient proof for the HA-style credential path. They describe EU-only enterprise conditions, Central Europe data-center requirements, enterprise account verification, OAuth/H5 authorization, app-owner authorization, and service subscription. Treat this as evidence that a legitimate third-party data-sharing route exists, not proof that a hobby OSS Homebridge plugin can self-serve an HA-equivalent `client_id`/`schema`.

## Testing Strategy

### Unit Tests

Use Jest/ts-jest with deterministic fixtures:

- `src/auth/crypto.test.ts`
  - Known `rid`, `refresh_token`, `hash_key`, `secret`.
  - Known nonce and plaintext -> exact `encdata`.
  - Exact decrypt round-trip.
  - Exact `X-sign` for fixed headers and encrypted payload strings.
  - Compact JSON ordering expectations. For object literals, construct fixture objects in known insertion order and assert string output.

- `src/auth/customerApi.test.ts`
  - Use nock to assert URL, method, query/body shape, and signed headers.
  - Return encrypted `result`; verify client decrypts and parses it.
  - Return `success:false`; verify typed error redacts secrets.
  - Token near expiry triggers refresh before request.
  - Multiple concurrent requests near expiry share one refresh.

- `src/auth/tokenStore.test.ts`
  - Missing file -> null.
  - Save/load round-trip.
  - Invalid/corrupt JSON -> typed recoverable error or null with clear re-auth path, depending planner choice.
  - Saved file does not include accidental debug metadata.

- `src/auth/qrLoginFlow.test.ts`
  - `createQrCode` returns `tuyaSmart--qrLogin?token=<token>` data for script/UI use.
  - Pending/expired/failed/success responses map to explicit states.
  - Success persists token via `TokenStore`.

### Integration/Manual Tests

- `make check` must remain fully offline and deterministic.
- Live Tuya QR probe must be a manual script, opt-in only, excluded from CI.
- The manual script should require credentials/user code via env/flags and print a clear warning that HA credentials, if used, are for local protocol verification only and must not be committed or shipped.

### Golden Vectors

Best source is a small Python fixture generated from the current `tuya-device-sharing-sdk` helpers with fixed nonce/time/rid/token values. Store only non-secret dummy fixture values. Do not store real access tokens, refresh tokens, user codes, or live QR tokens.

If private helper access makes direct fixture generation awkward, reproduce the Python helper logic in a one-off fixture script under `test/fixtures/` or `scripts/` and review it against the source. The important verification target is exact `secret`, `encdata`, and `X-sign` parity.

## Security And Privacy Pitfalls

Planner must include tasks/acceptance criteria for:

- No HA credential in production source, `config.schema.json`, README user setup, package files, or committed fixture data.
- No real user code, access token, refresh token, QR token, terminal ID, or signed payload material in test fixtures or logs.
- Error messages redact `X-token`, `refreshToken`, `accessToken`, `encdata`, and Authorization-like values.
- Manual probe reads secrets from env/flags and does not persist any credential except token-store output intentionally chosen by the user.
- Token store file path is local-only and not included in npm package `files`.
- `npm pack --dry-run` should not include local token files, probe output, or credential feasibility notes if they contain private correspondence.
- Fallback decision must not silently convert the project to per-user developer accounts without updating requirements/project docs.

## Planner Must-Haves

1. Plan crypto/signing before any live QR work.
2. Plan a token store and refresh manager before signed client integration is considered complete.
3. Plan the dev-only QR script as an opt-in manual verification tool, not production UX.
4. Plan a written credential feasibility artifact with explicit go/no-go outcome.
5. Ensure all AUTH-01..AUTH-05 are covered:
   - AUTH-01: QR login flow module + manual script, possibly mocked/live manual.
   - AUTH-02: credential feasibility artifact and no-HA-shipping checks.
   - AUTH-03: token store tests.
   - AUTH-04: refresh manager/client tests.
   - AUTH-05: crypto/signing golden vectors.
6. Preserve Codex gate compatibility: new production files need tests first, `make check` must pass through `.codex/scripts`.

## Validation Architecture

### Validation Dimensions

1. **Crypto parity** - deterministic unit tests prove `generateSecret`, AES-GCM `encdata`, decrypt, and `restfulSign` match Python SDK fixtures byte-for-byte.
2. **Transport correctness** - nock tests prove signed requests include exact headers, encrypted query/body shape, decrypted response parsing, and typed Tuya error handling.
3. **Token lifecycle** - tests prove persistence across process restart semantics, proactive refresh before expiry, and one in-flight refresh for concurrent callers.
4. **QR flow behavior** - tests prove QR token creation, QR URL formatting, login polling states, success persistence, and failure/expiry mapping.
5. **Credential safety** - source/fixture/package checks prove Home Assistant credentials and real tokens are not shipped or logged.
6. **Credential decision** - `docs/credential-feasibility.md` exists and records either a legitimate plugin credential path or a fallback decision before Phase 3.
7. **Manual live probe isolation** - CI remains offline; live probe is opt-in and excluded from `make check`.

### Required Evidence

- `npm test -- --coverage` passes with auth modules counted by coverage.
- `make check` passes.
- `rg -n "HA_3y9q4ak7g4ephrvke|haauthorize" src config.schema.json package.json` returns no shipping-path matches. Apply the same scan to `README.md` once it exists. If a disposable probe fixture mentions them, it must be isolated, documented, and excluded from package/runtime use.
- `rg -n "accessToken|refreshToken|X-token|encdata" src/**/*.test.ts test fixtures` shows only dummy fixture values and redaction assertions.
- `npm pack --dry-run` output excludes local token files and probe output.
- `docs/credential-feasibility.md` contains a decision section before Phase 3 planning/execution begins.

## Sources

- Tuya Device Sharing SDK repository: `tuya/tuya-device-sharing-sdk` on GitHub, latest release shown as `0.2.10` on 2026-06-02.
- Tuya SDK `customerapi.py`: request signing, AES-GCM `encdata`, token refresh, and response decryption.
- Home Assistant `homeassistant/components/tuya/config_flow.py`: Smart Life user code, QR token rendering, and login-result persistence flow.
- Tuya Developer Platform "Device Data Sharing" docs, last updated 2025-11-27: EU Data Act/OAuth/enterprise authorization constraints and authorization flow.
- Project research files under `.planning/research/`, especially `PITFALLS.md` and `ARCHITECTURE.md`.
