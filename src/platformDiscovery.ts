import { TuyaReauthRequiredError } from './auth/errors';
import type { PersistedTokenInfo } from './auth/types';
import type { TokenStore } from './auth/tokenStore';
import type { DiscoverDevicesResult, TuyaDevice, TuyaHome } from './discovery/types';
import type { AccessoryReconcileResult, RegistryAccessory } from './platform/accessoryRegistry';

type DiscoveryLogger = {
  info(message: string, ...parameters: unknown[]): void;
  warn(message: string, ...parameters: unknown[]): void;
  error(message: string, ...parameters: unknown[]): void;
};

type DiscoveryRepository = {
  discoverDevices(): Promise<DiscoverDevicesResult>;
};

type AccessoryRegistryLike<TAccessory extends RegistryAccessory> = {
  reconcile(devices: TuyaDevice[]): AccessoryReconcileResult<TAccessory>;
};

export type PlatformDiscoveryOptions<TClient, TAccessory extends RegistryAccessory> = {
  log: DiscoveryLogger;
  tokenStore: Pick<TokenStore, 'load'>;
  createClient(token: PersistedTokenInfo): TClient;
  createRepository(client: TClient): DiscoveryRepository;
  registry: AccessoryRegistryLike<TAccessory>;
};

export type PlatformDiscoveryResult<TAccessory extends RegistryAccessory> =
  | {
      status: 'success';
      homes: TuyaHome[];
      devices: TuyaDevice[];
      reconcile: AccessoryReconcileResult<TAccessory>;
    }
  | {
      status: 'reauth-required';
    }
  | {
      status: 'failed';
      error: unknown;
    };

export async function runPlatformDiscovery<TClient, TAccessory extends RegistryAccessory>(
  options: PlatformDiscoveryOptions<TClient, TAccessory>,
): Promise<PlatformDiscoveryResult<TAccessory>> {
  const token = await options.tokenStore.load();

  if (token === null) {
    options.log.warn(
      'Tuya Smart Life authentication is required before device discovery can run. Open the plugin settings to complete QR setup.',
    );

    return { status: 'reauth-required' };
  }

  try {
    const client = options.createClient(token);
    const repository = options.createRepository(client);
    const discovery = await repository.discoverDevices();
    const reconcile = options.registry.reconcile(discovery.devices);

    options.log.info(
      'Tuya discovery complete: %d homes, %d devices, %d registered, %d restored, %d pruned, %d unsupported.',
      discovery.homes.length,
      discovery.devices.length,
      reconcile.registered.length,
      reconcile.restored.length,
      reconcile.pruned.length,
      reconcile.unsupported.length,
    );

    return {
      status: 'success',
      homes: discovery.homes,
      devices: discovery.devices,
      reconcile,
    };
  } catch (error) {
    if (error instanceof TuyaReauthRequiredError) {
      options.log.warn('Tuya Smart Life re-authentication is required before device discovery can run.');

      return { status: 'reauth-required' };
    }

    options.log.error('Tuya discovery failed: %s', errorMessage(error));

    return { status: 'failed', error };
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
