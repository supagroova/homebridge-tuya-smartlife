import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('./public/index.html', import.meta.url), 'utf8');

test('explains where to find the Smart Life user code', () => {
  assert.match(html, /Smart Life app/i);
  assert.match(html, /Settings\s*>\s*Account and Security\s*>\s*User Code/i);
});

test('checks QR login immediately after rendering instead of waiting for the first interval', () => {
  assert.match(html, /pollTimer\s*=\s*window\.setInterval\(pollQrLogin,\s*pollIntervalMs\)/);
  assert.match(html, /await pollQrLogin\(\)/);
});

test('saves a Homebridge platform config after QR login succeeds', () => {
  assert.match(html, /homebridge\.getPluginConfig\(\)/);
  assert.match(html, /platform:\s*'TuyaSmartLife'/);
  assert.match(html, /homebridge\.updatePluginConfig\(/);
  assert.match(html, /homebridge\.savePluginConfig\(\)/);
  assert.match(html, /Configuration saved/i);
});
