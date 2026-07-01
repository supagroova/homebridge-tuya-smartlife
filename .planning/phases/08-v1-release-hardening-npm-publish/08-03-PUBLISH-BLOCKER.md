# 08-03 Publish Blocker

## Status

Pre-publish local gate passed; actual npm publish is blocked on npm authentication or a confirmed GitHub Actions release path.

## Evidence

- `make check` passed.
- `npm run release:check` passed.
- `NPM_CONFIG_CACHE=/private/tmp/homebridge-tuya-smartlife-npm-cache npm pack --dry-run --json` passed and includes `CHANGELOG.md`, `README.md`, `config.schema.json`, `dist/index.js`, `homebridge-ui/public/index.html`, and `homebridge-ui/server.js`.
- `npm view homebridge-tuya-smartlife@1.0.0 version` returned 404, so version `1.0.0` is not already published.
- `npm whoami` returned E401 in this environment, so local publish cannot proceed yet.

## Next Options

1. Run `npm login` locally, then publish with `npm publish --provenance --access public` after confirming the working tree is clean.
2. Confirm the GitHub publish workflow has valid npm credentials or trusted publishing configured, then create and push a `v1.0.0` tag.

Do not mark `PUB-01` or `REL-07` complete until npm confirms `homebridge-tuya-smartlife@1.0.0` is published.
