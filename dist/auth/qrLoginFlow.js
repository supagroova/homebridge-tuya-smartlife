"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrLoginFlow = void 0;
const errors_1 = require("./errors");
const DEFAULT_LOGIN_ENDPOINT = 'https://apigw.iotbing.com';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
class QrLoginFlow {
    options;
    loginEndpoint;
    fetchImpl;
    constructor(options) {
        this.options = options;
        this.loginEndpoint = options.loginEndpoint ?? DEFAULT_LOGIN_ENDPOINT;
        this.fetchImpl = options.fetch ?? fetch;
    }
    async createQrCode(userCode) {
        const response = await this.requestJson(`/v1.0/m/life/home-assistant/qrcode/tokens?clientid=${encodeURIComponent(this.options.clientId)}&usercode=${encodeURIComponent(userCode)}&schema=${encodeURIComponent(this.options.schema)}`, { method: 'POST' });
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
    async pollLoginResult(qrToken, userCode) {
        const response = await this.requestJson(`/v1.0/m/life/home-assistant/qrcode/tokens/${encodeURIComponent(qrToken)}?clientid=${encodeURIComponent(this.options.clientId)}&usercode=${encodeURIComponent(userCode)}`, { method: 'GET' });
        if (!response.success || !response.result) {
            return mapLoginFailure(response.code, response.msg);
        }
        const token = {
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
    async requestJson(pathAndQuery, init) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
        let response;
        try {
            response = await this.fetchImpl(`${this.loginEndpoint}${pathAndQuery}`, {
                ...init,
                signal: controller.signal,
            });
        }
        catch (error) {
            if (isAbortError(error)) {
                throw new errors_1.TuyaTransportError('QR login request timed out');
            }
            throw error;
        }
        finally {
            clearTimeout(timeout);
        }
        if (!response.ok) {
            throw new errors_1.TuyaTransportError(`QR login HTTP error: status=${response.status}`);
        }
        return (await response.json());
    }
}
exports.QrLoginFlow = QrLoginFlow;
function isAbortError(error) {
    return error instanceof Error && error.name === 'AbortError';
}
function mapLoginFailure(code = 'UNKNOWN', message = 'QR login failed') {
    if (code.includes('PENDING')) {
        return { state: 'pending', code, message };
    }
    if (code.includes('EXPIRED')) {
        return { state: 'expired', code, message };
    }
    return { state: 'failed', code, message };
}
