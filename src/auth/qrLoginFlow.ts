import { TuyaTransportError } from './errors';
import type { PersistedTokenInfo } from './types';
import type { TokenStore } from './tokenStore';

const DEFAULT_LOGIN_ENDPOINT = 'https://apigw.iotbing.com';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

type LoginTokenResponse = {
  success: boolean;
  code?: string;
  msg?: string;
  result?: {
    qrcode?: string;
  };
};

type LoginResultResponse = {
  success: boolean;
  t?: number;
  code?: string;
  msg?: string;
  result?: {
    uid: string;
    access_token: string;
    refresh_token: string;
    expire_time: number;
    terminal_id?: string;
    endpoint?: string;
  };
};

export type QrCodeCreated = {
  state: 'created';
  token: string;
  qrUrl: string;
  userCode: string;
};

export type QrLoginPending = {
  state: 'pending' | 'expired' | 'failed';
  code: string;
  message: string;
};

export type QrLoginSuccess = {
  state: 'success';
  token: PersistedTokenInfo;
};

export type QrLoginFlowOptions = {
  clientId: string;
  schema: string;
  loginEndpoint?: string;
  requestTimeoutMs?: number;
  fetch?: typeof fetch;
  tokenStore?: TokenStore;
};

export class QrLoginFlow {
  private readonly loginEndpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: QrLoginFlowOptions) {
    this.loginEndpoint = options.loginEndpoint ?? DEFAULT_LOGIN_ENDPOINT;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async createQrCode(userCode: string): Promise<QrCodeCreated | QrLoginPending> {
    const response = await this.requestJson<LoginTokenResponse>(
      `/v1.0/m/life/home-assistant/qrcode/tokens?clientid=${encodeURIComponent(
        this.options.clientId,
      )}&usercode=${encodeURIComponent(userCode)}&schema=${encodeURIComponent(this.options.schema)}`,
      { method: 'POST' },
    );

    if (!response.success || !response.result?.qrcode) {
      return {
        state: 'failed',
        code: response.code ?? 'UNKNOWN',
        message: response.msg ?? 'QR token creation failed',
      };
    }

    return {
      state: 'created',
      token: response.result.qrcode,
      qrUrl: `tuyaSmart--qrLogin?token=${response.result.qrcode}`,
      userCode,
    };
  }

  async pollLoginResult(qrToken: string, userCode: string): Promise<QrLoginPending | QrLoginSuccess> {
    const response = await this.requestJson<LoginResultResponse>(
      `/v1.0/m/life/home-assistant/qrcode/tokens/${encodeURIComponent(
        qrToken,
      )}?clientid=${encodeURIComponent(this.options.clientId)}&usercode=${encodeURIComponent(userCode)}`,
      { method: 'GET' },
    );

    if (!response.success || !response.result) {
      return mapLoginFailure(response.code, response.msg);
    }

    const token: PersistedTokenInfo = {
      uid: response.result.uid,
      accessToken: response.result.access_token,
      refreshToken: response.result.refresh_token,
      expireTimeMs: (response.t ?? Date.now()) + response.result.expire_time * 1000,
      userCode,
      terminalId: response.result.terminal_id,
      endpoint: response.result.endpoint,
    };

    await this.options.tokenStore?.save(token);

    return {
      state: 'success',
      token,
    };
  }

  private async requestJson<T>(pathAndQuery: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.loginEndpoint}${pathAndQuery}`, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw new TuyaTransportError('QR login request timed out');
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new TuyaTransportError(`QR login HTTP error: status=${response.status}`);
    }

    return (await response.json()) as T;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function mapLoginFailure(code = 'UNKNOWN', message = 'QR login failed'): QrLoginPending {
  if (code.includes('PENDING')) {
    return { state: 'pending', code, message };
  }

  if (code.includes('EXPIRED')) {
    return { state: 'expired', code, message };
  }

  return { state: 'failed', code, message };
}
