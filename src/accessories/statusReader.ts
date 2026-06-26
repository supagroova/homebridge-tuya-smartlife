import type { TuyaDevice, TuyaDeviceCommand } from '../discovery/types';

export type StatusReaderOptions = {
  device: TuyaDevice;
  getDevice?: (deviceId: string) => TuyaDevice | undefined;
  applySnapshot?: (device: TuyaDevice) => void;
  communicationFailure: () => Error;
};

export type StatusReader = {
  currentDevice(): TuyaDevice;
  requireOnlineDevice(): TuyaDevice;
  statusValue(code: string): unknown;
  applyCommandValues(commands: TuyaDeviceCommand[]): void;
};

export function createStatusReader(options: StatusReaderOptions): StatusReader {
  return {
    currentDevice: () => currentDevice(options),
    requireOnlineDevice: () => requireOnlineDevice(options),
    statusValue: (code) => requireOnlineDevice(options).status[code],
    applyCommandValues: (commands) => applyCommandValues(options, commands),
  };
}

function currentDevice(options: StatusReaderOptions): TuyaDevice {
  return options.getDevice?.(options.device.id) ?? options.device;
}

function requireOnlineDevice(options: StatusReaderOptions): TuyaDevice {
  const device = currentDevice(options);

  if (!device.online) {
    throw options.communicationFailure();
  }

  return device;
}

function applyCommandValues(options: StatusReaderOptions, commands: TuyaDeviceCommand[]): void {
  const device = currentDevice(options);
  const nextDevice: TuyaDevice = {
    ...device,
    status: {
      ...device.status,
      ...Object.fromEntries(commands.map((command) => [command.code, command.value])),
    },
  };

  if (options.applySnapshot) {
    options.applySnapshot(nextDevice);
    return;
  }

  options.device.status = nextDevice.status;
}
