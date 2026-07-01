# Homebridge Verification Issue Draft

Use the **Plugin Verification Request** issue template in `homebridge/plugins`.

Issue template: https://github.com/homebridge/plugins/issues/new/choose

## Basic Details

**Plugin Name:** `homebridge-tuya-smartlife`

**Link To GitHub Repo:** `https://github.com/supagroova/homebridge-tuya-smartlife`

**Plugin Icon:** Omit for now.

Reason: Homebridge icons are optional, and this project does not currently have a square PNG icon
that is clearly free of Smart Life / Tuya trademark concerns.

## Verification Requirements

### General

**The plugin does not offer the same nor less functionality than that of any existing verified plugin.**

Answer: `Yes`

Explanation for More Information:

`homebridge-tuya-smartlife` is intentionally different from the existing Tuya Homebridge plugins
because it uses the Smart Life User Code + QR device-sharing login flow. Users do not need to create
a Tuya developer account, configure Access ID/Secret values, or renew IoT Core trial access. It is a
maintained replacement path for users affected by the abandoned `homebridge-tuya-web`, with v1
focused on switches/outlets, temperature/humidity sensors, basic binary sensors, and thermostats.

### Environment

**The plugin successfully installs and does not start unless it is configured.**

Answer: `Yes`

Evidence:

- Fresh npm install from the registry succeeded in Phase 9.
- Without a saved Smart Life token, startup logs that authentication is required and returns
  `reauth-required` without creating a Tuya client or running device discovery/control.
- Covered by `src/platformDiscovery.test.ts`.

**The plugin does not require the user to run Homebridge in a TTY or with non-standard startup parameters, even for initial configuration.**

Answer: `Yes`

Evidence:

- `config.schema.json` declares a platform plugin with `customUi: true`.
- The custom Homebridge UI handles user-code entry, QR display, scan polling, token persistence, and config save.
- Covered by `homebridge-ui/*.test.mjs`.

### Codebase

**The plugin does not contain any analytics or calls that enable you to track the user.**

Answer: `Yes`

Evidence:

- Phase 9 source search found no analytics/tracking SDKs or calls.

**If the plugin needs to write files to disk (cache, keys, etc.), it stores them inside the Homebridge storage directory.**

Answer: `Yes`

Evidence:

- Runtime token storage uses `this.api.user.storagePath()`.
- Custom UI token storage uses `this.homebridgeStoragePath`.
- Token filename is `tuya-smartlife-token.json`.

**The plugin does not throw unhandled exceptions, the plugin must catch and log its own errors.**

Answer: `Yes`

Evidence:

- Discovery catches re-auth and generic discovery failures, logs them, and returns status instead of throwing.
- Auth and UI paths return controlled errors for known QR/login states.
- Covered by targeted auth, discovery, and UI tests.

## More Information

`homebridge-tuya-smartlife` brings Tuya / Smart Life devices into HomeKit through the Smart Life
device-sharing QR login flow. The plugin's core value is that users can connect their existing Smart
Life account without creating a Tuya developer account or maintaining a 6-month IoT Core trial.

Supported v1 device types:

- Switches and outlets, including multi-gang / multi-socket devices.
- Temperature and humidity sensors.
- Contact, motion, leak, and smoke sensors.
- Basic thermostat support.

Security and privacy notes:

- The browser UI does not receive or store Tuya access or refresh tokens.
- Tokens are persisted under the Homebridge storage directory.
- Default logs do not include Smart Life user codes, QR tokens, access tokens, refresh tokens,
  encrypted payloads, or request signatures.
- Debug diagnostics are gated by the plugin debug setting and are redacted.
- The plugin contains no analytics or tracking.

Verification evidence:

- npm package: https://www.npmjs.com/package/homebridge-tuya-smartlife
- GitHub repository: https://github.com/supagroova/homebridge-tuya-smartlife
- GitHub Release: https://github.com/supagroova/homebridge-tuya-smartlife/releases/tag/v1.0.0
- CI evidence:
  - `main` CI run `28521627541` passed Node 22 and Node 24 on commit `2050127`.
  - `v1.0.0` tag CI run `28523419836` passed Node 22 and Node 24 on commit `2050127`.

Current caveats to mention only if relevant:

- The plugin is cloud-only; local LAN and BLE control are intentionally out of scope.
- Device state is polling-based; MQTT push updates are deferred.
- The current QR flow uses the Tuya-published Home Assistant compatible client id/schema. A
  Homebridge-specific client id/schema can be pursued if reviewers require it.
