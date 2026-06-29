import type { API, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig } from 'homebridge';
/**
 * TuyaSmartLifePlatform is the Homebridge dynamic platform. It caches accessories restored from
 * disk and, once Homebridge has finished launching, will discover Tuya devices from the cloud.
 *
 * Device-specific services are added in later phases; this class only wires platform lifecycle.
 */
export declare class TuyaSmartLifePlatform implements DynamicPlatformPlugin {
    readonly log: Logging;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly accessories: PlatformAccessory[];
    private statusPoller;
    constructor(log: Logging, config: PlatformConfig, api: API);
    /**
     * Invoked by Homebridge for each accessory restored from cache on startup.
     */
    configureAccessory(accessory: PlatformAccessory): void;
    private discoverDevices;
}
