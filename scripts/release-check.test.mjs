import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateConfigSchema,
  validateGitInstallFiles,
  validatePackageMetadata,
  validatePackFiles,
  validatePublishWorkflow,
} from './release-check.mjs';

test('validates Homebridge npm package metadata', () => {
  validatePackageMetadata({
    name: 'homebridge-tuya-smartlife',
    main: 'dist/index.js',
    files: ['dist', 'config.schema.json', 'homebridge-ui/public', 'homebridge-ui/server.js'],
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
        name: 'homebridge-tuya-smartlife',
        main: 'dist/index.js',
        files: ['dist', 'config.schema.json'],
        keywords: ['homebridge-plugin', 'tuya'],
        peerDependencies: {
          homebridge: '^2.0.0',
        },
        scripts: {
          prepare: 'npm run build',
        },
      }),
    /package scripts.prepare must not be set/,
  );
});

test('validates github install files are already built', () => {
  validateGitInstallFiles([
    'README.md',
    'dist/index.js',
    'dist/platform.js',
    'homebridge-ui/public/index.html',
    'homebridge-ui/server.js',
  ]);
});

test('rejects github installs without tracked build output', () => {
  assert.throws(
    () =>
      validateGitInstallFiles([
        'README.md',
        'src/index.ts',
        'homebridge-ui/public/index.html',
        'homebridge-ui/server.js',
      ]),
    /git install branch must track dist\/index.js/,
  );
});

test('rejects github installs without custom UI assets and README', () => {
  assert.throws(() => validateGitInstallFiles(['dist/index.js']), /git install branch must track README.md/);
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
      files: [
        { path: 'README.md' },
        { path: 'dist/index.js' },
        { path: 'config.schema.json' },
        { path: 'homebridge-ui/public/index.html' },
        { path: 'homebridge-ui/server.js' },
        { path: 'package.json' },
      ],
    },
  ]);
});

test('rejects dry-run packs without custom UI assets and README', () => {
  assert.throws(
    () =>
      validatePackFiles([
        {
          files: [{ path: 'dist/index.js' }, { path: 'config.schema.json' }, { path: 'package.json' }],
        },
      ]),
    /npm pack must include README.md/,
  );
});
