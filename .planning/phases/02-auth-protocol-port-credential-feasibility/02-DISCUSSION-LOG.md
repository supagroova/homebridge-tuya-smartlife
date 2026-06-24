# Phase 2: Auth Protocol Port + Credential Feasibility - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-24
**Phase:** 2-Auth Protocol Port + Credential Feasibility
**Areas discussed:** Auth spike boundary, Credential go/no-go, QR test UX, Token storage and refresh, Golden-vector testing

---

## Auth Spike Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Local probe only | Allow Home Assistant credentials only as a local disposable proof of the TypeScript protocol port. | yes |
| No HA credential | Avoid Home Assistant credentials entirely; rely only on own credential or mocks/golden vectors. | |
| Prototype branch only | Isolate any probe in an uncommitted or throwaway branch/script. | |

**User's choice:** Approved the proposed default: local-only proof allowed, never shipped.
**Notes:** This preserves the research conclusion that HA's credential is useful as a protocol probe but unsafe and unacceptable as a product credential.

---

## Credential Go/No-Go

| Option | Description | Selected |
|--------|-------------|----------|
| Time-box and document | Contact Tuya / investigate legitimate credential path; pick fallback if no legitimate path is found in the time-box. | yes |
| Must have credential | Block all future phases until Tuya issues this plugin its own `client_id`/`schema`. | |
| Build both paths | Implement QR device-sharing and developer-project fallback plumbing immediately. | |

**User's choice:** Approved the proposed default: time-box the legitimate credential path and document the outcome before Phase 3.
**Notes:** The fallback decision is auth-only and should not invalidate Phase 1 or downstream mapper/accessory architecture.

---

## QR Test UX

| Option | Description | Selected |
|--------|-------------|----------|
| CLI/dev script | Add a dev-only manual QR login script that exercises the same auth modules and persists tokens. | yes |
| Log QR URL only | Keep Phase 2 minimal by logging the QR token/URL only. | |
| Config UI now | Pull the custom config UI forward from Phase 7. | |

**User's choice:** Approved the proposed default: dev-only CLI/script for manual testing.
**Notes:** Phase 7 remains responsible for the production config-UI onboarding experience.

---

## Token Storage And Refresh

| Option | Description | Selected |
|--------|-------------|----------|
| Homebridge storage/local JSON | Persist tokens locally using Homebridge-compatible storage semantics; scrub secrets from logs. | yes |
| In-memory only | Keep tokens only in memory during the Phase 2 spike. | |
| Full secret manager abstraction | Add a broad secret-provider abstraction now. | |

**User's choice:** Approved the proposed default: persisted token store with safe logging and proactive refresh.
**Notes:** Refresh needs a single in-flight guard and a clear re-auth state on failure.

---

## Golden-Vector Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Golden vectors first | Port crypto/signing first, locked by deterministic Python SDK golden-vector tests before live login. | yes |
| Live probe first | Try QR login first, backfill deterministic tests later. | |
| Mock only | Avoid live protocol proof in Phase 2. | |

**User's choice:** Approved the proposed default: golden vectors first.
**Notes:** Live QR/login probes are not a substitute for byte-correct signing tests.

---

## Codex's Discretion

- Exact module names and CLI flag names are left to downstream planner/executor judgment.
- Implementation must remain within the locked stack and architecture: TypeScript, `node:crypto`, global `fetch`, Jest/ts-jest, nock, no axios/crypto-js, and no shipping HA credential.

## Deferred Ideas

- Phase 7 owns the friendly config-UI QR login screen.
- Phase 3 owns device discovery.
- Developer-project API implementation is only pulled forward if selected as the Phase 2 fallback outcome.
