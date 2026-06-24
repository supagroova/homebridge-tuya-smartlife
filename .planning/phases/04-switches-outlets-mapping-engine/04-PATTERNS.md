# Phase 4 Patterns

## Existing Patterns to Preserve

- Pure domain modules live outside Homebridge glue and get direct Jest coverage.
- Homebridge API integration stays thin and can be exempt when it is only composition.
- Narrow local interfaces are preferred over depending on full concrete classes in tests.
- Accessory lifecycle remains centralized in `AccessoryRegistry`.
- No cloud request happens in a HomeKit getter.

## New Patterns for Phase 4

### Pure Mapper First

Create mappers that accept `TuyaDevice` and return plain objects. They should not import Homebridge.

Expected shape:

```ts
type SwitchOutletMapping = {
  code: string;
  serviceType: 'switch' | 'outlet';
  displayName: string;
  value: boolean;
  command(value: boolean): { code: string; value: boolean };
};
```

### HAP Binder Second

Homebridge service creation and characteristic wiring belongs in `src/accessories/`.
The binder consumes mapper output and a narrow command sender.

### Repository Owns Transport

`DeviceRepository.sendCommands()` should be the only Phase 4 command transport method.
It accepts plain command objects and forwards them to the signed API.

### Deterministic Service Subtypes

Use the Tuya DP code as the HomeKit service subtype, for example `switch_1`. This makes
multi-gang service reuse deterministic across restarts.

