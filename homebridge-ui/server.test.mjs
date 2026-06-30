import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  createUiHandlers,
  mapQrLoginError,
} = require('./server.js');

function token(overrides = {}) {
  return {
    uid: 'uid-1',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expireTimeMs: Date.now() + 60_000,
    userCode: 'user-code',
    endpoint: 'https://openapi.tuya.example',
    ...overrides,
  };
}

function createMemoryTokenStore(initialToken = null) {
  let storedToken = initialToken;

  return {
    async load() {
      return storedToken;
    },
    async save(nextToken) {
      storedToken = nextToken;
    },
  };
}

test('reports whether a token is already stored without exposing credentials', async () => {
  const storedToken = token();
  const handlers = createUiHandlers({
    storagePath: '/tmp/homebridge',
    tokenStore: createMemoryTokenStore(storedToken),
  });

  const response = await handlers.status();

  assert.deepEqual(response, {
    connected: true,
    uid: 'uid-1',
    endpoint: 'https://openapi.tuya.example',
    expiresAt: storedToken.expireTimeMs,
  });
  assert.equal(JSON.stringify(response).includes('access-token'), false);
  assert.equal(JSON.stringify(response).includes('refresh-token'), false);
});

test('starts QR login and returns a displayable QR payload', async () => {
  const calls = [];
  const log = createMemoryLog();
  const handlers = createUiHandlers({
    storagePath: '/tmp/homebridge',
    tokenStore: createMemoryTokenStore(),
    log,
    createFlow(options) {
      calls.push(options);

      return {
        async createQrCode(userCode) {
          assert.equal(userCode, 'abc123');

          return {
            state: 'created',
            token: 'qr-token',
            qrUrl: 'tuyaSmart--qrLogin?token=qr-token',
            userCode,
          };
        },
      };
    },
    qrCodeToDataUrl: async (value) => `data:image/png;base64,${Buffer.from(value).toString('base64')}`,
  });

  const response = await handlers.startQr({
    userCode: ' abc123 ',
    endpoint: 'https://apigw.iotbing.com',
  });

  assert.equal(calls[0].loginEndpoint, 'https://apigw.iotbing.com');
  assert.equal(calls[0].log, log);
  assert.equal(response.state, 'created');
  assert.equal(response.qrToken, 'qr-token');
  assert.equal(response.qrImage.startsWith('data:image/png;base64,'), true);
  assert.equal(JSON.stringify(response).includes('access_token'), false);
  assert.match(log.lines.join('\n'), /QR login start requested/);
  assert.match(log.lines.join('\n'), /QR login token created/);
  assert.equal(log.lines.join('\n').includes('qr-token'), false);
});

test('polls QR login, persists token, and returns only safe status', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tuya-ui-server-'));
  const log = createMemoryLog();
  const handlers = createUiHandlers({
    storagePath: dir,
    log,
    createFlow() {
      return {
        async pollLoginResult(qrToken, userCode) {
          assert.equal(qrToken, 'qr-token');
          assert.equal(userCode, 'abc123');

          return {
            state: 'success',
            token: token({ uid: 'uid-2', endpoint: 'https://openapi.tuya.example' }),
          };
        },
      };
    },
  });

  const response = await handlers.pollQr({
    qrToken: 'qr-token',
    userCode: 'abc123',
    endpoint: 'https://apigw.iotbing.com',
  });

  assert.deepEqual(response, {
    state: 'success',
    connected: true,
    uid: 'uid-2',
    endpoint: 'https://openapi.tuya.example',
    expiresAt: response.expiresAt,
  });
  assert.equal(typeof response.expiresAt, 'number');
  assert.equal(JSON.stringify(response).includes('access-token'), false);
  assert.equal(JSON.stringify(response).includes('refresh-token'), false);

  const saved = JSON.parse(await readFile(join(dir, 'tuya-smartlife-token.json'), 'utf8'));
  assert.equal(saved.accessToken, 'access-token');
  assert.equal(saved.refreshToken, 'refresh-token');
  assert.match(log.lines.join('\n'), /QR login poll requested/);
  assert.match(log.lines.join('\n'), /QR login poll result: state=success/);
  assert.equal(log.lines.join('\n').includes('qr-token'), false);
  assert.equal(log.lines.join('\n').includes('access-token'), false);
});

test('maps known QR login failures to friendly messages', () => {
  assert.equal(mapQrLoginError({ state: 'pending', code: 'PENDING', message: 'pending' }).severity, 'info');
  assert.equal(mapQrLoginError({ state: 'expired', code: 'EXPIRED', message: 'expired' }).action, 'restart');
  assert.match(mapQrLoginError({ state: 'failed', code: 'E0020003', message: 'designated APP' }).message, /Smart Life app/i);
  assert.match(mapQrLoginError({ state: 'failed', code: 'REGION', message: 'region mismatch' }).message, /region/i);
});

test('rejects missing QR start input', async () => {
  const handlers = createUiHandlers({
    storagePath: '/tmp/homebridge',
    tokenStore: createMemoryTokenStore(),
  });

  await assert.rejects(() => handlers.startQr({ userCode: ' ' }), /Smart Life user code is required/);
});

function createMemoryLog() {
  const lines = [];

  return {
    lines,
    debug(message, ...parameters) {
      lines.push(format(message, parameters));
    },
  };
}

function format(message, parameters) {
  let nextIndex = 0;

  return message.replace(/%[sd]/g, () => String(parameters[nextIndex++]));
}
