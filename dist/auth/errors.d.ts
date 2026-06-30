export declare class TuyaAuthError extends Error {
    constructor(message: string);
}
export declare class TuyaApiError extends TuyaAuthError {
    readonly code: string;
    constructor(code: string, message: string, sensitiveValues?: string[]);
}
export declare class TuyaTransportError extends TuyaAuthError {
    constructor(message: string);
}
export declare class TuyaReauthRequiredError extends TuyaAuthError {
    constructor(message: string);
}
export declare function redactSensitive(value: unknown): string;
