import { UpdateHub } from './updateHub';
import type { TuyaDevice } from '../discovery/types';

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

describe('UpdateHub', () => {
  it('stores the latest Tuya device snapshot by device id', () => {
    const hub = new UpdateHub();
    const snapshot = device();

    hub.replaceAll([snapshot]);

    expect(hub.get('device-1')).toEqual(snapshot);
  });

  it('notifies subscribers when a status value changes', () => {
    const hub = new UpdateHub();
    const listener = jest.fn();
    hub.replaceAll([device()]);
    hub.subscribe('device-1', listener);

    hub.applySnapshot(device({ status: { switch_1: false } }));

    expect(listener).toHaveBeenCalledWith({
      device: expect.objectContaining({ id: 'device-1', status: { switch_1: false } }),
      previous: expect.objectContaining({ id: 'device-1', status: { switch_1: true } }),
    });
  });

  it('notifies subscribers when online state changes', () => {
    const hub = new UpdateHub();
    const listener = jest.fn();
    hub.replaceAll([device()]);
    hub.subscribe('device-1', listener);

    hub.applySnapshot(device({ online: false }));

    expect(listener).toHaveBeenCalledWith({
      device: expect.objectContaining({ id: 'device-1', online: false }),
      previous: expect.objectContaining({ id: 'device-1', online: true }),
    });
  });

  it('does not notify subscribers for identical snapshots', () => {
    const hub = new UpdateHub();
    const listener = jest.fn();
    hub.replaceAll([device()]);
    hub.subscribe('device-1', listener);

    hub.applySnapshot(device());

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports unsubscribe', () => {
    const hub = new UpdateHub();
    const listener = jest.fn();
    hub.replaceAll([device()]);
    const unsubscribe = hub.subscribe('device-1', listener);

    unsubscribe();
    hub.applySnapshot(device({ status: { switch_1: false } }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('returns undefined for unknown devices', () => {
    const hub = new UpdateHub();

    expect(hub.get('missing')).toBeUndefined();
  });
});
