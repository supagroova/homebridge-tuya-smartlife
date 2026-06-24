// tdd-audit: exempt
import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';

/**
 * TuyaSmartLifePlatform is the Homebridge dynamic platform. It caches accessories restored from
 * disk and, once Homebridge has finished launching, will discover Tuya devices from the cloud.
 *
 * Device discovery is implemented in Phase 3 — for now didFinishLaunching is a logged no-op.
 */
export class TuyaSmartLifePlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Initialising %s platform (%s)', PLATFORM_NAME, PLUGIN_NAME);

    // HAP types/Characteristics are accessed via this.api.hap (never imported directly).
    this.log.debug('Using HAP characteristics: %s', this.api.hap.Characteristic !== undefined);

    this.api.on('didFinishLaunching', () => {
      // Device discovery is implemented in Phase 3.
      this.log.info('didFinishLaunching: device discovery is implemented in Phase 3.');
    });
  }

  /**
   * Invoked by Homebridge for each accessory restored from cache on startup.
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache: %s', accessory.displayName);
    this.accessories.push(accessory);
  }
}
