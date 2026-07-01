# 08-02 Summary: Release Metadata and Documentation

## Status

Complete.

## Completed

- Set `package.json` and `package-lock.json` to version `1.0.0`.
- Added `CHANGELOG.md` for the initial public release.
- Added npm version and download badges to `README.md`.
- Kept the Homebridge verified badge out of the README until verification is actually granted.
- Updated release checks to enforce version, changelog, README badges, package contents, Homebridge metadata, and publish workflow safety.
- Added `CHANGELOG.md` to the npm package file whitelist.

## Verification

- `node --test scripts/release-check.test.mjs`
- `npm run release:check`
- `NPM_CONFIG_CACHE=/private/tmp/homebridge-tuya-smartlife-npm-cache npm pack --dry-run --json`
- `make check`
