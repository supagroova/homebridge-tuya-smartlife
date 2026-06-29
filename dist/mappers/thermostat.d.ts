import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';
import { type SensorMapping } from './sensor';
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
export declare function buildThermostatMapping(device: TuyaDevice): ThermostatMapping | undefined;
