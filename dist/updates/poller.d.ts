import type { DiscoverDevicesResult } from '../discovery/types';
import type { UpdateHub } from './updateHub';
type PollRepository = {
    discoverDevices(): Promise<DiscoverDevicesResult>;
};
type PollLogger = {
    warn(message: string, ...parameters: unknown[]): void;
};
type PollUpdateHub = Pick<UpdateHub, 'replaceAll'>;
export type DeviceStatusPollerOptions = {
    repository: PollRepository;
    updateHub: PollUpdateHub;
    log: PollLogger;
    intervalMs: number;
    jitterRatio: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
    random?: () => number;
};
export declare class DeviceStatusPoller {
    private readonly options;
    private timer;
    private running;
    private polling;
    private nextDelayMs;
    private readonly random;
    constructor(options: DeviceStatusPollerOptions);
    start(): void;
    stop(): void;
    private schedule;
    private poll;
}
export {};
