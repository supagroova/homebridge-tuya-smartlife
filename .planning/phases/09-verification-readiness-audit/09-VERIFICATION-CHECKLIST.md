# Phase 9 Verification Checklist

**Checked:** 2026-07-01
**Package:** `homebridge-tuya-smartlife@1.0.0`
**Verdict:** Needs follow-up before Homebridge submission

## Sources

- Homebridge plugin requirements: https://github.com/homebridge/plugins#requirements
- Homebridge plugin verification docs: https://github.com/homebridge/plugins#plugin-verification
- Plugin Verification Request template: https://github.com/homebridge/plugins/blob/latest/.github/ISSUE_TEMPLATE/1_verification-request.yml

## General Requirements

| Requirement | Status | Evidence | Blocker / Follow-up |
|-------------|--------|----------|---------------------|
| Verification process is an issue request, not a PR | Pass | Official issue template is `.github/ISSUE_TEMPLATE/1_verification-request.yml` in `homebridge/plugins`; research note records the process. | Phase 10 prepares the issue body. |
| Plugin is a dynamic platform plugin | Pass | `config.schema.json` has `pluginType: "platform"` and `src/index.ts` calls `api.registerPlatform(...)`. | — |
| Plugin does not offer same or less functionality than existing verified plugin | Needs Follow-up | README and changelog explain Smart Life QR login and no per-user Tuya developer account. | Phase 10 must make this the core differentiation argument in the issue. |
| Plugin is published to npm | Pass | `npm view homebridge-tuya-smartlife@1.0.0 version` returned `1.0.0`; `latest` dist-tag is `1.0.0`. | — |

## Repository And Release Readiness

| Requirement | Status | Evidence | Blocker / Follow-up |
|-------------|--------|----------|---------------------|
| GitHub repository is public and issues are enabled | Pass | `gh repo view supagroova/homebridge-tuya-smartlife --json isPrivate,hasIssuesEnabled,url` returned `isPrivate: false`, `hasIssuesEnabled: true`. | — |
| GitHub Release exists for every plugin version | Fail | `gh release view v1.0.0 --repo supagroova/homebridge-tuya-smartlife` returned `release not found`. | Create GitHub Release `v1.0.0` with release notes before submitting. |
| README, changelog, and package docs are visible | Pass | `README.md` and `CHANGELOG.md` exist and are included by `npm pack --dry-run --json`. | — |
| Root license file is visible | Needs Follow-up | `package.json` declares `Apache-2.0`, but `LICENSE` is missing from the repository root and package contents. | Add root `LICENSE` file before submitting. |
| npm package metadata is review-friendly | Needs Follow-up | `package.json` has name/version/license/keywords/engines, but `repository`, `bugs`, and `homepage` fields are absent; `npm view` output therefore did not show GitHub links. | Add GitHub metadata fields in Phase 10. |
| Package includes Homebridge assets | Pass | `npm pack --dry-run --json` includes `dist/index.js`, `config.schema.json`, `homebridge-ui/public/index.html`, `homebridge-ui/server.js`, `README.md`, and `CHANGELOG.md`. | — |
| Package has no project-owned install/postinstall script | Pass | `package.json` scripts do not include `preinstall`, `install`, `postinstall`, or `prepare`; `release:check` also enforces no `prepare`. | Transitive `napi-postinstall` appears in `package-lock.json`, but this is not this package's lifecycle script. |

## Environment Requirements

| Requirement | Status | Evidence | Blocker / Follow-up |
|-------------|--------|----------|---------------------|
| Supports current Homebridge Node LTS versions | Pass | `package.json` engines are `node: "^22 || ^24"` and `homebridge: "^2.0.0"`; `.github/workflows/ci.yml` matrix is `[22, 24]`. | — |
| CI passes on Node 22 and Node 24 | Pass | `gh run view 28451990676` showed successful `test (22)` and `test (24)` jobs, each running `npm ci`, `make check`, and `npm run build`. | Latest CI evidence is from commit `7bda225`; run CI again after Phase 10 fixes. |
| Local full gate passes | Pass | `make check` passed on local Node `v22.22.3`: lockfile check, lint, typecheck, TDD audit, Jest `117/117`, UI tests `14/14`. | — |
| Release gate passes | Pass | `npm run release:check` passed and verified package metadata, config schema, publish workflow, docs, git-install files, and pack files. | — |
| Fresh npm install succeeds | Pass | `npm install --prefix /private/tmp/homebridge-tuya-smartlife-install-check homebridge-tuya-smartlife@1.0.0 --cache /private/tmp/homebridge-tuya-smartlife-npm-cache --no-audit --no-fund` succeeded. | — |
| Plugin does not start unless configured | Pass | `runPlatformDiscovery` returns `reauth-required` when `tokenStore.load()` returns `null`; `src/platformDiscovery.test.ts` passes the no-token behavior test. | — |
| Initial setup does not require TTY or non-standard Homebridge startup parameters | Pass | `config.schema.json` has `customUi: true`; `homebridge-ui/public/index.html` and `homebridge-ui/server.js` implement QR setup through Homebridge UI. UI tests passed. | — |

