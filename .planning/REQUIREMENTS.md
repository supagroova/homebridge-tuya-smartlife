# Requirements: Homebridge Plugin Verification

**Defined:** 2026-07-01
**Milestone:** Homebridge Plugin Verification
**Core Value:** Get `homebridge-tuya-smartlife` reviewed and accepted by the Homebridge team without weakening the v1.0 user experience or security posture.

## Verification Requirements

### Process & Submission

- [x] **VER-01**: Verification process is tracked as a Homebridge `homebridge/plugins` issue request, not as a pull request.
- [x] **VER-02**: The verification issue includes the npm package name, GitHub repository link, and a concise explanation of how the plugin differs from existing verified Tuya plugins.
- [x] **VER-03**: Optional plugin icon decision is made before submission; if used, the icon is a square PNG around 100x100 and does not violate trademarks or licenses.
- [ ] **VER-04**: The Homebridge verified badge is added only after approval is granted.

### Release & Repository Readiness

- [x] **VER-05**: `homebridge-tuya-smartlife@1.0.0` has a GitHub Release with release notes matching the npm release.
- [x] **VER-06**: GitHub repository settings are ready for review: public source, issues enabled, README/changelog/license visible.
- [x] **VER-07**: CI and local gates pass on supported Homebridge Node LTS versions, currently Node `v22` and `v24`.
- [x] **VER-08**: Package metadata remains Homebridge-compatible: dynamic platform, `homebridge-plugin` keyword, config schema/custom UI assets included, no post-install script.

### Runtime Behavior

- [x] **VER-09**: Fresh install succeeds from npm and the plugin does not start device discovery/control until configured with a saved Smart Life token.
- [x] **VER-10**: Initial setup works through Homebridge UI only; no TTY or non-standard Homebridge startup parameters are required.
- [x] **VER-11**: Token/cache files are stored only inside the Homebridge storage directory.
- [x] **VER-12**: Default logs contain no analytics/tracking and no sensitive values; debug logs remain gated and redacted.
- [x] **VER-13**: Auth, discovery, polling, and accessory handlers catch/log expected failures without causing an unhandled exception or Homebridge crash loop.

### Evidence Package

- [x] **VER-14**: A verification checklist document records evidence for each Homebridge requirement.
- [x] **VER-15**: A draft issue body is prepared for the Homebridge verification request.
- [ ] **VER-16**: Any reviewer feedback is tracked, resolved, and released before adding the verified badge.

## Deferred

- Tuya/Homebridge-specific QR credential or explicit Tuya blessing. This remains valuable, but it is not required to request Homebridge verification unless reviewers raise it.
- Verified-plugin bundle behavior. Homebridge handles bundle generation automatically after verification.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VER-01 | Phase 9 | Complete |
| VER-02 | Phase 10 | Complete |
| VER-03 | Phase 10 | Complete |
| VER-04 | Phase 11 | Pending |
| VER-05 | Phase 9/10 | Complete |
| VER-06 | Phase 9/10 | Complete |
| VER-07 | Phase 9 | Complete |
| VER-08 | Phase 9 | Complete |
| VER-09 | Phase 9 | Complete |
| VER-10 | Phase 9 | Complete |
| VER-11 | Phase 9 | Complete |
| VER-12 | Phase 9 | Complete |
| VER-13 | Phase 9 | Complete |
| VER-14 | Phase 9 | Complete |
| VER-15 | Phase 10 | Complete |
| VER-16 | Phase 11 | Pending |
