"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaReauthRequiredError = exports.TuyaTransportError = exports.TuyaApiError = exports.TuyaAuthError = void 0;
exports.redactSensitive = redactSensitive;
const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
    'accessToken',
    'refreshToken',
    'access_token',
    'refresh_token',
    'X-token',
    'x-token',
    'X-sign',
    'x-sign',
    'sign',
    'encdata',
]);
class TuyaAuthError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
    }
}
exports.TuyaAuthError = TuyaAuthError;
class TuyaApiError extends TuyaAuthError {
    code;
    constructor(code, message, sensitiveValues = []) {
        super(`Tuya API error ${code}: ${redactKnownValues(redactSensitive(message), sensitiveValues)}`);
        this.code = code;
    }
}
exports.TuyaApiError = TuyaApiError;
class TuyaTransportError extends TuyaAuthError {
    constructor(message) {
        super(`Tuya transport error: ${redactSensitive(message)}`);
    }
}
exports.TuyaTransportError = TuyaTransportError;
class TuyaReauthRequiredError extends TuyaAuthError {
    constructor(message) {
        super(`Tuya re-auth required: ${redactSensitive(message)}`);
    }
}
exports.TuyaReauthRequiredError = TuyaReauthRequiredError;
function redactSensitive(value) {
    if (typeof value === 'string') {
        return redactString(value);
    }
    return JSON.stringify(value, (key, nestedValue) => {
        if (SENSITIVE_KEYS.has(key)) {
            return REDACTED;
        }
        return nestedValue;
    });
}
function redactString(value) {
    return value
        .replace(/(accessToken|refreshToken|access_token|refresh_token|encdata|X-token|X-sign|sign)([=:]\s*)[^,\s}]+/gi, `$1$2${REDACTED}`);
}
function redactKnownValues(value, sensitiveValues) {
    return sensitiveValues
        .filter((sensitiveValue) => sensitiveValue !== '')
        .reduce((redacted, sensitiveValue) => redacted.split(sensitiveValue).join(REDACTED), value);
}
