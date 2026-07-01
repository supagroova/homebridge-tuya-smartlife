# Homebridge Plugin Verification Research

**Verified:** 2026-07-01
**Scope:** Requirements and submission process for verifying `homebridge-tuya-smartlife`.

## Sources

- Homebridge plugins repository: https://github.com/homebridge/plugins
- Homebridge verified plugins wiki: https://github.com/homebridge/homebridge/wiki/Verified-Plugins
- Verification issue template: https://github.com/homebridge/plugins/blob/latest/.github/ISSUE_TEMPLATE/1_verification-request.yml

## Current Process

Homebridge verification is requested by opening a **Plugin Verification Request issue** in
`homebridge/plugins`, not by submitting a pull request that adds the plugin to a list.

The request asks for:

- Plugin name as published on npm.
- Link to the GitHub repository.
- Optional square PNG icon, around 100x100.
- Confirmation answers for the verification requirements.
- More information for anything that needs explanation.

## Requirements To Satisfy

The Homebridge project team checks that the plugin:

- Is a dynamic platform plugin.
- Does not offer the same or less functionality than an existing verified plugin.
- Is published to npm.
- Has source code available on GitHub with issues enabled.
- Has a GitHub release for every new plugin version, with release notes.
- Runs on supported Node LTS versions, currently Node `v22` and `v24`.
- Installs successfully and does not start unless configured.
- Does not execute post-install scripts that modify the user's system.
- Does not require a TTY or non-standard Homebridge startup parameters, including for initial configuration.
- Implements the Homebridge Plugin Settings GUI.
- Does not contain analytics or calls that enable user tracking.
- Stores any cache, keys, tokens, or other files inside the Homebridge storage directory.
- Catches and logs its own errors rather than throwing unhandled exceptions.

## Project-Specific Review Points

- Existing verified Tuya plugins create a comparison risk. The verification request should explain
  that this plugin is a maintained Smart Life QR-login replacement path and does not require each
  user to create a Tuya developer account.
- The Homebridge verified badge must not be added until approval is granted.
- A GitHub Release for `1.0.0` is likely required before submitting the request.
- The npm version is `1.0.0`; GitHub release/tag conventions should use `v1.0.0` even though the
  GSD milestone archive tag is `v1.0`.
- The issue should mention that token storage uses the Homebridge storage directory and that logs
  omit/redact Smart Life user codes, QR tokens, access tokens, refresh tokens, encrypted payloads,
  and request signatures.
