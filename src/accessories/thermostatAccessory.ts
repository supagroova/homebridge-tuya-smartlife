import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';
import { buildThermostatMapping, type ThermostatMapping, type ThermostatState } from '../mappers/thermostat';
import type { SensorMapping } from '../mappers/sensor';

type CharacteristicLike = {
  onGet(handler: () => unknown): CharacteristicLike;
  onSet(handler: (value: unknown) => void | Promise<void>): CharacteristicLike;
};

type ServiceLike = {
  getCharacteristic(characteristic: unknown): CharacteristicLike;
  setCharacteristic?(characteristic: unknown, value: unknown): ServiceLike;
};

type AccessoryLike = {
  context: Record<string, unknown>;
  getServiceById(serviceConstructor: unknown, subType: string): ServiceLike | undefined;
  addService(serviceConstructor: unknown, displayName: string, subType: string): ServiceLike;
};

type HapLike = {
  Service: {
    Thermostat: unknown;
    Battery: unknown;
  };
  Characteristic: {
    CurrentTemperature: unknown;
    TargetTemperature: unknown;
    CurrentHeatingCoolingState: HeatingCoolingCharacteristicLike;
    TargetHeatingCoolingState: TargetHeatingCoolingCharacteristicLike;
    TemperatureDisplayUnits: {
      token?: unknown;
      CELSIUS: unknown;
    };
    BatteryLevel: unknown;
    StatusLowBattery: unknown;
  };
};

type HeatingCoolingCharacteristicLike = {
  token?: unknown;
  OFF: unknown;
  HEAT: unknown;
  COOL: unknown;
};

type TargetHeatingCoolingCharacteristicLike = HeatingCoolingCharacteristicLike & {
  AUTO: unknown;
};

export type ThermostatCommandSender = (deviceId: string, commands: TuyaDeviceCommand[]) => Promise<void> | void;

export type BindThermostatAccessoryOptions = {
  hap: HapLike;
  accessory: AccessoryLike;
  device: TuyaDevice;
  sendCommands: ThermostatCommandSender;
};

const THERMOSTAT_SUBTYPE = 'thermostat';
const BATTERY_SUBTYPE = 'battery';

export function bindThermostatAccessory(options: BindThermostatAccessoryOptions): void {
  const mapping = buildThermostatMapping(options.device);

  if (!mapping) {
    return;
  }

  options.accessory.context.tuyaStatus = { ...options.device.status };

  const service =
    options.accessory.getServiceById(options.hap.Service.Thermostat, THERMOSTAT_SUBTYPE) ??
    options.accessory.addService(options.hap.Service.Thermostat, options.device.name, THERMOSTAT_SUBTYPE);

  bindThermostatCharacteristics(options, service);
  bindBatteryCharacteristics(options, mapping);
}

function bindThermostatCharacteristics(options: BindThermostatAccessoryOptions, service: ServiceLike): void {
  service.getCharacteristic(options.hap.Characteristic.CurrentTemperature).onGet(() => {
    return currentMapping(options)?.currentTemperature;
  });
  service.getCharacteristic(options.hap.Characteristic.TargetTemperature).onGet(() => {
    return currentMapping(options)?.targetTemperature.value;
  });
  service
    .getCharacteristic(characteristicToken(options.hap.Characteristic.CurrentHeatingCoolingState))
    .onGet(() => currentStateValue(options.hap, currentMapping(options)?.currentState));
  service
    .getCharacteristic(characteristicToken(options.hap.Characteristic.TargetHeatingCoolingState))
    .onGet(() => targetStateValue(options.hap, currentMapping(options)?.targetState))
    .onSet((value) => setTargetState(options, value));
  service.getCharacteristic(options.hap.Characteristic.TargetTemperature).onSet((value) => {
    return setTargetTemperature(options, value);
  });
  service.setCharacteristic?.(
    characteristicToken(options.hap.Characteristic.TemperatureDisplayUnits),
    options.hap.Characteristic.TemperatureDisplayUnits.CELSIUS,
  );
}

function bindBatteryCharacteristics(options: BindThermostatAccessoryOptions, mapping: ThermostatMapping): void {
  for (const batteryMapping of mapping.battery) {
    const service =
      options.accessory.getServiceById(options.hap.Service.Battery, BATTERY_SUBTYPE) ??
      options.accessory.addService(options.hap.Service.Battery, `${options.device.name} Battery`, BATTERY_SUBTYPE);

    service.getCharacteristic(batteryCharacteristicFor(options.hap, batteryMapping)).onGet(() => batteryMapping.value);
  }
}

async function setTargetTemperature(options: BindThermostatAccessoryOptions, value: unknown): Promise<void> {
  if (typeof value !== 'number') {
    return;
  }

  const mapping = currentMapping(options);

  if (!mapping) {
    return;
  }

  const command = mapping.targetTemperature.command(value);
  await options.sendCommands(options.device.id, [command]);
  options.device.status[command.code] = command.value;
  options.accessory.context.tuyaStatus = { ...options.device.status };
}

async function setTargetState(options: BindThermostatAccessoryOptions, value: unknown): Promise<void> {
  const state = stateFromTargetValue(options.hap, value);
  const mapping = currentMapping(options);

  if (!state || !mapping) {
    return;
  }

  const commands = mapping.targetStateCommand(state);
  await options.sendCommands(options.device.id, commands);

  for (const command of commands) {
    options.device.status[command.code] = command.value;
  }

  options.accessory.context.tuyaStatus = { ...options.device.status };
}

function currentMapping(options: BindThermostatAccessoryOptions): ThermostatMapping | undefined {
  return buildThermostatMapping(options.device);
}

function currentStateValue(hap: HapLike, state: ThermostatState | undefined): unknown {
  if (state === 'off') {
    return hap.Characteristic.CurrentHeatingCoolingState.OFF;
  }

  if (state === 'cool') {
    return hap.Characteristic.CurrentHeatingCoolingState.COOL;
  }

  return hap.Characteristic.CurrentHeatingCoolingState.HEAT;
}

function targetStateValue(hap: HapLike, state: ThermostatState | undefined): unknown {
  switch (state) {
    case 'off':
      return hap.Characteristic.TargetHeatingCoolingState.OFF;
    case 'cool':
      return hap.Characteristic.TargetHeatingCoolingState.COOL;
    case 'auto':
      return hap.Characteristic.TargetHeatingCoolingState.AUTO;
    case 'heat':
    case undefined:
      return hap.Characteristic.TargetHeatingCoolingState.HEAT;
  }
}

function stateFromTargetValue(hap: HapLike, value: unknown): ThermostatState | undefined {
  if (value === hap.Characteristic.TargetHeatingCoolingState.OFF) {
    return 'off';
  }

  if (value === hap.Characteristic.TargetHeatingCoolingState.COOL) {
    return 'cool';
  }

  if (value === hap.Characteristic.TargetHeatingCoolingState.AUTO) {
    return 'auto';
  }

  if (value === hap.Characteristic.TargetHeatingCoolingState.HEAT) {
    return 'heat';
  }

  return undefined;
}

function batteryCharacteristicFor(hap: HapLike, mapping: SensorMapping): unknown {
  if (mapping.characteristic === 'statusLowBattery') {
    return hap.Characteristic.StatusLowBattery;
  }

  return hap.Characteristic.BatteryLevel;
}

function characteristicToken(characteristic: { token?: unknown }): unknown {
  return characteristic.token ?? characteristic;
}
