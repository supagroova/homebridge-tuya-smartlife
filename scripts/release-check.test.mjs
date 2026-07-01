import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateConfigSchema,
  validateGitInstallFiles,
  validatePackageMetadata,
  validatePackFiles,
  validatePublishWorkflow,
  validateReleaseDocs,
} from './release-check.mjs';

test('validates Homebridge npm package metadata', () => {
  validatePackageMetadata({
    name: 'homebridge-tuya-smartlife',
    version: '1.0.1',
    homepage: 'https://github.com/supagroova/homebridge-tuya-smartlife#readme',
    bugs: {
      url: 'https://github.com/supagroova/homebridge-tuya-smartlife/issues',
    },
    main: 'dist/index.js',
    files: ['dist', 'config.schema.json', 'homebridge-ui/public', 'homebridge-ui/server.js'],
    keywords: ['homebridge-plugin', 'tuya'],
    devDependencies: {
      homebridge: '^2',
    },
  });
});

test('rejects packages that are not Homebridge-discoverable', () => {
  assert.throws(
    () =>
      validatePackageMetadata({
        name: 'homebridge-tuya-smartlife',
        version: '1.0.1',
        homepage: 'https://github.com/supagroova/homebridge-tuya-smartlife#readme',
        bugs: {
          url: 'https://github.com/supagroova/homebridge-tuya-smartlife/issues',
        },
        main: 'dist/index.js',
        files: ['dist', 'config.schema.json'],
        keywords: ['homebridge-plugin', 'tuya'],
        devDependencies: {
          homebridge: '^2',
        },
        scripts: {
          prepare: 'npm run build',
        },
      }),
    /package scripts.prepare must not be set/,
  );
});

test('rejects packages without valid semver', () => {
  assert.throws(
    () =>
      validatePackageMetadata({
        name: 'homebridge-tuya-smartlife',
        version: 'next',
        homepage: 'https://github.com/supagroova/homebridge-tuya-smartlife#readme',
        bugs: {
          url: 'https://github.com/supagroova/homebridge-tuya-smartlife/issues',
        },
        main: 'dist/index.js',
        files: ['dist', 'config.schema.json', 'homebridge-ui/public', 'homebridge-ui/server.js'],
        keywords: ['homebridge-plugin', 'tuya'],
        devDependencies: {
          homebridge: '^2',
        },
      }),
    /package version must be valid semver/,
  );
});

test('rejects packages missing Homebridge review metadata', () => {
  assert.throws(
    () =>
      validatePackageMetadata({
        name: 'homebridge-tuya-smartlife',
        version: '1.0.1',
        main: 'dist/index.js',
        files: ['dist', 'config.schema.json', 'homebridge-ui/public', 'homebridge-ui/server.js'],
        keywords: ['homebridge-plugin', 'tuya'],
        devDependencies: {
          homebridge: '^2',
        },
      }),
    /package homepage must start with https:\/\//,
  );
});

test('rejects Homebridge outside devDependencies', () => {
  assert.throws(
    () =>
      validatePackageMetadata({
        name: 'homebridge-tuya-smartlife',
        version: '1.0.1',
        homepage: 'https://github.com/supagroova/homebridge-tuya-smartlife#readme',
        bugs: {
          url: 'https://github.com/supagroova/homebridge-tuya-smartlife/issues',
        },
        main: 'dist/index.js',
        files: ['dist', 'config.schema.json', 'homebridge-ui/public', 'homebridge-ui/server.js'],
        keywords: ['homebridge-plugin', 'tuya'],
        peerDependencies: {
          homebridge: '^2.0.0',
        },
        devDependencies: {
          homebridge: '^2',
        },
      }),
    /package peerDependencies must not include homebridge/,
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
  assert.throws(
    () => validateGitInstallFiles(['dist/index.js']),
    /git install branch must track README.md/,
  );
});

test('validates Homebridge config schema metadata', () => {
  validateConfigSchema({
    pluginAlias: 'TuyaSmartLife',
    pluginType: 'platform',
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
        },
      },
    },
  });
});

test('rejects field-level required config schema properties', () => {
  assert.throws(
    () =>
      validateConfigSchema({
        pluginAlias: 'TuyaSmartLife',
        pluginType: 'platform',
        schema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              required: true,
            },
          },
        },
      }),
    /config.schema.json must use object-level required array/,
  );
});

test('rejects config schema with non-array object-level required value', () => {
  assert.throws(
    () =>
      validateConfigSchema({
        pluginAlias: 'TuyaSmartLife',
        pluginType: 'platform',
        schema: {
          type: 'object',
          required: true,
          properties: {
            name: {
              type: 'string',
            },
          },
        },
      }),
    /config.schema.json required must be an array/,
  );
});

test('validates npm provenance publish workflow', () => {
  validatePublishWorkflow(`
    name: Publish
    on:
      push:
        tags:
          - 'v*'
    steps:
      - run: npm ci
      - run: npm run release:check
      - run: npm publish --provenance --access public
  `);
});

test('rejects publish workflows without release checks before publish', () => {
  assert.throws(
    () =>
      validatePublishWorkflow(`
        on:
          push:
            tags:
              - 'v*'
        steps:
          - run: npm ci
          - run: npm publish --provenance --access public
      `),
    /publish workflow must run npm run release:check before publish/,
  );
});

test('rejects publish workflows triggered by branch pushes', () => {
  assert.throws(
    () =>
      validatePublishWorkflow(`
        on:
          push:
            branches:
              - main
            tags:
              - 'v*'
        steps:
          - run: npm ci
          - run: npm run release:check
          - run: npm publish --provenance --access public
      `),
    /publish workflow must not publish from branch pushes/,
  );
});

test('validates release documentation', () => {
  validateReleaseDocs({
    readme: `
      # Homebridge Tuya SmartLife

      [![npm](https://badgen.net/npm/v/homebridge-tuya-smartlife)](https://www.npmjs.com/package/homebridge-tuya-smartlife)
      [![npm](https://badgen.net/npm/dt/homebridge-tuya-smartlife)](https://www.npmjs.com/package/homebridge-tuya-smartlife)

      npm install -g homebridge-tuya-smartlife
    `,
    changelog: `
      # Changelog

      ## 1.0.1 - 2026-07-01
      - Homebridge verification metadata fixes.
    `,
  });
});

test('rejects release docs without changelog, npm badges, or premature verified badge', () => {
  assert.throws(
    () =>
      validateReleaseDocs({
        readme: `
          # Homebridge Tuya SmartLife
          [![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
        `,
        changelog: '# Changelog\n',
      }),
    /README must include npm version badge/,
  );
});

test('validates dry-run pack file contents', () => {
  validatePackFiles([
    {
      files: [
        { path: 'README.md' },
        { path: 'CHANGELOG.md' },
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
          files: [
            { path: 'dist/index.js' },
            { path: 'config.schema.json' },
            { path: 'package.json' },
          ],
        },
      ]),
    /npm pack must include README.md/,
  );
});
