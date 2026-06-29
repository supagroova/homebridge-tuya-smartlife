import { TuyaReauthRequiredError } from './auth/errors';
import type { PersistedTokenInfo } from './auth/types';
import type { DiscoverDevicesResult, TuyaDevice } from './discovery/types';
import { runPlatformDiscovery } from './platformDiscovery';

function token(overrides: Partial<PersistedTokenInfo> = {}): PersistedTokenInfo {
  return {
    uid: 'uid-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expireTimeMs: Date.now() + 60_000,
    endpoint: 'https://openapi.tuya.example',
    ...overrides,
  };
}

function device(overrides: Partial<TuyaDevice> = {}): TuyaDevice {
  return {
    id: 'switch-1',
    name: 'Kitchen Switch',
    category: 'kg',
    productId: 'prod-switch',
    productName: 'Wall Switch',
    online: true,
    homeId: 'home-1',
    status: { switch_1: true },
    functions: {},
    statusRanges: {},
    reportTypes: {},
    raw: {},
    ...overrides,
  };
}

function discovery(overrides: Partial<DiscoverDevicesResult> = {}): DiscoverDevicesResult {
  return {
    homes: [{ id: 'home-1', name: 'Home' }],
    devices: [device()],
    ...overrides,
  };
}

function logMock() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

describe('runPlatformDiscovery', () => {
  it('reports re-auth required without running discovery when no token is stored', async () => {
    const log = logMock();
    const createClient = jest.fn();
    const createRepository = jest.fn();
    const registry = { reconcile: jest.fn() };

    const result = await runPlatformDiscovery({
      log,
      tokenStore: { load: jest.fn().mockResolvedValue(null) },
      createClient,
      createRepository,
      registry,
    });

    expect(result.status).toBe('reauth-required');
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('authentication is required'));
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('Open the plugin settings'));
    expect(createClient).not.toHaveBeenCalled();
    expect(createRepository).not.toHaveBeenCalled();
    expect(registry.reconcile).not.toHaveBeenCalled();
  });

  it('discovers devices and reconciles the accessory registry when a token exists', async () => {
    const log = logMock();
    const storedToken = token();
    const client = { kind: 'client' };
    const discovered = discovery();
    const reconcileResult = {
      registered: [{ displayName: 'Kitchen Switch' }],
      restored: [],
      pruned: [],
      unsupported: [],
    };
    const repository = { discoverDevices: jest.fn().mockResolvedValue(discovered) };
    const registry = { reconcile: jest.fn().mockReturnValue(reconcileResult) };
    const createClient = jest.fn().mockReturnValue(client);
    const createRepository = jest.fn().mockReturnValue(repository);

    const result = await runPlatformDiscovery({
      log,
      tokenStore: { load: jest.fn().mockResolvedValue(storedToken) },
      createClient,
      createRepository,
      registry,
    });

    expect(result).toEqual({
      status: 'success',
      homes: discovered.homes,
      devices: discovered.devices,
      reconcile: reconcileResult,
    });
    expect(createClient).toHaveBeenCalledWith(storedToken);
    expect(createRepository).toHaveBeenCalledWith(client);
    expect(repository.discoverDevices).toHaveBeenCalledTimes(1);
    expect(registry.reconcile).toHaveBeenCalledWith(discovered.devices);
    expect(log.info).toHaveBeenCalledWith(
      'Tuya discovery complete: %d homes, %d devices, %d registered, %d restored, %d pruned, %d unsupported.',
      1,
      1,
      1,
      0,
      0,
      0,
    );
  });

  it('reports re-auth required and skips registry reconciliation for auth failures', async () => {
    const log = logMock();
    const repository = {
      discoverDevices: jest.fn().mockRejectedValue(new TuyaReauthRequiredError('expired refresh token')),
    };
    const registry = { reconcile: jest.fn() };

    const result = await runPlatformDiscovery({
      log,
      tokenStore: { load: jest.fn().mockResolvedValue(token()) },
      createClient: jest.fn().mockReturnValue({}),
      createRepository: jest.fn().mockReturnValue(repository),
      registry,
    });

    expect(result.status).toBe('reauth-required');
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('re-authentication is required'));
    expect(registry.reconcile).not.toHaveBeenCalled();
  });

  it('reports discovery failures without reconciling cached accessories', async () => {
    const log = logMock();
    const failure = new Error('network down');
    const repository = { discoverDevices: jest.fn().mockRejectedValue(failure) };
    const registry = { reconcile: jest.fn() };

    const result = await runPlatformDiscovery({
      log,
      tokenStore: { load: jest.fn().mockResolvedValue(token()) },
      createClient: jest.fn().mockReturnValue({}),
      createRepository: jest.fn().mockReturnValue(repository),
      registry,
    });

    expect(result).toEqual({ status: 'failed', error: failure });
    expect(log.error).toHaveBeenCalledWith('Tuya discovery failed: %s', 'network down');
    expect(registry.reconcile).not.toHaveBeenCalled();
  });
});
