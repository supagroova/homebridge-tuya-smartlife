# Credential Feasibility

**Status:** unblocked for development using Tuya-published HA-compatible QR credentials
**Last updated:** 2026-06-24  
**Phase:** 02-auth-protocol-port-credential-feasibility

## Goal

Determine whether `homebridge-tuya-smartlife` can use the Smart Life User Code + QR-code
device-sharing flow without end users creating Tuya developer accounts.

## Constraints

- The Tuya-published Home Assistant-compatible `client_id` / `schema` may be used to get the
  Homebridge port working.
- Before a public/verified release, revisit whether Tuya will issue a Homebridge-specific
  `client_id` / `schema` or explicitly bless reuse of the existing HA-compatible values.
- The preferred user experience remains Smart Life QR login with no per-user Tuya developer account.
- Developer-project API support is an auth-only fallback, not the primary path and not selected
  silently.

## Evidence Log

| Date | Source / Contact | Evidence | Implication |
|------|------------------|----------|-------------|
| 2026-06-24 | Tuya `tuya-device-sharing-sdk` source | Python SDK supports the device-sharing signed HTTP client and unauthenticated QR token/login-result endpoints. | The protocol is technically portable to TypeScript. |
| 2026-06-24 | Home Assistant Tuya integration source | Home Assistant uses `LoginControl.qr_code(client_id, schema, user_code)` and renders `tuyaSmart--qrLogin?token=<token>`. | Confirms the target user flow and token persistence shape. |
| 2026-06-24 | Tuya Device Data Sharing docs | Tuya documents a third-party data-sharing/OAuth authorization route with enterprise verification, data-center constraints, app-owner authorization, and service subscription. | Shows an official data-sharing path exists, but does not prove an OSS Homebridge plugin can self-serve an HA-style QR credential. |
| 2026-06-24 | Local Phase 2 implementation | TypeScript modules now cover crypto/signing, signed HTTP transport, refresh, file token storage, QR token creation, and login-result polling against mocks. | Code is ready for a legitimate credential once obtained. |
| 2026-06-24 | Tuya credential acquisition | No project-owned `client_id` / `schema` is present in the repo or workspace. No Tuya approval response has been recorded. | Production QR onboarding remains blocked. |
| 2026-06-24 | Tuya `tuya-smart-life` / Home Assistant source | Tuya-published source uses `HA_3y9q4ak7g4ephrvke` and `haauthorize` for the Smart Life QR flow. | Owner approved using those values to get the Homebridge port working now, while pursuing a Homebridge-specific credential later. |

## Decision

`selected_path: device-sharing-qr-ha-compatible`

As of 2026-06-24, the project will proceed with the Tuya-published Home Assistant-compatible
`client_id` / `schema` values to get the Homebridge port working:

- `client_id`: Tuya-published HA-compatible value
- `schema`: Tuya-published HA-compatible value
- Phase 3 may proceed against this QR auth path.
- Continue Tuya partner/developer-support contact later for a Homebridge-specific credential or
  explicit blessing before any broad public/verified release.
- Do not pivot to the developer-project API unless the owner explicitly chooses that later.

## Consequences For Later Phases

- Phase 2 code can be used for local protocol probes, mocked integration work, and Phase 3 discovery.
- Phase 3 is unblocked for development.
- The package can expose the HA-compatible QR values as compatibility defaults if needed, but should
  keep them centralized, documented, and easy to replace with Homebridge-specific values later.
- The final Phase 7 config UI should not ask end users for Tuya developer credentials.
