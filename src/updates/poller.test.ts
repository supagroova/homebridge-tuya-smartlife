import { DeviceStatusPoller } from './poller';
import type { DiscoverDevicesResult, TuyaDevice } from '../discovery/types';

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function device(overrides: Partial<TuyaDevice> = {}): TuyaDevice {
  return {
    id: 'device-1',
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

function discovery(devices: TuyaDevice[]): DiscoverDevicesResult {
  return {
    homes: [{ id: 'home-1', name: 'Home' }],
    devices,
  };
}

describe('DeviceStatusPoller', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs an immediate first poll and stores discovered devices', async () => {
    const repository = { discoverDevices: jest.fn().mockResolvedValue(discovery([device()])) };
    const updateHub = { replaceAll: jest.fn() };
    const poller = new DeviceStatusPoller({
      repository,
      updateHub,
      log: { warn: jest.fn() },
      intervalMs: 1000,
      jitterRatio: 0,
      backoffMultiplier: 2,
      maxBackoffMs: 8000,
      random: () => 0.5,
    });

    poller.start();
    await jest.runOnlyPendingTimersAsync();

    expect(repository.discoverDevices).toHaveBeenCalledTimes(1);
    expect(updateHub.replaceAll).toHaveBeenCalledWith([device()]);
  });

  it('schedules the next poll with deterministic jitter', async () => {
    const repository = { discoverDevices: jest.fn().mockResolvedValue(discovery([device()])) };
    const updateHub = { replaceAll: jest.fn() };
    const poller = new DeviceStatusPoller({
      repository,
      updateHub,
      log: { warn: jest.fn() },
      intervalMs: 1000,
      jitterRatio: 0.2,
      backoffMultiplier: 2,
      maxBackoffMs: 8000,
      random: () => 1,
    });

    poller.start();
    await jest.runOnlyPendingTimersAsync();
    expect(repository.discoverDevices).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1199);
    expect(repository.discoverDevices).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(1);
    expect(repository.discoverDevices).toHaveBeenCalledTimes(2);
  });

  it('logs failed polls, preserves cache, and backs off up to the cap', async () => {
    const repository = {
      discoverDevices: jest
        .fn()
        .mockRejectedValueOnce(new Error('cloud failed'))
        .mockRejectedValueOnce(new Error('still failed'))
        .mockResolvedValue(discovery([device({ status: { switch_1: false } })])),
    };
    const updateHub = { replaceAll: jest.fn() };
    const log = { warn: jest.fn() };
    const poller = new DeviceStatusPoller({
      repository,
      updateHub,
      log,
      intervalMs: 1000,
      jitterRatio: 0,
      backoffMultiplier: 3,
      maxBackoffMs: 2500,
      random: () => 0.5,
    });

    poller.start();
    await jest.runOnlyPendingTimersAsync();

    expect(log.warn).toHaveBeenCalledWith('Tuya status poll failed: %s', 'cloud failed');
    expect(updateHub.replaceAll).not.toHaveBeenCalledWith([]);

    await jest.advanceTimersByTimeAsync(2500);
    expect(repository.discoverDevices).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(2500);
    expect(repository.discoverDevices).toHaveBeenCalledTimes(3);
    expect(updateHub.replaceAll).toHaveBeenCalledWith([device({ status: { switch_1: false } })]);
  });

  it('does not overlap polls when a previous poll is still running', async () => {
    const firstPoll = deferred<DiscoverDevicesResult>();
    const repository = { discoverDevices: jest.fn().mockReturnValue(firstPoll.promise) };
    const updateHub = { replaceAll: jest.fn() };
    const poller = new DeviceStatusPoller({
      repository,
      updateHub,
      log: { warn: jest.fn() },
      intervalMs: 1000,
      jitterRatio: 0,
      backoffMultiplier: 2,
      maxBackoffMs: 8000,
      random: () => 0.5,
    });

    poller.start();
    await jest.advanceTimersByTimeAsync(5000);

    expect(repository.discoverDevices).toHaveBeenCalledTimes(1);

    firstPoll.resolve(discovery([device()]));
    await jest.runOnlyPendingTimersAsync();

    expect(updateHub.replaceAll).toHaveBeenCalledWith([device()]);
  });

  it('stop prevents later polls', async () => {
    const repository = { discoverDevices: jest.fn().mockResolvedValue(discovery([device()])) };
    const updateHub = { replaceAll: jest.fn() };
    const poller = new DeviceStatusPoller({
      repository,
      updateHub,
      log: { warn: jest.fn() },
      intervalMs: 1000,
      jitterRatio: 0,
      backoffMultiplier: 2,
      maxBackoffMs: 8000,
      random: () => 0.5,
    });

    poller.start();
    await jest.runOnlyPendingTimersAsync();
    poller.stop();
    await jest.advanceTimersByTimeAsync(5000);

    expect(repository.discoverDevices).toHaveBeenCalledTimes(1);
  });
});
