import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const html = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];

assert.ok(script, 'expected inline setup script');

class FakeClassList {
  constructor(initial = []) {
    this.values = new Set(initial);
  }

  add(value) {
    this.values.add(value);
  }

  remove(value) {
    this.values.delete(value);
  }

  contains(value) {
    return this.values.has(value);
  }
}

class FakeElement {
  constructor(initialClasses = []) {
    this.classList = new FakeClassList(initialClasses);
    this.listeners = new Map();
    this.value = '';
    this.src = '';
    this.textContent = '';
    this.className = '';
    this.disabled = false;
  }

  addEventListener(eventName, listener) {
    this.listeners.set(eventName, listener);
  }

  async click() {
    const listener = this.listeners.get('click');

    if (listener) {
      await listener();
    }
  }
}

function createElements() {
  return {
    connectedPanel: new FakeElement(['d-none']),
    userCode: new FakeElement(),
    endpoint: new FakeElement(),
    startButton: new FakeElement(),
    checkButton: new FakeElement(),
    qrPanel: new FakeElement(['d-none']),
    qrImage: new FakeElement(),
    status: new FakeElement(),
  };
}

async function loadUi(requestHandlers) {
  const elements = createElements();
  const readyListeners = [];
  const requestCalls = [];
  const configUpdates = [];
  let saveCount = 0;
  let nextIntervalId = 1;
  const intervals = new Map();

  const homebridge = {
    toast: {
      success() {},
      error() {},
    },
    addEventListener(eventName, listener) {
      if (eventName === 'ready') {
        readyListeners.push(listener);
      }
    },
    async getPluginConfig() {
      return [];
    },
    async updatePluginConfig(nextConfig) {
      configUpdates.push(nextConfig);
    },
    async savePluginConfig() {
      saveCount += 1;
    },
    async request(path, body) {
      requestCalls.push({ path, body });
      const handler = requestHandlers[path];

      if (!handler) {
        throw new Error(`No request handler for ${path}`);
      }

      return handler(body);
    },
  };

  const window = {
    homebridge,
    setInterval(callback) {
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, callback);

      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  };
  const document = {
    getElementById(id) {
      return elements[id];
    },
  };

  vm.runInNewContext(script, { document, URL, window });

  for (const listener of readyListeners) {
    listener();
  }

  await flushAsyncWork();

  return {
    elements,
    async runIntervals() {
      for (const callback of intervals.values()) {
        await callback();
      }
    },
    requestCalls,
    configUpdates,
    get saveCount() {
      return saveCount;
    },
  };
}

async function flushAsyncWork() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('check status does not overwrite an active QR login state', async () => {
  const ui = await loadUi({
    async '/status'() {
      return { connected: false };
    },
    async '/qr/start'() {
      return {
        state: 'created',
        qrToken: 'qr-token',
        qrImage: 'data:image/png;base64,qr',
      };
    },
    async '/qr/poll'() {
      return {
        state: 'pending',
        message: 'Waiting for Smart Life confirmation.',
      };
    },
  });

  assert.match(ui.elements.status.textContent, /Not connected/);

  ui.elements.userCode.value = 'CaRLUI';
  await ui.elements.startButton.click();

  assert.equal(ui.elements.qrPanel.classList.contains('d-none'), false);
  assert.equal(ui.elements.status.textContent, 'Waiting for Smart Life scan...');

  await ui.elements.checkButton.click();

  assert.equal(ui.elements.qrPanel.classList.contains('d-none'), false);
  assert.equal(ui.elements.status.textContent, 'Waiting for Smart Life confirmation.');
});

test('start QR login shows the code before polling Tuya', async () => {
  const ui = await loadUi({
    async '/status'() {
      return { connected: false };
    },
    async '/qr/start'() {
      return {
        state: 'created',
        qrToken: 'qr-token',
        qrImage: 'data:image/png;base64,qr',
      };
    },
    async '/qr/poll'() {
      return {
        state: 'pending',
        message: 'Waiting for Smart Life confirmation.',
      };
    },
  });

  ui.elements.userCode.value = 'CaRLUI';
  await ui.elements.startButton.click();

  assert.equal(ui.elements.qrPanel.classList.contains('d-none'), false);
  assert.deepEqual(
    ui.requestCalls.map((call) => call.path),
    ['/status', '/qr/start'],
  );

  await ui.runIntervals();

  assert.deepEqual(
    ui.requestCalls.map((call) => call.path),
    ['/status', '/qr/start', '/qr/poll'],
  );
});

test('successful QR login saves plugin config and shows restart status', async () => {
  const ui = await loadUi({
    async '/status'() {
      return { connected: false };
    },
    async '/qr/start'() {
      return {
        state: 'created',
        qrToken: 'qr-token',
        qrImage: 'data:image/png;base64,qr',
      };
    },
    async '/qr/poll'() {
      return {
        state: 'success',
        connected: true,
        uid: 'uid-1',
        endpoint: 'https://openapi.tuya.example',
        expiresAt: Date.now() + 60_000,
      };
    },
  });

  ui.elements.endpoint.value = 'https://apigw.iotbing.com';
  ui.elements.userCode.value = 'CaRLUI';

  await ui.elements.startButton.click();
  await ui.runIntervals();

  assert.deepEqual(JSON.parse(JSON.stringify(ui.configUpdates)), [
    [
      {
        platform: 'TuyaSmartLife',
        name: 'Tuya SmartLife',
        endpoint: 'https://apigw.iotbing.com',
      },
    ],
  ]);
  assert.equal(ui.saveCount, 1);
  assert.match(ui.elements.status.textContent, /Configuration saved/);
});

test('invalid endpoint input fails visibly before requesting a QR code', async () => {
  const ui = await loadUi({
    async '/status'() {
      return { connected: false };
    },
    async '/qr/start'() {
      throw new Error('should not request QR with invalid endpoint');
    },
  });

  ui.elements.endpoint.value = 'https://apigiw.iotbing.com';
  ui.elements.userCode.value = 'CaRLUI';

  await ui.elements.startButton.click();

  assert.equal(ui.requestCalls.some((call) => call.path === '/qr/start'), false);
  assert.match(ui.elements.status.textContent, /Use https:\/\/apigw\.iotbing\.com/i);
});
