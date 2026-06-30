const { join } = require('node:path');

const qrcode = require('qrcode');
const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

const { QrLoginFlow } = require('../dist/auth/qrLoginFlow.js');
const { FileTokenStore } = require('../dist/auth/tokenStore.js');
const { TOKEN_FILE_NAME, TUYA_CLIENT_ID } = require('../dist/settings.js');

const TUYA_SCHEMA = 'haauthorize';
const DEFAULT_LOGIN_ENDPOINT = 'https://apigw.iotbing.com';

function createUiHandlers(options) {
  const tokenStore = options.tokenStore ?? createTokenStore(options.storagePath);
  const createFlow = options.createFlow ?? ((flowOptions) => new QrLoginFlow(flowOptions));
  const qrCodeToDataUrl = options.qrCodeToDataUrl ?? ((value) => qrcode.toDataURL(value));
  const log = options.log ?? console;

  return {
    async status() {
      const token = await tokenStore.load();

      if (token === null) {
        return { connected: false };
      }

      return safeTokenStatus(token);
    },

    async startQr(payload = {}) {
      const userCode = normalizeRequiredString(payload.userCode, 'Smart Life user code');
      const loginEndpoint = normalizeEndpoint(payload.endpoint);
      logDebug(log, 'QR login start requested: endpoint=%s userCodeLength=%d', loginEndpoint, userCode.length);
      const flow = createFlow(createFlowOptions({ loginEndpoint, tokenStore, log }));
      const created = await flow.createQrCode(userCode);

      if (created.state !== 'created') {
        logDebug(log, 'QR login start result: state=%s code=%s', created.state, created.code ?? '');
        return mapQrLoginError(created);
      }

      logDebug(log, 'QR login token created: qrUrlScheme=%s', created.qrUrl.split('?')[0]);

      return {
        state: 'created',
        qrToken: created.token,
        qrUrl: created.qrUrl,
        qrImage: await qrCodeToDataUrl(created.qrUrl),
      };
    },

    async pollQr(payload = {}) {
      const qrToken = normalizeRequiredString(payload.qrToken, 'QR token');
      const userCode = normalizeRequiredString(payload.userCode, 'Smart Life user code');
      const loginEndpoint = normalizeEndpoint(payload.endpoint);
      logDebug(log, 'QR login poll requested: endpoint=%s userCodeLength=%d', loginEndpoint, userCode.length);
      const flow = createFlow(createFlowOptions({ loginEndpoint, tokenStore, log }));
      const result = await flow.pollLoginResult(qrToken, userCode);

      logDebug(log, 'QR login poll result: state=%s code=%s', result.state, result.code ?? '');

      if (result.state !== 'success') {
        return mapQrLoginError(result);
      }

      await tokenStore.save(result.token);

      return {
        state: 'success',
        ...safeTokenStatus(result.token),
      };
    },
  };
}

function createTokenStore(storagePath) {
  return new FileTokenStore(join(storagePath, TOKEN_FILE_NAME));
}

function createFlowOptions({ loginEndpoint, tokenStore, log }) {
  return {
    clientId: TUYA_CLIENT_ID,
    schema: TUYA_SCHEMA,
    loginEndpoint,
    log,
    tokenStore,
  };
}

function logDebug(log, message, ...parameters) {
  if (typeof log.debug === 'function') {
    log.debug(message, ...parameters);
    return;
  }

  if (typeof log.log === 'function') {
    log.log(message, ...parameters);
  }
}

function safeTokenStatus(token) {
  return {
    connected: true,
    uid: token.uid,
    endpoint: token.endpoint,
    expiresAt: token.expireTimeMs,
  };
}

function normalizeRequiredString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RequestError(`${label} is required`, { status: 400 });
  }

  return value.trim();
}

function normalizeEndpoint(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return DEFAULT_LOGIN_ENDPOINT;
  }

  return value.trim();
}

function mapQrLoginError(result) {
  const code = result.code ?? 'UNKNOWN';
  const rawMessage = result.message ?? 'QR login failed';
  const normalized = `${code} ${rawMessage}`.toLowerCase();

  if (result.state === 'pending') {
    return {
      state: 'pending',
      code,
      message: 'Waiting for the QR code to be scanned in the Smart Life app.',
      severity: 'info',
      action: 'wait',
    };
  }

  if (result.state === 'expired') {
    return {
      state: 'expired',
      code,
      message: 'The QR code expired. Start QR login again to generate a fresh code.',
      severity: 'warning',
      action: 'restart',
    };
  }

  if (code === 'E0020003' || normalized.includes('designated app')) {
    return {
      state: 'failed',
      code,
      message: 'This QR code must be scanned with the Smart Life app using the account that owns the devices.',
      severity: 'error',
      action: 'check-app',
    };
  }

  if (normalized.includes('region') || normalized.includes('endpoint')) {
    return {
      state: 'failed',
      code,
      message: 'Smart Life rejected the login for this region or endpoint. Check the selected endpoint and try again.',
      severity: 'error',
      action: 'check-region',
    };
  }

  return {
    state: 'failed',
    code,
    message: rawMessage,
    severity: 'error',
    action: 'retry',
  };
}

class TuyaSmartLifeUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    const handlers = createUiHandlers({
      storagePath: this.homebridgeStoragePath,
      log: console,
    });

    this.onRequest('/status', handlers.status);
    this.onRequest('/qr/start', handlers.startQr);
    this.onRequest('/qr/poll', handlers.pollQr);
    this.ready();
  }
}

if (require.main === module) {
  new TuyaSmartLifeUiServer();
}

module.exports = {
  TuyaSmartLifeUiServer,
  createUiHandlers,
  mapQrLoginError,
};
