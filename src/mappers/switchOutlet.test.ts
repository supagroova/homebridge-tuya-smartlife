import { buildSwitchOutletMappings } from './switchOutlet';
import type { TuyaDevice } from '../discovery/types';

type MappingWithCode = {
  code: string;
  displayName: string;
  serviceType: string;
};

function device(overrides: Partial<TuyaDevice> = {}): TuyaDevice {
  return {
    id: 'switch-1',
    name: 'Kitchen Switch',
    category: 'kg',
    productId: 'prod-switch',
    productName: 'Wall Switch',
    online: true,
    homeId: 'home-1',
    status: { switch_1: true },
    functions: {},
    statusRanges: {},
    reportTypes: {},
    raw: {},
    ...overrides,
  };
}

describe('buildSwitchOutletMappings', () => {
  it('maps a switch category to a HomeKit switch service', () => {
    const mappings = buildSwitchOutletMappings(device());

    expect(mappings).toEqual([
      expect.objectContaining({
        code: 'switch_1',
        serviceType: 'switch',
        displayName: 'Kitchen Switch',
        value: true,
      }),
    ]);
    expect(mappings[0]?.command(false)).toEqual({ code: 'switch_1', value: false });
  });

  it('maps outlet categories to HomeKit outlet services', () => {
    const mappings = buildSwitchOutletMappings(
      device({
        category: 'pc',
        name: 'Power Strip',
        status: { switch: false },
      }),
    );

    expect(mappings).toEqual([
      expect.objectContaining({
        code: 'switch',
        serviceType: 'outlet',
        displayName: 'Power Strip',
        value: false,
      }),
    ]);
  });

  it('orders multi-gang switch DPs deterministically', () => {
    const mappings = buildSwitchOutletMappings(
      device({
        name: 'Three Gang',
        status: {
          switch_3: false,
          switch_1: true,
          countdown_1: 10,
          switch_2: false,
        },
      }),
    );

    expect(codes(mappings)).toEqual(['switch_1', 'switch_2', 'switch_3']);
    expect(displayNames(mappings)).toEqual([
      'Three Gang 1',
      'Three Gang 2',
      'Three Gang 3',
    ]);
  });

  it('includes USB switch DPs after normal switch gangs', () => {
    const mappings = buildSwitchOutletMappings(
      device({
        category: 'cz',
        name: 'USB Outlet',
        status: {
          switch_usb2: true,
          switch_1: false,
          switch_usb1: false,
        },
      }),
    );

    expect(codes(mappings)).toEqual(['switch_1', 'switch_usb1', 'switch_usb2']);
    expect(serviceTypes(mappings)).toEqual(['outlet', 'outlet', 'outlet']);
  });

  it('ignores non-switch status values and non-boolean switch values', () => {
    const mappings = buildSwitchOutletMappings(
      device({
        status: {
          switch_1: true,
          cur_power: 123,
          switch_2: 'on',
        },
      }),
    );

    expect(codes(mappings)).toEqual(['switch_1']);
  });

  it('returns no mappings for unsupported categories', () => {
    expect(buildSwitchOutletMappings(device({ category: 'dj' }))).toEqual([]);
  });
});

function codes(mappings: MappingWithCode[]): string[] {
  return mappings.map((mapping) => mapping.code);
}

function displayNames(mappings: MappingWithCode[]): string[] {
  return mappings.map((mapping) => mapping.displayName);
}

function serviceTypes(mappings: MappingWithCode[]): string[] {
  return mappings.map((mapping) => mapping.serviceType);
}
