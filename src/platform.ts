// tdd-audit: exempt
import { join } from 'node:path';

import type {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
} from 'homebridge';

import { TuyaReauthRequiredError } from './auth/errors';
import { bindSwitchOutletAccessory } from './accessories/switchOutletAccessory';
import { TuyaDeviceSharingClient } from './auth/customerApi';
import { FileTokenStore } from './auth/tokenStore';
import type { PersistedTokenInfo, TokenInfo } from './auth/types';
import { DeviceRepository } from './discovery/deviceRepository';
import { AccessoryRegistry } from './platform/accessoryRegistry';
import { runPlatformDiscovery } from './platformDiscovery';
import { PLATFORM_NAME, PLUGIN_NAME, TOKEN_FILE_NAME, TUYA_CLIENT_ID } from './settings';

/**
 * TuyaSmartLifePlatform is the Homebridge dynamic platform. It caches accessories restored from
 * disk and, once Homebridge has finished launching, will discover Tuya devices from the cloud.
 *
 * Device-specific services are added in later phases; this class only wires platform lifecycle.
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
      void this.discoverDevices();
    });
  }

  /**
   * Invoked by Homebridge for each accessory restored from cache on startup.
   */
  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache: %s', accessory.displayName);
    this.accessories.push(accessory);
  }

  private async discoverDevices(): Promise<void> {
    const tokenStore = new FileTokenStore(join(this.api.user.storagePath(), TOKEN_FILE_NAME));
    let activeRepository: DeviceRepository | undefined;
    const registry = new AccessoryRegistry<PlatformAccessory>({
      api: this.api,
      pluginName: PLUGIN_NAME,
      platformName: PLATFORM_NAME,
      cachedAccessories: this.accessories,
      bindAccessory: (accessory, device) => {
        if (activeRepository === undefined) {
          throw new Error('Device repository is not ready');
        }

        bindSwitchOutletAccessory({
          hap: this.api.hap,
          accessory,
          device,
          sendCommands: (deviceId, commands) => activeRepository?.sendCommands(deviceId, commands),
        });
      },
    });

    await runPlatformDiscovery({
      log: this.log,
      tokenStore,
      createClient: (token) =>
        new TuyaDeviceSharingClient({
          clientId: TUYA_CLIENT_ID,
          endpoint: requireEndpoint(token),
          token,
          onTokenUpdate: (nextToken) => tokenStore.save(mergeTokenUpdate(token, nextToken)),
        }),
      createRepository: (client) => {
        activeRepository = new DeviceRepository(client);

        return activeRepository;
      },
      registry,
    });
  }
}

function requireEndpoint(token: PersistedTokenInfo): string {
  if (!token.endpoint) {
    throw new TuyaReauthRequiredError('missing endpoint');
  }

  return token.endpoint;
}

function mergeTokenUpdate(storedToken: PersistedTokenInfo, nextToken: TokenInfo): PersistedTokenInfo {
  return {
    ...storedToken,
    ...nextToken,
  };
}