## Codebase Requirements

| Requirement | Status | Evidence | Blocker / Follow-up |
|-------------|--------|----------|---------------------|
| No analytics or user tracking | Pass | `rg "analytics|telemetry|tracking|segment|sentry|posthog|mixpanel|google-analytics|amplitude|heap" src homebridge-ui README.md package.json config.schema.json` found no matches. | — |
| Files are stored inside Homebridge storage directory | Pass | `src/platform.ts` stores token file at `join(this.api.user.storagePath(), TOKEN_FILE_NAME)`; `homebridge-ui/server.js` stores the UI token file under `this.homebridgeStoragePath`. | — |
| Sensitive values are not logged by default | Pass | UI tests cover safe status responses and disabled debug logger; QR/auth tests assert sensitive QR/access/refresh values are not logged without debug logger. | — |
| Debug logs are gated and redacted | Pass | `homebridge-ui/server.test.mjs` includes `emits sanitized QR diagnostics only when debug is enabled` and `does not pass a logger to QR flow when debug is disabled`; `src/auth/qrLoginFlow.test.ts` asserts sensitive values are absent from debug calls. | — |
| Plugin catches and logs expected errors | Pass | `runPlatformDiscovery` catches `TuyaReauthRequiredError` and generic discovery failures, returning status instead of throwing; `src/platformDiscovery.test.ts` passes failure-path tests. | — |

## Commands Run

```bash
node --version
npm --version
node -p "JSON.stringify(require('./package.json'), null, 2)"
cat .github/workflows/ci.yml
cat Makefile
rg "preinstall|postinstall|install" package.json package-lock.json README.md .github config.schema.json homebridge-ui src
rg "tokenStore.load|No Smart Life|requires Smart Life|customUi|schema|homebridgeStoragePath|storagePath" src config.schema.json homebridge-ui README.md
rg "analytics|telemetry|tracking|segment|sentry|posthog|mixpanel|google-analytics|amplitude|heap" src homebridge-ui README.md package.json config.schema.json
rg "accessToken|refreshToken|access_token|refresh_token|encdata|X-sign|X-token|userCode|qrcode|qrToken|debug" src homebridge-ui README.md
npm view homebridge-tuya-smartlife@1.0.0 version dist-tags repository bugs license keywords --cache /private/tmp/homebridge-tuya-smartlife-npm-cache
npm pack --dry-run --json --cache /private/tmp/homebridge-tuya-smartlife-npm-cache
gh repo view supagroova/homebridge-tuya-smartlife --json isPrivate,hasIssuesEnabled,url
gh release view v1.0.0 --repo supagroova/homebridge-tuya-smartlife
gh run list --repo supagroova/homebridge-tuya-smartlife --limit 10
gh run view 28451990676 --repo supagroova/homebridge-tuya-smartlife --json conclusion,status,headBranch,headSha,displayTitle,jobs
npm install --prefix /private/tmp/homebridge-tuya-smartlife-install-check homebridge-tuya-smartlife@1.0.0 --cache /private/tmp/homebridge-tuya-smartlife-npm-cache --no-audit --no-fund
npm test -- --runTestsByPath src/platformDiscovery.test.ts
npm test -- --runTestsByPath src/auth/customerApi.test.ts src/auth/qrLoginFlow.test.ts
npm run test:ui
npm run release:check
make check
git diff --check
```

## Network / Environment Notes

- Initial sandboxed `npm view` hung and was stopped; rerun with explicit `/private/tmp` npm cache and network escalation succeeded.
- Initial sandboxed `gh` commands could not connect to `api.github.com`; rerun with network escalation succeeded.
- `npm pack --dry-run --json` using the default user npm cache failed because `/Users/lachlanlaycock/.npm` contains root-owned files. Rerunning with `/private/tmp/homebridge-tuya-smartlife-npm-cache` succeeded. This is a local environment issue, not a package issue.

## Phase 10 Follow-ups

1. Create GitHub Release `v1.0.0` with release notes matching `CHANGELOG.md`.
2. Add a root `LICENSE` file for Apache-2.0.
3. Add `repository`, `bugs`, and `homepage` metadata to `package.json`.
4. Re-run CI after the Phase 10 fixes and use that run as the latest Node 22/24 evidence in the submission.
