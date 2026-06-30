"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaDeviceSharingClient = void 0;
const node_crypto_1 = require("node:crypto");
const crypto_1 = require("./crypto");
const errors_1 = require("./errors");
class TuyaDeviceSharingClient {
    options;
    token;
    now;
    requestId;
    nonce;
    fetchImpl;
    refreshWindowMs;
    refreshPromise = null;
    constructor(options) {
        this.options = options;
        this.token = options.token;
        this.now = options.now ?? Date.now;
        this.requestId = options.requestId ?? node_crypto_1.randomUUID;
        this.nonce = options.nonce;
        this.fetchImpl = options.fetch ?? fetch;
        this.refreshWindowMs = options.refreshWindowMs ?? 60_000;
    }
    async get(path, params) {
        return this.request('GET', path, params);
    }
    async post(path, params, body) {
        return this.request('POST', path, params, body);
    }
    async put(path, body) {
        return this.request('PUT', path, undefined, body);
    }
    async delete(path, params) {
        return this.request('DELETE', path, params);
    }
    async request(method, path, params, body, requestOptions = {}) {
        if (!requestOptions.skipRefresh) {
            await this.refreshAccessTokenIfNeeded();
        }
        const requestId = this.requestId();
        const sessionId = '';
        const hashKey = (0, crypto_1.md5HashKey)(requestId, this.token.refreshToken);
        const secret = (0, crypto_1.generateSecret)(requestId, sessionId, hashKey);
        const queryEncdata = params && Object.keys(params).length > 0 ? this.encryptPayload(params, secret) : '';
        const bodyEncdata = body && Object.keys(body).length > 0 ? this.encryptPayload(body, secret) : '';
        const headers = this.buildHeaders(requestId, sessionId);
        const signedHeaders = {
            ...headers,
            'X-sign': (0, crypto_1.restfulSign)(hashKey, queryEncdata, bodyEncdata, headers),
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
            throw new errors_1.TuyaTransportError(`status=${response.status}`);
        }
        const tuyaResponse = (await response.json());
        if (!tuyaResponse.success) {
            throw new errors_1.TuyaApiError(tuyaResponse.code ?? 'UNKNOWN', tuyaResponse.msg ?? 'Unknown Tuya API error', [
                this.token.accessToken,
                this.token.refreshToken,
            ]);
        }
        if (typeof tuyaResponse.result === 'string') {
            tuyaResponse.result = parseDecryptedResult((0, crypto_1.decryptAesGcm)(tuyaResponse.result, secret));
        }
        return tuyaResponse;
    }
    async refreshAccessTokenIfNeeded() {
        if (this.token.expireTimeMs - this.refreshWindowMs > this.now()) {
            return;
        }
        this.refreshPromise ??= this.refreshAccessToken().finally(() => {
            this.refreshPromise = null;
        });
        await this.refreshPromise;
    }
    async refreshAccessToken() {
        try {
            const response = await this.request('GET', `/v1.0/m/token/${this.token.refreshToken}`, undefined, undefined, { skipRefresh: true });
            const result = response.result;
            const nextToken = {
                uid: result.uid,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                expireTimeMs: (response.t ?? this.now()) + result.expireTime * 1000,
            };
            this.token = nextToken;
            await this.options.onTokenUpdate?.(nextToken);
        }
        catch (error) {
            throw new errors_1.TuyaReauthRequiredError((0, errors_1.redactSensitive)(error instanceof Error ? error.message : error));
        }
    }
    encryptPayload(content, secret) {
        return (0, crypto_1.encryptAesGcm)((0, crypto_1.formToJson)(content), secret, this.nonce?.());
    }
    buildHeaders(requestId, sessionId) {
        return {
            'X-appKey': this.options.clientId,
            'X-requestId': requestId,
            'X-sid': sessionId,
            'X-time': String(this.now()),
            'X-token': this.token.accessToken,
        };
    }
}
exports.TuyaDeviceSharingClient = TuyaDeviceSharingClient;
function parseDecryptedResult(result) {
    try {
        return JSON.parse(result);
    }
    catch {
        return result;
    }
}
