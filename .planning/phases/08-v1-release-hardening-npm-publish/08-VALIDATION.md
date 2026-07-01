# Phase 8 Validation: v1.0 Release Hardening & npm Publish

## Validation Status

Validated. Release hardening, npm publication, and post-publish Homebridge smoke testing are verified.

## Automated Evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| REL-01 debug diagnostics gated | Verified | `homebridge-ui/server.test.mjs` covers quiet default logging and debug-enabled diagnostics. |
| REL-02 sensitive logging redaction | Verified | `src/auth/qrLoginFlow.test.ts`, `src/auth/customerApi.test.ts`, and `homebridge-ui/server.test.mjs` cover QR token, user code, access/refresh token, token-shaped fields, encrypted payload fields, and signatures. |
| REL-03 release hardening | Verified | `scripts/release-check.test.mjs`, `npm run release:check`, and `make publish-check` verify metadata, package contents, docs, workflow guardrails, and npm visibility. |
| REL-04 version `1.0.0` | Verified | `package.json`, `package-lock.json`, and `scripts/release-check.test.mjs`. |
| REL-05 changelog | Verified | `CHANGELOG.md` plus release-check coverage. |
| REL-06 npm README badges | Verified | `README.md` plus release-check coverage; Homebridge verified badge intentionally absent until approval. |
| REL-07 npm publish | Verified | `npm view homebridge-tuya-smartlife@1.0.0 version` returns `1.0.0`. |
| REL-08 post-publish Homebridge smoke test | Verified | User confirmed remote Homebridge npm install, plugin discovery, QR login, and HomeKit device visibility after publishing `1.0.0`. |

## Commands Verified

- `make check`
- `npm run release:check`
- `NPM_CONFIG_CACHE=/private/tmp/homebridge-tuya-smartlife-npm-cache npm pack --dry-run --json`
- `npm view homebridge-tuya-smartlife@1.0.0 version`
- `make publish-check`

## Nyquist Gaps

1. **Homebridge verified badge remains intentionally excluded.**
   - Add it only after Homebridge verification is granted.

## Decision

Phase 8 can close. The remaining Homebridge verified-plugin submission is post-v1.0 follow-up work.
