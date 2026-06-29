import type { TokenInfo } from './types';
type TuyaResponse = {
    success: boolean;
    t?: number;
    code?: string;
    msg?: string;
    result?: string | unknown;
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
export declare class TuyaDeviceSharingClient {
    private readonly options;
    private token;
    private readonly now;
    private readonly requestId;
    private readonly nonce?;
    private readonly fetchImpl;
    private readonly refreshWindowMs;
    private refreshPromise;
    constructor(options: TuyaDeviceSharingClientOptions);
    get(path: string, params?: Record<string, unknown>): Promise<TuyaResponse>;
    post(path: string, params?: Record<string, unknown>, body?: Record<string, unknown>): Promise<TuyaResponse>;
    put(path: string, body?: Record<string, unknown>): Promise<TuyaResponse>;
    delete(path: string, params?: Record<string, unknown>): Promise<TuyaResponse>;
    private request;
    private refreshAccessTokenIfNeeded;
    private refreshAccessToken;
    private encryptPayload;
    private buildHeaders;
}
export {};
