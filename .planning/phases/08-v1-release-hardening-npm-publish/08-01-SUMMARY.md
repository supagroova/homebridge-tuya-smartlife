# 08-01 Summary: Debug Logging Gate and Sensitive Logging Audit

## Status

Complete.

## Completed

- Gated Homebridge custom-UI QR diagnostics behind the existing debug behavior.
- Default QR setup logs no longer include QR start/poll diagnostics.
- QR flow logging is only wired when debug is enabled.
- Redaction now covers request signatures and token-shaped response metadata.
- Tests prove user codes, QR tokens, access tokens, refresh tokens, token JSON fields, encrypted payload fields, and signatures are not logged.

## Verification

- `node --test homebridge-ui/server.test.mjs`
- `npm test -- --runTestsByPath src/auth/qrLoginFlow.test.ts src/auth/customerApi.test.ts`
- `make check`
