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
export declare function buildSwitchOutletMappings(device: TuyaDevice): SwitchOutletMapping[];
