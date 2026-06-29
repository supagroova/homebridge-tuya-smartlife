import type { PersistedTokenInfo } from './types';
import type { TokenStore } from './tokenStore';
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
    fetch?: typeof fetch;
    tokenStore?: TokenStore;
};
export declare class QrLoginFlow {
    private readonly options;
    private readonly loginEndpoint;
    private readonly fetchImpl;
    constructor(options: QrLoginFlowOptions);
    createQrCode(userCode: string): Promise<QrCodeCreated | QrLoginPending>;
    pollLoginResult(qrToken: string, userCode: string): Promise<QrLoginPending | QrLoginSuccess>;
    private requestJson;
}
