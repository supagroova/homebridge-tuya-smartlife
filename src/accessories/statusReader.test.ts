import { createStatusReader } from './statusReader';
import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';

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

describe('createStatusReader', () => {
  it('reads the latest cached device snapshot by id', () => {
    const initial = device({ status: { switch_1: true } });
    const latest = device({ status: { switch_1: false } });
    const reader = createStatusReader({
      device: initial,
      getDevice: () => latest,
      communicationFailure: () => new Error('offline'),
    });

    expect(reader.currentDevice()).toBe(latest);
    expect(reader.statusValue('switch_1')).toBe(false);
  });

  it('falls back to the initially-bound device when no cached snapshot exists', () => {
    const initial = device({ status: { switch_1: true } });
    const reader = createStatusReader({
      device: initial,
      getDevice: () => undefined,
      communicationFailure: () => new Error('offline'),
    });

    expect(reader.currentDevice()).toBe(initial);
    expect(reader.statusValue('switch_1')).toBe(true);
  });

  it('throws the injected communication failure for offline devices', () => {
    const offlineError = new Error('communication failure');
    const reader = createStatusReader({
      device: device({ online: false }),
      communicationFailure: () => offlineError,
    });

    expect(() => reader.requireOnlineDevice()).toThrow(offlineError);
    expect(() => reader.statusValue('switch_1')).toThrow(offlineError);
  });

  it('applies successful command values to the latest cached snapshot', () => {
    const applySnapshot = jest.fn();
    const cached = device({ status: { switch_1: true, child_lock: false } });
    const reader = createStatusReader({
      device: device(),
      getDevice: () => cached,
      applySnapshot,
      communicationFailure: () => new Error('offline'),
    });

    const commands: TuyaDeviceCommand[] = [{ code: 'switch_1', value: false }];
    reader.applyCommandValues(commands);

    expect(applySnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'device-1',
        status: { switch_1: false, child_lock: false },
      }),
    );
    expect(cached.status.switch_1).toBe(true);
  });

  it('falls back to mutating the initial device when no apply callback exists', () => {
    const initial = device({ status: { switch_1: true } });
    const reader = createStatusReader({
      device: initial,
      communicationFailure: () => new Error('offline'),
    });

    reader.applyCommandValues([{ code: 'switch_1', value: false }]);

    expect(initial.status.switch_1).toBe(false);
  });
});
