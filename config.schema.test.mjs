import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const schema = JSON.parse(await readFile(new URL('./config.schema.json', import.meta.url), 'utf8'));

test('enables the Homebridge custom UI for QR setup', () => {
  assert.equal(schema.pluginAlias, 'TuyaSmartLife');
  assert.equal(schema.pluginType, 'platform');
  assert.equal(schema.singular, true);
  assert.equal(schema.customUi, true);
});

test('exposes setup fields without hand-editing JSON', () => {
  const properties = schema.schema.properties;

  assert.equal(properties.name.type, 'string');
  assert.equal(properties.endpoint.type, 'string');
  assert.equal(properties.homeIds.type, 'array');
  assert.equal(properties.deviceIds.type, 'array');
  assert.equal(properties.debug.type, 'boolean');
  assert.equal(properties.pollIntervalSeconds.type, 'integer');
});
