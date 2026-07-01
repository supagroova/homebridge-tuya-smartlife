# Homebridge Tuya SmartLife

[![npm](https://badgen.net/npm/v/homebridge-tuya-smartlife)](https://www.npmjs.com/package/homebridge-tuya-smartlife)
[![npm](https://badgen.net/npm/dt/homebridge-tuya-smartlife)](https://www.npmjs.com/package/homebridge-tuya-smartlife)

Homebridge plugin for Tuya / Smart Life devices using the Smart Life QR login flow. The goal is to
avoid per-user Tuya developer accounts and 6-month IoT Core trial renewals.

The current v1 focus is switches, outlets, thermometers, basic sensors, and thermostats.

## Install

Install through the Homebridge UI plugin search, or from the Homebridge server shell:

```bash
npm install -g homebridge-tuya-smartlife
```

## Test Builds

For unreleased test builds, install a GitHub tarball from a known commit:

```bash
npm install "https://github.com/supagroova/homebridge-tuya-smartlife/archive/<commit-sha>.tar.gz"
```

For the active PR branch, use the latest commit SHA from:

```text
https://github.com/supagroova/homebridge-tuya-smartlife/pull/1
```

Avoid installing this test build with `git+https://...` on Raspberry Pi / Homebridge hosts. npm
treats that as a Git dependency and runs a preparation install with dev dependencies; on low-memory
hosts this can be killed with `SIGKILL`.

## Smart Life QR Setup

1. Install the plugin and restart Homebridge if needed.
2. Open Homebridge UI.
3. Open the plugin settings for **Homebridge Tuya SmartLife**.
4. Enter your Smart Life user code.
5. Leave the default Tuya login endpoint unless you know your account needs another endpoint.
6. Click **Start QR Login**.
7. Scan the displayed QR code with the Smart Life app.
8. Wait for the settings screen to show the connected state.
9. Restart Homebridge so the platform can discover devices using the saved token.

The plugin stores its token in the Homebridge storage path as:

```text
tuya-smartlife-token.json
```

The browser UI does not receive or store the Tuya access token or refresh token.

## Supported v1 Devices

Initial support targets the author's device set:

| Tuya category | HomeKit support |
| --- | --- |
| `kg` | Switch |
| `tdq` | Switch |
| `cz` | Outlet |
| `pc` | Outlet |
| `wsdcg` | Temperature / humidity sensor |
| `mcs` | Contact sensor |
| `pir` | Motion sensor |
| `sj` | Leak sensor |
| `ywbj` | Smoke sensor |
| `wk` | Thermostat |

Multi-gang switches and multi-socket outlets expose one HomeKit service per controllable data point.

## Known Limitations

- Cloud-only: local LAN and BLE control are intentionally out of scope.
- The current development build uses the Tuya-published Home Assistant compatible QR credentials.
  A Homebridge-specific client id/schema should be revisited before broad public or verified-plugin
  release.
- Device state is polling-based. MQTT push updates are deferred to v2.
- Lights, dimmers, covers, fans, scenes, and per-device DP overrides are deferred.
- After QR login, restart Homebridge to run discovery.

## Troubleshooting

### `git dep preparation failed` / `SIGKILL` during install

Use a GitHub tarball URL instead of `git+https://...`:

```bash
npm install "https://github.com/supagroova/homebridge-tuya-smartlife/archive/<commit-sha>.tar.gz"
```

### Plugin appears but no devices are discovered

Check the Homebridge logs. If no token is stored yet, the plugin logs that Smart Life authentication
is required and asks you to open plugin settings to complete QR setup.

### QR login fails with app or region errors

Make sure you scan the QR code in the Smart Life app with the account that owns the devices. If the
error mentions region or endpoint, try the endpoint that matches your Smart Life account region.

## Development

Local verification gate:

```bash
make check
npm run release:check
```

The repository uses TDD gates, Jest, ESLint, TypeScript, and plain `tsc` output to `dist/`.
