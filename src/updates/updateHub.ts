import type { TuyaDevice } from '../discovery/types';

export type DeviceUpdateEvent = {
  device: TuyaDevice;
  previous: TuyaDevice | undefined;
};

export type DeviceUpdateListener = (event: DeviceUpdateEvent) => void;

export class UpdateHub {
  private readonly devices = new Map<string, TuyaDevice>();
  private readonly listeners = new Map<string, Set<DeviceUpdateListener>>();

  replaceAll(devices: TuyaDevice[]): void {
    for (const device of devices) {
      this.applySnapshot(device);
    }
  }

  applySnapshot(device: TuyaDevice): void {
    const previous = this.devices.get(device.id);
    this.devices.set(device.id, device);

    if (!hasChanged(previous, device)) {
      return;
    }

    for (const listener of this.listeners.get(device.id) ?? []) {
      listener({ device, previous });
    }
  }

  get(deviceId: string): TuyaDevice | undefined {
    return this.devices.get(deviceId);
  }

  subscribe(deviceId: string, listener: DeviceUpdateListener): () => void {
    let listeners = this.listeners.get(deviceId);

    if (!listeners) {
      listeners = new Set<DeviceUpdateListener>();
      this.listeners.set(deviceId, listeners);
    }

    listeners.add(listener);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        this.listeners.delete(deviceId);
      }
    };
  }
}

function hasChanged(previous: TuyaDevice | undefined, next: TuyaDevice): boolean {
  return previous === undefined || previous.online !== next.online || !statusEqual(previous.status, next.status);
}

function statusEqual(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => Object.is(left[key], right[key]));
}
