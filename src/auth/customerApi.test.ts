import nock from 'nock';

import { encryptAesGcm, generateSecret, md5HashKey, restfulSign } from './crypto';
import { redactSensitive, TuyaApiError, TuyaReauthRequiredError } from './errors';
import { TuyaDeviceSharingClient } from './customerApi';
import type { TokenInfo, TuyaSignedHeaders } from './types';

const endpoint = 'https://openapi.example.test';
const clientId = 'dummy-client-id';
const accessToken = 'dummy-access-token';
const refreshToken = 'dummy-refresh-token';
const nonce = 'ABCDEF234567';
const now = 1_710_000_000_123;

function token(overrides: Partial<TokenInfo> = {}): TokenInfo {
  return {
    uid: 'user-1',
    accessToken,
    refreshToken,
    expireTimeMs: now + 10 * 60_000,
    ...overrides,
  };
}

function secretFor(requestId: string, tokenRefresh = refreshToken): string {
  return generateSecret(requestId, '', md5HashKey(requestId, tokenRefresh));
}

function signFor(
  requestId: string,
  queryEncdata: string,
  bodyEncdata: string,
  tokenAccess = accessToken,
  tokenRefresh = refreshToken,
): string {
  const headers: TuyaSignedHeaders = {
    'X-appKey': clientId,
    'X-requestId': requestId,
    'X-sid': '',
    'X-time': String(now),
    'X-token': tokenAccess,
  };

  return restfulSign(md5HashKey(requestId, tokenRefresh), queryEncdata, bodyEncdata, headers);
}

