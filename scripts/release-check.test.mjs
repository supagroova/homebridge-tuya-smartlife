import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateConfigSchema,
  validatePackageMetadata,
  validatePackFiles,
  validatePublishWorkflow,
} from './release-check.mjs';

test('validates Homebridge npm package metadata', () => {
  validatePackageMetadata({
    name: 'homebridge-tuya-smartlife',
    main: 'dist/index.js',
    files: ['dist', 'config.schema.json'],
    keywords: ['homebridge-plugin', 'tuya'],
    peerDependencies: {
      homebridge: '^2.0.0',
    },
  });
});

test('rejects packages that are not Homebridge-discoverable', () => {
  assert.throws(
    () =>
      validatePackageMetadata({
        name: 'tuya-smartlife',
        main: 'dist/index.js',
        files: ['dist', 'config.schema.json'],
        keywords: ['tuya'],
        peerDependencies: {},
      }),
    /package name must start with homebridge-/,
  );
});

test('validates Homebridge config schema metadata', () => {
  validateConfigSchema({
    pluginAlias: 'TuyaSmartLife',
    pluginType: 'platform',
  });
});

test('validates npm provenance publish workflow', () => {
  validatePublishWorkflow(`
    name: Publish
    steps:
      - run: npm publish --provenance --access public
  `);
});

test('validates dry-run pack file contents', () => {
  validatePackFiles([
    {
      files: [{ path: 'dist/index.js' }, { path: 'config.schema.json' }, { path: 'package.json' }],
    },
  ]);
});
