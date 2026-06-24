# Credential Feasibility

**Status:** blocked pending Tuya credential route or owner-approved fallback  
**Last updated:** 2026-06-24  
**Phase:** 02-auth-protocol-port-credential-feasibility

## Goal

Determine whether `homebridge-tuya-smartlife` can use the Smart Life User Code + QR-code
device-sharing flow with this plugin's own legitimate Tuya `client_id` and `schema`, so end users do
not need Tuya developer accounts.

## Constraints

- Home Assistant's `client_id` / `schema` may be used only as a disposable local protocol probe.
- Home Assistant's credential must never be shipped, documented as setup, baked into runtime
  defaults, or treated as this plugin's production path.
- The preferred user experience remains Smart Life QR login with no per-user Tuya developer account.
- Developer-project API support is an auth-only fallback, not the primary path and not selected
  silently.
- Phase 3 device discovery must not start until this document records either a legitimate QR
  credential route or the owner explicitly accepts the auth-only fallback.

## Evidence Log

| Date | Source / Contact | Evidence | Implication |
|------|------------------|----------|-------------|
| 2026-06-24 | Tuya `tuya-device-sharing-sdk` source | Python SDK supports the device-sharing signed HTTP client and unauthenticated QR token/login-result endpoints. | The protocol is technically portable to TypeScript. |
| 2026-06-24 | Home Assistant Tuya integration source | Home Assistant uses `LoginControl.qr_code(client_id, schema, user_code)` and renders `tuyaSmart--qrLogin?token=<token>`. | Confirms the target user flow and token persistence shape. |
| 2026-06-24 | Tuya Device Data Sharing docs | Tuya documents a third-party data-sharing/OAuth authorization route with enterprise verification, data-center constraints, app-owner authorization, and service subscription. | Shows an official data-sharing path exists, but does not prove an OSS Homebridge plugin can self-serve an HA-style QR credential. |
| 2026-06-24 | Local Phase 2 implementation | TypeScript modules now cover crypto/signing, signed HTTP transport, refresh, file token storage, QR token creation, and login-result polling against mocks. | Code is ready for a legitimate credential once obtained. |
| 2026-06-24 | Tuya credential acquisition | No project-owned `client_id` / `schema` is present in the repo or workspace. No Tuya approval response has been recorded. | Production QR onboarding remains blocked. |

## Decision

`selected_path: blocked-pending-credential`

As of 2026-06-24, the project does **not** have a legitimate plugin-owned Tuya `client_id` /
`schema`, and the developer-project API fallback has **not** been accepted by the owner. Therefore:

- Do not proceed to Phase 3 device discovery as production work.
- Do not ship, document, or default to Home Assistant's credential.
- Continue Tuya partner/developer-support contact in parallel.
- If Tuya confirms a legitimate credential route, update this document to
  `selected_path: device-sharing-qr` and record the credential handling rules without committing the
  credential value.
- If Tuya declines or does not respond inside the owner's time-box, ask the owner whether to accept
  `selected_path: developer-project-api-fallback` for auth only.

## Consequences For Later Phases

- Phase 2 code can be used for local protocol probes and mocked integration work.
- Phase 3 is blocked for real Tuya cloud discovery until this decision changes.
- The package must remain credential-neutral: credentials come from runtime configuration or local
  probe flags, never source defaults.
- The final Phase 7 config UI must be designed around whichever path is selected here.

