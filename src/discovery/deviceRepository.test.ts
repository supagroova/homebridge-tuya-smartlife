import { TuyaReauthRequiredError } from '../auth/errors';

import { DeviceRepository } from './deviceRepository';

type GetCall = {
  path: string;
  params?: Record<string, unknown>;
};

class FakeClient {
  calls: GetCall[] = [];
  failWith?: Error;

  async get(path: string, params?: Record<string, unknown>): Promise<{ result: unknown }> {
    this.calls.push({ path, params });

    if (this.failWith) {
      throw this.failWith;
    }

    if (path === '/v1.0/m/life/users/homes') {
      return {
        result: [
          { ownerId: 123, name: 'Main Home' },
          { ownerId: 'home-2', name: 'Pool House' },
        ],
      };
    }

    if (path === '/v1.0/m/life/ha/home/devices' && params?.homeId === '123') {
      return {
        result: [
          {
            id: 'switch-1',
            name: 'Kitchen Switch',
            category: 'kg',
            product_id: 'prod-switch',
            product_name: 'Wall Switch',
            online: true,
            status: [{ code: 'switch_1', value: true }],
          },
          {
            id: 'thermo-1',
            name: 'Hall Thermometer',
            category: 'wsdcg',
            product_id: 'prod-thermo',
            product_name: 'Temp Humidity Sensor',
            online: true,
            status: [
              { code: 'temp_current', value: 215 },
              { code: 'humidity_value', value: 47 },
            ],
          },
        ],
      };
    }

    if (path === '/v1.0/m/life/ha/home/devices' && params?.homeId === 'home-2') {
      return {
        result: [
          {
            id: 'light-1',
            name: 'Unsupported Light',
            category: 'dj',
            product_id: 'prod-light',
            product_name: 'Light',
            online: false,
            status: [{ code: 'switch_led', value: false }],
          },
        ],
      };
    }

    if (path.endsWith('/specifications')) {
      return {
        result: {
          functions: [{ code: 'switch_1', type: 'Boolean', values: '{}' }],
          status: [{ code: 'switch_1', type: 'Boolean', values: '{}' }],
        },
      };
    }

    if (path.includes('/status')) {
      return {
        result: [{ code: 'switch_1', type: 'Boolean', values: '{}' }],
      };
    }

    if (path.includes('/dp-report-types')) {
      return {
        result: { switch_1: 'publish' },
      };
    }

    throw new Error(`Unexpected request: ${path}`);
  }
}

describe('DeviceRepository', () => {
  it('queries homes and devices for each home', async () => {
    const client = new FakeClient();
    const repository = new DeviceRepository(client);

    const result = await repository.discoverDevices();

    expect(result.homes).toEqual([
      { id: '123', name: 'Main Home' },
      { id: 'home-2', name: 'Pool House' },
    ]);
    expect(client.calls).toEqual(
      expect.arrayContaining([
        { path: '/v1.0/m/life/users/homes', params: undefined },
        { path: '/v1.0/m/life/ha/home/devices', params: { homeId: '123' } },
        { path: '/v1.0/m/life/ha/home/devices', params: { homeId: 'home-2' } },
      ]),
    );
  });

  it('normalizes devices while preserving status and specification metadata', async () => {
    const repository = new DeviceRepository(new FakeClient());

    const result = await repository.discoverDevices();
    const thermometer = result.devices.find((device) => device.id === 'thermo-1');

    expect(result.devices).toHaveLength(3);
    expect(thermometer).toMatchObject({
      id: 'thermo-1',
      name: 'Hall Thermometer',
      category: 'wsdcg',
      productId: 'prod-thermo',
      productName: 'Temp Humidity Sensor',
      online: true,
      homeId: '123',
      status: {
        temp_current: 215,
        humidity_value: 47,
      },
      functions: {
        switch_1: { code: 'switch_1', type: 'Boolean', values: '{}' },
      },
      statusRanges: {
        switch_1: { code: 'switch_1', type: 'Boolean', values: '{}' },
      },
      reportTypes: {
        switch_1: 'publish',
      },
    });
  });

  it('includes unsupported categories in discovery results for diagnostics', async () => {
    const repository = new DeviceRepository(new FakeClient());

    const result = await repository.discoverDevices();

    expect(result.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'light-1',
          category: 'dj',
          homeId: 'home-2',
        }),
      ]),
    );
  });

  it('propagates auth errors instead of returning an empty discovery result', async () => {
    const client = new FakeClient();
    client.failWith = new TuyaReauthRequiredError('expired');
    const repository = new DeviceRepository(client);

    await expect(repository.discoverDevices()).rejects.toThrow(TuyaReauthRequiredError);
  });
});
