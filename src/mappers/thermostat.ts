import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';
import { parseIntegerSpec, scaleTuyaInteger, unscaleTuyaNumber } from './scaling';
import { buildBatteryMappings, type SensorMapping } from './sensor';

export type ThermostatState = 'off' | 'heat' | 'cool' | 'auto';

export type TargetTemperatureMapping = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  command(value: number): TuyaDeviceCommand;
};

export type ThermostatMapping = {
  currentTemperature: number;
  targetTemperature: TargetTemperatureMapping;
  currentState: ThermostatState;
  targetState: ThermostatState;
  battery: SensorMapping[];
  targetStateCommand(state: ThermostatState): TuyaDeviceCommand[];
};

export function buildThermostatMapping(device: TuyaDevice): ThermostatMapping | undefined {
  if (device.category !== 'wk') {
    return undefined;
  }

  const currentSpecSource = device.statusRanges.temp_current;
  const targetSpecSource = device.statusRanges.temp_set ?? device.functions.temp_set;

  if (!currentSpecSource || !targetSpecSource) {
    return undefined;
  }

  const currentSpec = parseIntegerSpec(currentSpecSource);
  const targetSpec = parseIntegerSpec(targetSpecSource);

  if (
    !currentSpec ||
    !targetSpec ||
    typeof device.status.temp_current !== 'number' ||
    typeof device.status.temp_set !== 'number'
  ) {
    return undefined;
  }

  const currentTemperature = scaleTuyaInteger(device.status.temp_current, currentSpec);
  const targetTemperature = scaleTuyaInteger(device.status.temp_set, targetSpec);

  if (currentTemperature === undefined || targetTemperature === undefined) {
    return undefined;
  }

  const state = stateFromDevice(device);

  return {
    currentTemperature,
    targetTemperature: {
      value: targetTemperature,
      min: targetSpec.minScaled,
      max: targetSpec.maxScaled,
      step: targetSpec.stepScaled,
      command: (value) => ({
        code: 'temp_set',
        value: unscaleTuyaNumber(clamp(value, targetSpec.minScaled, targetSpec.maxScaled), targetSpec),
      }),
    },
    currentState: state,
    targetState: state,
    battery: buildBatteryMappings(device),
    targetStateCommand: (targetState) => buildTargetStateCommands(device, targetState),
  };
}

function stateFromDevice(device: TuyaDevice): ThermostatState {
  if (device.status.switch === false) {
    return 'off';
  }

  if (device.status.mode === 'cool' || device.status.mode === 'auto' || device.status.mode === 'heat') {
    return device.status.mode;
  }

  return 'heat';
}

function buildTargetStateCommands(device: TuyaDevice, state: ThermostatState): TuyaDeviceCommand[] {
  if (state === 'off') {
    return [{ code: 'switch', value: false }];
  }

  const commands: TuyaDeviceCommand[] = [{ code: 'switch', value: true }];

  if (parseEnumRange(device.functions.mode?.values).includes(state)) {
    commands.push({ code: 'mode', value: state });
  }

  return commands;
}

function parseEnumRange(values: string | undefined): string[] {
  if (!values) {
    return [];
  }

  try {
    const parsed = JSON.parse(values) as { range?: unknown };

    return Array.isArray(parsed.range) ? parsed.range.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function clamp(value: number, min: number | undefined, max: number | undefined): number {
  return Math.min(max ?? value, Math.max(min ?? value, value));
}
