# Phase 5 Patterns

## Existing Patterns to Preserve

- Pure mappers have no Homebridge imports.
- Accessory binders use narrow HAP/accessory interfaces and fake-HAP tests.
- `onGet` returns cached status only.
- Command setters update cached status only after successful command transport.
- `platform.ts` remains a composition root, not a service-binding module.

## New Patterns for Phase 5

### Sensor Mapping Descriptor

Read-only sensor mappers should return service descriptors, not HAP services.

Expected shape:

```ts
type SensorMapping = {
  code: string;
  serviceType: 'temperature' | 'humidity' | 'contact' | 'motion' | 'leak' | 'smoke' | 'battery';
  characteristic: string;
  value: boolean | number;
};
```

### Battery Helper

Battery mapping should be a small helper that can be used by both sensor and thermostat binders.
It should not assume every device has every battery DP.

### Thermostat Mapping Descriptor

Thermostat mapper should separate:

- read mappings: current temperature, target temperature, current/target mode.
- command generation: target temp, target mode, switch off/on.
- constraints: min/max/step for target temperature.

### Registry Binding Composition

The platform bind callback should call binders in a predictable order:

1. Switch/outlet binder.
2. Sensor binder.
3. Thermostat binder.

Binders that have no mappings for a device should be no-ops.

