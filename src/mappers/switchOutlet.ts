import type { TuyaDevice } from '../discovery/types';

export type SwitchOutletServiceType = 'switch' | 'outlet';

export type SwitchOutletCommand = {
  code: string;
  value: boolean;
};

export type SwitchOutletMapping = {
  code: string;
  serviceType: SwitchOutletServiceType;
  displayName: string;
  value: boolean;
  command(value: boolean): SwitchOutletCommand;
};

const SWITCH_CATEGORIES = new Set(['kg', 'tdq']);
const OUTLET_CATEGORIES = new Set(['cz', 'pc']);

export function buildSwitchOutletMappings(device: TuyaDevice): SwitchOutletMapping[] {
  const serviceType = serviceTypeFor(device.category);

  if (serviceType === undefined) {
    return [];
  }

  const codes = Object.entries(device.status)
    .filter(([code, value]) => isSwitchCode(code) && typeof value === 'boolean')
    .map(([code]) => code)
    .sort(compareSwitchCodes);

  return codes.map((code, index) => ({
    code,
    serviceType,
    displayName: displayNameFor(device.name, code, codes.length, index),
    value: device.status[code] as boolean,
    command: (value: boolean) => ({ code, value }),
  }));
}

function serviceTypeFor(category: string): SwitchOutletServiceType | undefined {
  if (SWITCH_CATEGORIES.has(category)) {
    return 'switch';
  }

  if (OUTLET_CATEGORIES.has(category)) {
    return 'outlet';
  }

  return undefined;
}

function isSwitchCode(code: string): boolean {
  return code === 'switch' || /^switch_\d+$/.test(code) || /^switch_usb\d+$/.test(code);
}

function compareSwitchCodes(left: string, right: string): number {
  const leftRank = switchCodeRank(left);
  const rightRank = switchCodeRank(right);

  return leftRank.group - rightRank.group || leftRank.index - rightRank.index || left.localeCompare(right);
}

function switchCodeRank(code: string): { group: number; index: number } {
  if (code === 'switch') {
    return { group: 0, index: 0 };
  }

  const gang = /^switch_(\d+)$/.exec(code);
  if (gang) {
    return { group: 1, index: Number(gang[1]) };
  }

  const usb = /^switch_usb(\d+)$/.exec(code);
  if (usb) {
    return { group: 2, index: Number(usb[1]) };
  }

  return { group: 3, index: 0 };
}

function displayNameFor(deviceName: string, code: string, mappingCount: number, index: number): string {
  if (mappingCount === 1) {
    return deviceName;
  }

  const suffix = displaySuffix(code) ?? String(index + 1);

  return `${deviceName} ${suffix}`;
}

function displaySuffix(code: string): string | undefined {
  if (code === 'switch') {
    return undefined;
  }

  const gang = /^switch_(\d+)$/.exec(code);
  if (gang) {
    return gang[1];
  }

  const usb = /^switch_usb(\d+)$/.exec(code);
  if (usb) {
    return `USB ${usb[1]}`;
  }

  return undefined;
}
