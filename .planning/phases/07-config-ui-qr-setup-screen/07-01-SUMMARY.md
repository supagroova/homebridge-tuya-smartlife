---
phase: 07-config-ui-qr-setup-screen
plan: 01
status: complete
completed_at: 2026-06-29
requirements: [CFG-01]
---

# 07-01 Summary: Config Schema and Setup Visibility

## Completed

- Enabled Homebridge custom UI mode in `config.schema.json` with `customUi: true`.
- Added schema-visible setup fields for endpoint, home/device whitelists, poll interval, and debug logging.
- Added `config.schema.test.mjs` to lock the Homebridge schema contract.
- Updated missing-token startup logging so test installs show actionable setup guidance:
  "Open the plugin settings to complete QR setup."
- Refreshed tracked `dist/platformDiscovery.js` so GitHub/tarball installs include the runtime log update.

## Verification

- `node --test config.schema.test.mjs`
- `npm test -- --runTestsByPath src/platformDiscovery.test.ts --runInBand`
- `npx tsc --noEmit`
- `npm run lint`
- `make check`
- `npm run release:check`

## Notes

- A parallel `make check` and `npm run release:check` attempt failed transiently because `make check`
  runs `npm ci`, which temporarily removed `node_modules/.bin/rimraf` while `release:check` was building.
  Re-running sequentially passed.
