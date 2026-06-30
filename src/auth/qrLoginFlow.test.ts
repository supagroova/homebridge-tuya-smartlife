import { QrLoginFlow } from './qrLoginFlow';
import type { PersistedTokenInfo } from './types';
import type { TokenStore } from './tokenStore';

class MemoryTokenStore implements TokenStore {
  token: PersistedTokenInfo | null = null;

  async load(): Promise<PersistedTokenInfo | null> {
    return this.token;
  }

  async save(token: PersistedTokenInfo): Promise<void> {
    this.token = token;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('QrLoginFlow', () => {
  it('creates a QR login token and URL from a Smart Life user code', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        result: { qrcode: 'qr-token-1' },
      }),
    );
    const flow = new QrLoginFlow({
      clientId: 'client-id',
      schema: 'schema-id',
      fetch: fetchMock,
    });

    await expect(flow.createQrCode('user-code')).resolves.toEqual({
      state: 'created',
      token: 'qr-token-1',
      qrUrl: 'tuyaSmart--qrLogin?token=qr-token-1',
      userCode: 'user-code',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://apigw.iotbing.com/v1.0/m/life/home-assistant/qrcode/tokens?clientid=client-id&usercode=user-code&schema=schema-id',
      { method: 'POST', signal: expect.any(AbortSignal) },
    );
  });

  it('maps pending, expired, and failed polling responses to explicit states', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ success: false, code: 'LOGIN_PENDING', msg: 'pending' }))
      .mockResolvedValueOnce(jsonResponse({ success: false, code: 'QR_EXPIRED', msg: 'expired' }))
      .mockResolvedValueOnce(jsonResponse({ success: false, code: 'E0020003', msg: 'wrong app' }));
    const flow = new QrLoginFlow({
      clientId: 'client-id',
      schema: 'schema-id',
      fetch: fetchMock,
    });

    await expect(flow.pollLoginResult('qr-token', 'user-code')).resolves.toEqual({
      state: 'pending',
      code: 'LOGIN_PENDING',
      message: 'pending',
    });
    await expect(flow.pollLoginResult('qr-token', 'user-code')).resolves.toEqual({
      state: 'expired',
      code: 'QR_EXPIRED',
      message: 'expired',
    });
    await expect(flow.pollLoginResult('qr-token', 'user-code')).resolves.toEqual({
      state: 'failed',
      code: 'E0020003',
      message: 'wrong app',
    });
  });

  it('persists token info when polling succeeds', async () => {
    const tokenStore = new MemoryTokenStore();
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        t: 1_710_000_000_000,
        result: {
          uid: 'user-1',
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expire_time: 7200,
          terminal_id: 'terminal-1',
          endpoint: 'https://openapi.example.test',
        },
      }),
    );
    const flow = new QrLoginFlow({
      clientId: 'client-id',
      schema: 'schema-id',
      fetch: fetchMock,
      tokenStore,
    });

    await expect(flow.pollLoginResult('qr-token', 'user-code')).resolves.toEqual({
      state: 'success',
      token: {
        uid: 'user-1',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expireTimeMs: 1_710_007_200_000,
        userCode: 'user-code',
        terminalId: 'terminal-1',
        endpoint: 'https://openapi.example.test',
      },
    });
    expect(tokenStore.token).toEqual({
      uid: 'user-1',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expireTimeMs: 1_710_007_200_000,
      userCode: 'user-code',
      terminalId: 'terminal-1',
      endpoint: 'https://openapi.example.test',
    });
  });

  it('throws on HTTP failures instead of persisting a token', async () => {
    const tokenStore = new MemoryTokenStore();
    const flow = new QrLoginFlow({
      clientId: 'client-id',
      schema: 'schema-id',
      fetch: jest.fn().mockResolvedValue(jsonResponse({ error: 'bad gateway' }, 502)),
      tokenStore,
    });

    await expect(flow.pollLoginResult('qr-token', 'user-code')).rejects.toThrow('QR login HTTP error');
    expect(tokenStore.token).toBeNull();
  });

  it('times out QR token creation instead of waiting forever', async () => {
    jest.useFakeTimers();
    const fetchMock = jest.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          });
        }),
    );
    const flow = new QrLoginFlow({
      clientId: 'client-id',
      schema: 'schema-id',
      fetch: fetchMock,
      requestTimeoutMs: 5,
    });

    const result = expect(flow.createQrCode('user-code')).rejects.toThrow('QR login request timed out');

    await jest.advanceTimersByTimeAsync(5);
    await result;
    jest.useRealTimers();
  });
});
