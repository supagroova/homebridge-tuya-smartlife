# Phase 11 Feedback Log

**Verification issue:** https://github.com/homebridge/plugins/issues/1101
**Status:** reviewer feedback fixed locally; patch publish pending
**Submitted:** 2026-07-01
**Last checked:** 2026-07-01

## Timeline

- 2026-07-01: Phase 11 execution started.
- 2026-07-01: Checked `homebridge/plugins` issues for `homebridge-tuya-smartlife`; no matching verification issue found.
- 2026-07-01: Recorded waiting-for-submission state. Use `../10-verification-submission-package/10-VERIFICATION-ISSUE-DRAFT.md` to open the Homebridge Plugin Verification Request.
- 2026-07-01: Verification request submitted as `homebridge/plugins#1101`.
- 2026-07-01: Checked issue `#1101`; state is `OPEN`, labels are `pending` and `request-verification`, and there are no reviewer comments yet.
- 2026-07-01: Homebridge review bot reported package metadata, config schema, and dependency declaration failures in issue comment `4857626539`.

## Reviewer Requests

| ID | Source | Request | Classification | Action | Status | Evidence |
|----|--------|---------|----------------|--------|--------|----------|
| HB-01 | Homebridge review bot | `homepage` missing or not `https://` in published npm metadata. | accepted | Publish patch release with `homepage` metadata. | fixed locally; publish pending | Local `package.json` contains `homepage`; npm `1.0.0` metadata did not. |
| HB-02 | Homebridge review bot | `bugs.url` missing in published npm metadata. | accepted | Publish patch release with `bugs.url` metadata. | fixed locally; publish pending | Local `package.json` contains `bugs.url`; npm `1.0.0` metadata did not. |
| HB-03 | Homebridge review bot | `config.schema.json` uses invalid field-level `required`. | accepted | Move `required` to object-level JSON Schema array. | fixed locally; publish pending | `config.schema.json` updated for `1.0.1`. |
| HB-04 | Homebridge review bot | `homebridge` must only be in `devDependencies`. | accepted | Remove `peerDependencies.homebridge`; keep `devDependencies.homebridge`. | fixed locally; publish pending | `package.json` updated for `1.0.1`. |

## Decisions

- Do not add the Homebridge verified badge until Homebridge approval is granted.
- Do not mark `VER-04`, `VER-16`, or Phase 11 complete until the verification issue is submitted and review has a real outcome.
- A patch release is required because the bot checks the published npm package metadata; npm `1.0.0` cannot be mutated after publish.

## Submission Draft

Use:

`../10-verification-submission-package/10-VERIFICATION-ISSUE-DRAFT.md`

Template URL:

https://github.com/homebridge/plugins/issues/new/choose
