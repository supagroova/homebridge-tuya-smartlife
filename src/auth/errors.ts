const REDACTED = '[REDACTED]';
const SENSITIVE_KEYS = new Set([
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'X-token',
  'x-token',
  'encdata',
]);

export class TuyaAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class TuyaApiError extends TuyaAuthError {
  constructor(
    readonly code: string,
    message: string,
    sensitiveValues: string[] = [],
  ) {
    super(`Tuya API error ${code}: ${redactKnownValues(redactSensitive(message), sensitiveValues)}`);
  }
}

export class TuyaTransportError extends TuyaAuthError {
  constructor(message: string) {
    super(`Tuya transport error: ${redactSensitive(message)}`);
  }
}

export class TuyaReauthRequiredError extends TuyaAuthError {
  constructor(message: string) {
    super(`Tuya re-auth required: ${redactSensitive(message)}`);
  }
}

export function redactSensitive(value: unknown): string {
  if (typeof value === 'string') {
    return redactString(value);
  }

  return JSON.stringify(value, (key, nestedValue: unknown) => {
    if (SENSITIVE_KEYS.has(key)) {
      return REDACTED;
    }

    return nestedValue;
  });
}

function redactString(value: string): string {
  return value
    .replace(/(accessToken|refreshToken|access_token|refresh_token|encdata)([=:]\s*)[^,\s}]+/gi, `$1$2${REDACTED}`)
    .replace(/(X-token)([=:]\s*)[^,\s}]+/gi, `$1$2${REDACTED}`);
}

function redactKnownValues(value: string, sensitiveValues: string[]): string {
  return sensitiveValues
    .filter((sensitiveValue) => sensitiveValue !== '')
    .reduce((redacted, sensitiveValue) => redacted.split(sensitiveValue).join(REDACTED), value);
}
