# Phase 7: Config-UI + QR Setup Screen - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 07-config-ui-qr-setup-screen
**Areas discussed:** QR UI behavior, QR server/token persistence, packaging/docs gaps

---

## QR UI Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Plain schema form only | Keep using generated Homebridge form; cannot display/poll QR cleanly. | |
| Minimal custom UI | Small settings modal UI for user code, endpoint, QR display, status, and restart prompt. | ✓ |
| Full onboarding app | More polished multi-step UI with richer visuals and flows. | |

**User's choice:** Gap-focused discussion after seeing the plugin only showed the plain schema form.
**Notes:** The custom UI flow had already been explicitly preserved in ROADMAP.md. The context locks
minimal custom UI as the v1 path.

---

## QR Server And Token Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Browser calls Tuya directly | Simpler surface but exposes protocol details and risks credential leakage. | |
| UI server wraps existing QR flow | Reuse `QrLoginFlow`/`FileTokenStore`; browser receives only safe state. | ✓ |
| Keep CLI-only setup | Works for developers but fails the Homebridge UI setup requirement. | |

**User's choice:** Proceed with Homebridge UI setup.
**Notes:** Token persistence must write `tuya-smartlife-token.json` under `homebridgeStoragePath`.
Browser responses must not include access or refresh tokens.

---

## Packaging And Docs Gaps

| Option | Description | Selected |
|--------|-------------|----------|
| Build on install | Avoid committed build output, but failed on the Homebridge Pi with SIGKILL. | |
| Commit built/test assets for branch installs | Keeps tarball/GitHub installs lightweight on the Pi. | ✓ |
| Wait for npm publish only | Cleaner install path, but blocks current remote Homebridge testing. | |

**User's choice:** Continue testing from PR/tarball install path.
**Notes:** Release checks should include `homebridge-ui` assets before 07-03 completes. README should
document tarball testing separately from eventual npm install.

---

## Claude's Discretion

- Exact copy, styling, endpoint labels, and polling interval can be selected pragmatically during implementation.
- QR rendering can be server-generated data URL or client-rendered, provided credentials stay server-side.

## Deferred Ideas

- Homebridge-specific Tuya credentials before broad verified release.
- Live rediscovery without restart after successful QR login.
- Polished onboarding UX after the QR path works.
