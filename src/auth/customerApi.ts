import { randomUUID } from 'node:crypto';

import {
  decryptAesGcm,
  encryptAesGcm,
  formToJson,
  generateSecret,
  md5HashKey,
  restfulSign,
} from './crypto';
import { redactSensitive, TuyaApiError, TuyaReauthRequiredError, TuyaTransportError } from './errors';
import type { TokenInfo, TuyaSignedHeaders } from './types';

type TuyaResponse = {
  success: boolean;
  t?: number;
  code?: string;
  msg?: string;
  result?: string | unknown;
};

type RefreshResult = {
  uid: string;
  accessToken: string;
  refreshToken: string;
  expireTime: number;
};

type RequestOptions = {
  skipRefresh?: boolean;
};

export type TuyaDeviceSharingClientOptions = {
  clientId: string;
  endpoint: string;
  token: TokenInfo;
  onTokenUpdate?: (token: TokenInfo) => void | Promise<void>;
  now?: () => number;
  requestId?: () => string;
  nonce?: () => string;
  fetch?: typeof fetch;
  refreshWindowMs?: number;
};

export class TuyaDeviceSharingClient {
  private token: TokenInfo;
  private readonly now: () => number;
  private readonly requestId: () => string;
  private readonly nonce?: () => string;
  private readonly fetchImpl: typeof fetch;
  private readonly refreshWindowMs: number;
  private refreshPromise: Promise<void> | null = null;

  constructor(private readonly options: TuyaDeviceSharingClientOptions) {
    this.token = options.token;
    this.now = options.now ?? Date.now;
    this.requestId = options.requestId ?? randomUUID;
    this.nonce = options.nonce;
    this.fetchImpl = options.fetch ?? fetch;
    this.refreshWindowMs = options.refreshWindowMs ?? 60_000;
  }

  async get(path: string, params?: Record<string, unknown>): Promise<TuyaResponse> {
    return this.request('GET', path, params);
  }

  async post(
    path: string,
    params?: Record<string, unknown>,
    body?: Record<string, unknown>,
  ): Promise<TuyaResponse> {
    return this.request('POST', path, params, body);
  }

  async put(path: string, body?: Record<string, unknown>): Promise<TuyaResponse> {
    return this.request('PUT', path, undefined, body);
  }

  async delete(path: string, params?: Record<string, unknown>): Promise<TuyaResponse> {
    return this.request('DELETE', path, params);
  }

  private async request(
    method: string,
    path: string,
    params?: Record<string, unknown>,
    body?: Record<string, unknown>,
    requestOptions: RequestOptions = {},
  ): Promise<TuyaResponse> {
    if (!requestOptions.skipRefresh) {
      await this.refreshAccessTokenIfNeeded();
    }

    const requestId = this.requestId();
    const sessionId = '';
    const hashKey = md5HashKey(requestId, this.token.refreshToken);
    const secret = generateSecret(requestId, sessionId, hashKey);
    const queryEncdata = params && Object.keys(params).length > 0 ? this.encryptPayload(params, secret) : '';
    const bodyEncdata = body && Object.keys(body).length > 0 ? this.encryptPayload(body, secret) : '';
    const headers = this.buildHeaders(requestId, sessionId);
    const signedHeaders = {
      ...headers,
      'X-sign': restfulSign(hashKey, queryEncdata, bodyEncdata, headers),
      'Content-Type': 'application/json',
    };
    const url = new URL(this.options.endpoint + path);

    if (queryEncdata !== '') {
      url.searchParams.set('encdata', queryEncdata);
    }

    const response = await this.fetchImpl(url, {
      method,
      headers: signedHeaders,
      body: bodyEncdata === '' ? undefined : JSON.stringify({ encdata: bodyEncdata }),
    });

    if (!response.ok) {
      throw new TuyaTransportError(`status=${response.status}`);
    }

    const tuyaResponse = (await response.json()) as TuyaResponse;

    if (!tuyaResponse.success) {
      throw new TuyaApiError(tuyaResponse.code ?? 'UNKNOWN', tuyaResponse.msg ?? 'Unknown Tuya API error', [
        this.token.accessToken,
        this.token.refreshToken,
      ]);
    }

    if (typeof tuyaResponse.result === 'string') {
      tuyaResponse.result = parseDecryptedResult(decryptAesGcm(tuyaResponse.result, secret));
    }

    return tuyaResponse;
  }

  private async refreshAccessTokenIfNeeded(): Promise<void> {
    if (this.token.expireTimeMs - this.refreshWindowMs > this.now()) {
      return;
    }

    this.refreshPromise ??= this.refreshAccessToken().finally(() => {
      this.refreshPromise = null;
    });

    await this.refreshPromise;
  }

  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await this.request(
        'GET',
        `/v1.0/m/token/${this.token.refreshToken}`,
        undefined,
        undefined,
        { skipRefresh: true },
      );
      const result = response.result as RefreshResult;
      const nextToken: TokenInfo = {
        uid: result.uid,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expireTimeMs: (response.t ?? this.now()) + result.expireTime * 1000,
      };

      this.token = nextToken;
      await this.options.onTokenUpdate?.(nextToken);
    } catch (error) {
      throw new TuyaReauthRequiredError(redactSensitive(error instanceof Error ? error.message : error));
    }
  }

  private encryptPayload(content: Record<string, unknown>, secret: string): string {
    return encryptAesGcm(formToJson(content), secret, this.nonce?.());
  }

  private buildHeaders(requestId: string, sessionId: string): TuyaSignedHeaders {
    return {
      'X-appKey': this.options.clientId,
      'X-requestId': requestId,
      'X-sid': sessionId,
      'X-time': String(this.now()),
      'X-token': this.token.accessToken,
    };
  }
}

function parseDecryptedResult(result: string): unknown {
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}
