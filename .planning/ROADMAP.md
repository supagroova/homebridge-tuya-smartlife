# Roadmap: homebridge-tuya-smartlife

## Completed Milestones

- [x] [v1.0 Release](milestones/v1.0-SUMMARY.md) — Smart Life QR login, Tuya cloud discovery/control for switches/outlets/climate/sensors, custom config UI, polling/offline handling, release hardening, npm publish, and remote Homebridge smoke test. Completed 2026-07-01.

## Current Milestone

**Homebridge Plugin Verification**

Goal: prepare, submit, and close the Homebridge verification request for
`homebridge-tuya-smartlife` while preserving the security and release quality of v1.0.

## Phases

- [x] **Phase 9: Verification Readiness Audit** — verify repository, npm package, runtime behavior, storage/logging, install/config flow, Node 22/24 compatibility, and GitHub Release readiness.
- [x] **Phase 10: Verification Submission Package** — prepare the Homebridge verification issue body, differentiation rationale versus existing Tuya plugins, optional icon decision, and any small docs/release fixes required by the audit.
- [ ] **Phase 11: Reviewer Feedback & Approval Closeout** — track Homebridge reviewer feedback, make required fixes, publish follow-up release if needed, and add the verified badge only after approval.

## Phase Details

### Phase 9: Verification Readiness Audit

**Goal:** Prove the plugin meets Homebridge's current verification requirements before opening the request.
**Mode:** standard
**Depends on:** v1.0 release milestone
**Requirements:** VER-01, VER-05, VER-06, VER-07, VER-08, VER-09, VER-10, VER-11, VER-12, VER-13, VER-14

**Success Criteria:**

1. A checklist document records pass/fail evidence for every Homebridge verification requirement.
2. Node `v22` and `v24` gates pass, or any compatibility issue is converted into an explicit fix plan.
3. npm install/startup behavior is verified: install succeeds, unconfigured startup is safe, and configured startup still works.
4. Release readiness is verified: npm `1.0.0`, GitHub Release status, README/changelog/license, package contents, and repo issues.
5. Logging/storage/error-handling review confirms no obvious verification blocker.

**Plans:** 1/1 plans complete

Plans:

- [x] 09-01-PLAN.md — Homebridge verification readiness audit and evidence checklist.

**Result:** Mostly ready; Phase 10 must create GitHub Release `v1.0.0`, add root `LICENSE`, and add package GitHub metadata before submission.

### Phase 10: Verification Submission Package

**Goal:** Prepare the actual request artifacts and any small release/docs fixes needed before submission.
**Mode:** standard
**Depends on:** Phase 9
**Requirements:** VER-02, VER-03, VER-15

**Success Criteria:**

1. Draft verification issue body is ready to paste into `homebridge/plugins`.
2. The request clearly explains that this plugin differs from existing Tuya plugins by using Smart Life QR login with no per-user Tuya developer account.
3. Optional icon decision is made and any icon asset is prepared only if desired.
4. Any small audit fixes are committed and released before the verification issue is opened.

**Plans:** 1/1 plans complete

Plans:

- [x] 10-01-PLAN.md — Verification request issue package and final pre-submit fixes.

**Result:** GitHub Release `v1.0.0` exists, fresh Node 22/24 CI evidence passed, and the Homebridge verification issue draft is ready to submit.

### Phase 11: Reviewer Feedback & Approval Closeout

**Goal:** Respond cleanly to Homebridge review, publish fixes if needed, and only then update public verified-badge docs.
**Mode:** standard
**Depends on:** Phase 10 and submitted Homebridge verification request
**Requirements:** VER-04, VER-16

**Success Criteria:**

1. Homebridge reviewer feedback is tracked with clear pass/fix/defer outcomes.
2. Any required code/docs/package fixes are tested, released, and linked back to the verification issue.
3. Verified badge is added to README only after Homebridge approval.
4. Milestone closes with a record of the verification request URL and outcome.

**Plans:** 1/1 plans ready

Plans:

- [x] 11-01-PLAN.md — Reviewer feedback handling and verified badge closeout.

## Future / v2 Candidates

- Tuya/Homebridge-specific QR credential or explicit Tuya blessing for broad public/verified release.
- MQTT-over-WebSocket real-time push.
- Lights, dimmers, covers, fans, and additional Tuya categories.
- Tuya scenes / tap-to-run.
- Per-device DP override config.
- Optimistic writes with reconcile-on-failure.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 9. Verification Readiness Audit | 1/1 | Complete | 2026-07-01 |
| 10. Verification Submission Package | 1/1 | Complete | 2026-07-01 |
| 11. Reviewer Feedback & Approval Closeout | 0/1 | Planned | — |
