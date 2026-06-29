---
phase: 07-config-ui-qr-setup-screen
plan: 02
status: complete
completed_at: 2026-06-29
requirements: [CFG-02]
---

# 07-02 Summary: Custom QR Login UI

## Completed

- Added `homebridge-ui/server.js` as a Homebridge custom UI server.
- Added request handlers for token status, QR start, and QR polling.
- Reused the compiled `QrLoginFlow` and `FileTokenStore` runtime modules.
- Persisted successful QR login tokens to `tuya-smartlife-token.json` in Homebridge storage.
- Ensured UI responses never return access tokens, refresh tokens, or full token JSON.
- Added friendly QR error mapping for pending, expired, designated-app, and region/endpoint failures.
- Added `homebridge-ui/public/index.html` as a plain HTML/CSS/JS setup screen.
- Added runtime dependencies: `@homebridge/plugin-ui-utils` and `qrcode`.
- Updated package `files` so tarball installs include `homebridge-ui/public/index.html` and
  `homebridge-ui/server.js` without including UI tests.

## Verification

- `node --test homebridge-ui/server.test.mjs` — 5 tests passed.
- `make check` — lint, typecheck, TDD audit, and 114 Jest tests passed.
- `npm run release:check`
- `NPM_CONFIG_CACHE=/private/tmp/homebridge-tuya-smartlife-npm-cache npm pack --dry-run --json`

## Notes

- Direct `npm pack` with the default user cache is still affected by root-owned files in
  `~/.npm`; isolated cache verification passes.
- `npm install` reported one moderate advisory after adding runtime dependencies. It was not
  auto-fixed to avoid unrelated dependency churn during this phase.