describe('TuyaDeviceSharingClient', () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('sends encrypted signed requests and decrypts successful results', async () => {
    const requestId = 'request-1';
    const queryEncdata = encryptAesGcm(
      '{"deviceId":"device-1"}',
      secretFor(requestId),
      nonce,
    );
    const bodyEncdata = encryptAesGcm(
      '{"commands":[{"code":"switch_1","value":true}]}',
      secretFor(requestId),
      nonce,
    );
    const result = encryptAesGcm('{"accepted":true}', secretFor(requestId), nonce);

    nock(endpoint, {
      reqheaders: {
        'X-appKey': clientId,
        'X-requestId': requestId,
        'X-sid': '',
        'X-time': String(now),
        'X-token': accessToken,
        'X-sign': signFor(requestId, queryEncdata, bodyEncdata),
      },
    })
      .post('/v1.0/devices/device-1/commands', { encdata: bodyEncdata })
      .query({ encdata: queryEncdata })
      .reply(200, { success: true, t: now, result });

    const client = new TuyaDeviceSharingClient({
      clientId,
      endpoint,
      token: token(),
      now: () => now,
      requestId: () => requestId,
      nonce: () => nonce,
    });

    await expect(
      client.post('/v1.0/devices/device-1/commands', { deviceId: 'device-1' }, {
        commands: [{ code: 'switch_1', value: true }],
      }),
    ).resolves.toMatchObject({ success: true, result: { accepted: true } });
  });

  it('maps Tuya API failures into redacted typed errors', async () => {
    const requestId = 'request-2';

    nock(endpoint).get('/v1.0/things').query(true).reply(200, {
      success: false,
      code: 'E_FORBIDDEN',
      msg: `bad ${accessToken} encdata=secret-payload`,
    });

    const client = new TuyaDeviceSharingClient({
      clientId,
      endpoint,
      token: token(),
      now: () => now,
      requestId: () => requestId,
      nonce: () => nonce,
    });

    try {
      await client.get('/v1.0/things');
      fail('Expected Tuya API error');
    } catch (error) {
      expect(error).toBeInstanceOf(TuyaApiError);
      expect((error as Error).message).not.toContain(accessToken);
      expect((error as Error).message).not.toContain('secret-payload');
    }
  });

  it('redacts common token and encdata fields', () => {
    expect(
      redactSensitive({
        accessToken: 'access-secret',
        refreshToken: 'refresh-secret',
        encdata: 'cipher-secret',
        nested: { 'X-token': 'header-secret' },
      }),
    ).toBe(
      '{"accessToken":"[REDACTED]","refreshToken":"[REDACTED]","encdata":"[REDACTED]","nested":{"X-token":"[REDACTED]"}}',
    );
  });

  it('refreshes a token before expiry and persists the update', async () => {
    const refreshRequestId = 'refresh-request';
    const commandRequestId = 'command-request';
    const refreshedToken = {
      uid: 'user-1',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expireTimeMs: now + 90 * 60_000,
    };
    const updates: TokenInfo[] = [];

    nock(endpoint)
      .get(`/v1.0/m/token/${refreshToken}`)
      .query(true)
      .reply(200, {
        success: true,
        t: now,
        result: encryptAesGcm(
          JSON.stringify({
            uid: refreshedToken.uid,
            accessToken: refreshedToken.accessToken,
            refreshToken: refreshedToken.refreshToken,
            expireTime: 5400,
          }),
          secretFor(refreshRequestId),
          nonce,
        ),
      });

    nock(endpoint)
      .get('/v1.0/things')
      .query(true)
      .reply(200, {
        success: true,
        t: now,
        result: encryptAesGcm('{"ok":true}', secretFor(commandRequestId, refreshedToken.refreshToken), nonce),
      });

    const requestIds = [refreshRequestId, commandRequestId];
    const client = new TuyaDeviceSharingClient({
      clientId,
      endpoint,
      token: token({ expireTimeMs: now + 30_000 }),
      onTokenUpdate: (nextToken) => {
        updates.push(nextToken);
      },
      now: () => now,
      requestId: () => requestIds.shift() ?? 'unexpected',
      nonce: () => nonce,
    });

    await expect(client.get('/v1.0/things')).resolves.toMatchObject({
      result: { ok: true },
    });
    expect(updates).toEqual([refreshedToken]);
  });

  it('shares one in-flight refresh across concurrent requests', async () => {
    const refreshedToken = {
      uid: 'user-1',
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expireTimeMs: now + 90 * 60_000,
    };
    const requestIds = ['refresh-request', 'thing-a', 'thing-b'];

    nock(endpoint)
      .get(`/v1.0/m/token/${refreshToken}`)
      .query(true)
      .delay(20)
      .reply(200, function () {
        const requestId = this.req.headers['x-requestid'] as string;

        return {
          success: true,
          t: now,
          result: encryptAesGcm(
            JSON.stringify({
              uid: refreshedToken.uid,
              accessToken: refreshedToken.accessToken,
              refreshToken: refreshedToken.refreshToken,
              expireTime: 5400,
            }),
            secretFor(requestId),
            nonce,
          ),
        };
      });

    nock(endpoint)
      .get('/v1.0/things/a')
      .query(true)
      .reply(200, function () {
        const requestId = this.req.headers['x-requestid'] as string;

        return {
          success: true,
          t: now,
          result: encryptAesGcm('{"id":"a"}', secretFor(requestId, refreshedToken.refreshToken), nonce),
        };
      });

    nock(endpoint)
      .get('/v1.0/things/b')
      .query(true)
      .reply(200, function () {
        const requestId = this.req.headers['x-requestid'] as string;

        return {
          success: true,
          t: now,
          result: encryptAesGcm('{"id":"b"}', secretFor(requestId, refreshedToken.refreshToken), nonce),
        };
      });

    const client = new TuyaDeviceSharingClient({
      clientId,
      endpoint,
      token: token({ expireTimeMs: now + 30_000 }),
      now: () => now,
      requestId: () => requestIds.shift() ?? 'unexpected',
      nonce: () => nonce,
    });

    await expect(Promise.all([client.get('/v1.0/things/a'), client.get('/v1.0/things/b')])).resolves
      .toHaveLength(2);
    expect(nock.isDone()).toBe(true);
  });

  it('surfaces re-auth-required when refresh fails', async () => {
    nock(endpoint).get(`/v1.0/m/token/${refreshToken}`).query(true).reply(200, {
      success: false,
      code: 'TOKEN_EXPIRED',
      msg: 'refresh failed',
    });

    const client = new TuyaDeviceSharingClient({
      clientId,
      endpoint,
      token: token({ expireTimeMs: now + 30_000 }),
      now: () => now,
      requestId: () => 'refresh-request',
      nonce: () => nonce,
    });

    await expect(client.get('/v1.0/things')).rejects.toThrow(TuyaReauthRequiredError);
  });
});
