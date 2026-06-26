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
import { bindSensorAccessory } from './accessories/sensorAccessory';
import { bindSwitchOutletAccessory } from './accessories/switchOutletAccessory';
import { bindThermostatAccessory } from './accessories/thermostatAccessory';
import { TuyaDeviceSharingClient } from './auth/customerApi';
import { FileTokenStore } from './auth/tokenStore';
import type { PersistedTokenInfo, TokenInfo } from './auth/types';
import { DeviceRepository } from './discovery/deviceRepository';
import { AccessoryRegistry } from './platform/accessoryRegistry';
import { runPlatformDiscovery } from './platformDiscovery';
import { PLATFORM_NAME, PLUGIN_NAME, TOKEN_FILE_NAME, TUYA_CLIENT_ID } from './settings';
import { DeviceStatusPoller } from './updates/poller';
import { UpdateHub } from './updates/updateHub';

/**
 * TuyaSmartLifePlatform is the Homebridge dynamic platform. It caches accessories restored from
 * disk and, once Homebridge has finished launching, will discover Tuya devices from the cloud.
 *
 * Device-specific services are added in later phases; this class only wires platform lifecycle.
 */
export class TuyaSmartLifePlatform implements DynamicPlatformPlugin {
  public readonly accessories: PlatformAccessory[] = [];
  private statusPoller: DeviceStatusPoller | undefined;

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
    const updateHub = new UpdateHub();
    const communicationFailure = () =>
      new this.api.hap.HapStatusError(this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
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
          getDevice: (deviceId) => updateHub.get(deviceId),
          applySnapshot: (deviceSnapshot) => updateHub.applySnapshot(deviceSnapshot),
          communicationFailure,
        });
        bindSensorAccessory({
          hap: this.api.hap,
          accessory,
          device,
          getDevice: (deviceId) => updateHub.get(deviceId),
          communicationFailure,
        });
        bindThermostatAccessory({
          hap: this.api.hap,
          accessory,
          device,
          sendCommands: (deviceId, commands) => activeRepository?.sendCommands(deviceId, commands),
          getDevice: (deviceId) => updateHub.get(deviceId),
          applySnapshot: (deviceSnapshot) => updateHub.applySnapshot(deviceSnapshot),
          communicationFailure,
        });
      },
    });

    const discovery = await runPlatformDiscovery({
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

    if (discovery.status !== 'success' || activeRepository === undefined) {
      return;
    }

    updateHub.replaceAll(discovery.devices);
    this.statusPoller?.stop();
    this.statusPoller = new DeviceStatusPoller({
      repository: activeRepository,
      updateHub,
      log: this.log,
      intervalMs: 120_000,
      jitterRatio: 0.2,
      backoffMultiplier: 2,
      maxBackoffMs: 15 * 60_000,
    });
    this.statusPoller.start();
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
