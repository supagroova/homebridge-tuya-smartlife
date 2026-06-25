import type {
  DiscoverDevicesResult,
  TuyaDevice,
  TuyaDeviceCommand,
  TuyaDeviceFunction,
  TuyaHome,
} from './types';

type DiscoveryClient = {
  get(path: string, params?: Record<string, unknown>): Promise<{ result?: unknown }>;
  post(
    path: string,
    params?: Record<string, unknown>,
    body?: Record<string, unknown>,
  ): Promise<{ result?: unknown }>;
};

type RawHome = {
  ownerId: string | number;
  name?: string;
};

type RawDevice = {
  id: string;
  name?: string;
  category?: string;
  product_id?: string;
  product_name?: string;
  online?: boolean;
  status?: Array<{ code: string; value: unknown }>;
  [key: string]: unknown;
};

type SpecificationResult = {
  functions?: TuyaDeviceFunction[];
  status?: TuyaDeviceFunction[];
};

export class DeviceRepository {
  constructor(private readonly client: DiscoveryClient) {}

  async queryHomes(): Promise<TuyaHome[]> {
    const response = await this.client.get('/v1.0/m/life/users/homes');
    const homes = asArray<RawHome>(response.result);

    return homes.map((home) => ({
      id: String(home.ownerId),
      name: home.name ?? String(home.ownerId),
    }));
  }

  async queryDevicesByHome(homeId: string): Promise<TuyaDevice[]> {
    const response = await this.client.get('/v1.0/m/life/ha/home/devices', { homeId });
    const rawDevices = asArray<RawDevice>(response.result);

    return Promise.all(rawDevices.map((device) => this.normalizeDevice(homeId, device)));
  }

  async discoverDevices(): Promise<DiscoverDevicesResult> {
    const homes = await this.queryHomes();
    const deviceGroups = await Promise.all(homes.map((home) => this.queryDevicesByHome(home.id)));

    return {
      homes,
      devices: deviceGroups.flat(),
    };
  }

  async sendCommands(deviceId: string, commands: TuyaDeviceCommand[]): Promise<void> {
    await this.client.post(`/v1.1/m/thing/${deviceId}/commands`, undefined, { commands });
  }

  private async normalizeDevice(homeId: string, raw: RawDevice): Promise<TuyaDevice> {
    const [specification, statusRanges, reportTypes] = await Promise.all([
      this.querySpecifications(raw.id),
      this.queryStatusRanges(raw.id),
      this.queryReportTypes(raw.id),
    ]);

    return {
      id: raw.id,
      name: raw.name ?? raw.id,
      category: raw.category ?? '',
      productId: raw.product_id,
      productName: raw.product_name,
      online: raw.online ?? false,
      homeId,
      status: Object.fromEntries((raw.status ?? []).map((item) => [item.code, item.value])),
      functions: byCode(specification.functions ?? []),
      statusRanges: {
        ...byCode(specification.status ?? []),
        ...byCode(statusRanges),
      },
      reportTypes,
      raw,
    };
  }

  private async querySpecifications(deviceId: string): Promise<SpecificationResult> {
    const response = await this.client.get(`/v1.1/m/life/${deviceId}/specifications`);

    return (response.result ?? {}) as SpecificationResult;
  }

  private async queryStatusRanges(deviceId: string): Promise<TuyaDeviceFunction[]> {
    const response = await this.client.get(`/v1.0/m/life/devices/${deviceId}/status`);

    return asArray<TuyaDeviceFunction>(response.result);
  }

  private async queryReportTypes(deviceId: string): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/v1.0/m/life/ha/${deviceId}/dp-report-types`);

    return (response.result ?? {}) as Record<string, unknown>;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function byCode(items: TuyaDeviceFunction[]): Record<string, TuyaDeviceFunction> {
  return Object.fromEntries(items.map((item) => [item.code, item]));
}
