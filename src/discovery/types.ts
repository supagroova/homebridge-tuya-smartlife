export type TuyaHome = {
  id: string;
  name: string;
};

export type TuyaDeviceStatus = Record<string, unknown>;

export type TuyaDeviceFunction = {
  code: string;
  type?: string;
  values?: string;
};

export type TuyaDevice = {
  id: string;
  name: string;
  category: string;
  productId?: string;
  productName?: string;
  online: boolean;
  homeId: string;
  status: TuyaDeviceStatus;
  functions: Record<string, TuyaDeviceFunction>;
  statusRanges: Record<string, TuyaDeviceFunction>;
  reportTypes: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type DiscoverDevicesResult = {
  homes: TuyaHome[];
  devices: TuyaDevice[];
};

export type TuyaDeviceCommand = {
  code: string;
  value: unknown;
};
