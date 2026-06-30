import type { TuyaDevice } from '../discovery/types';
export type SensorServiceType = 'temperature' | 'humidity' | 'contact' | 'motion' | 'leak' | 'smoke' | 'battery';
export type SensorCharacteristic = 'currentTemperature' | 'currentRelativeHumidity' | 'contactSensorState' | 'motionDetected' | 'leakDetected' | 'smokeDetected' | 'batteryLevel' | 'statusLowBattery';
export type SensorMapping = {
    code: string;
    serviceType: SensorServiceType;
    characteristic: SensorCharacteristic;
    value: boolean | number;
};
export declare function buildSensorMappings(device: TuyaDevice): SensorMapping[];
export declare function buildBatteryMappings(device: TuyaDevice): SensorMapping[];
