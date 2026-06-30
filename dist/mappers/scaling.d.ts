import type { TuyaDeviceFunction } from '../discovery/types';
export type TuyaIntegerSpec = {
    min?: number;
    max?: number;
    scale: number;
    step?: number;
    unit?: string;
    minScaled?: number;
    maxScaled?: number;
    stepScaled?: number;
};
export declare function parseIntegerSpec(spec: TuyaDeviceFunction): TuyaIntegerSpec | undefined;
export declare function scaleTuyaInteger(rawValue: number, spec: TuyaIntegerSpec | undefined): number | undefined;
export declare function unscaleTuyaNumber(value: number, spec: TuyaIntegerSpec | undefined): number | undefined;
