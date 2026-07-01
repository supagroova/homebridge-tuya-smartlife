# 08-03 Publish Blocker

## Status

Resolved. The pre-publish local gate passed, local publish was completed manually without provenance, and npm registry verification now confirms `homebridge-tuya-smartlife@1.0.0`.

## Evidence

- `make check` passed.
- `npm run release:check` passed.
- `NPM_CONFIG_CACHE=/private/tmp/homebridge-tuya-smartlife-npm-cache npm pack --dry-run --json` passed and includes `CHANGELOG.md`, `README.md`, `config.schema.json`, `dist/index.js`, `homebridge-ui/public/index.html`, and `homebridge-ui/server.js`.
- Initial `npm publish --provenance --access public` failed locally because npm provenance requires a supported CI provider.
- Manual `npm publish --access public` was completed by the package owner.
- `npm view homebridge-tuya-smartlife@1.0.0 version` now returns `1.0.0`.

## Remaining Work

Do not close Phase 8 until the remote Homebridge server installs from npm and verifies plugin discovery, QR login, and HomeKit device visibility.
