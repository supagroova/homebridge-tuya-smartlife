#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validatePackageMetadata(packageJson) {
  const errors = [];

  if (typeof packageJson.name !== 'string' || !packageJson.name.startsWith('homebridge-')) {
    errors.push('package name must start with homebridge-');
  }

  if (packageJson.main !== 'dist/index.js') {
    errors.push('package main must be dist/index.js');
  }

  if (!Array.isArray(packageJson.files) || !packageJson.files.includes('dist')) {
    errors.push('package files must include dist');
  }

  if (!Array.isArray(packageJson.files) || !packageJson.files.includes('config.schema.json')) {
    errors.push('package files must include config.schema.json');
  }

  if (!Array.isArray(packageJson.keywords) || !packageJson.keywords.includes('homebridge-plugin')) {
    errors.push('package keywords must include homebridge-plugin');
  }

  if (!packageJson.peerDependencies?.homebridge) {
    errors.push('package peerDependencies must include homebridge');
  }

  if (packageJson.scripts?.prepare !== undefined) {
    errors.push('package scripts.prepare must not be set');
  }

  throwIfErrors(errors);
}

export function validateGitInstallFiles(trackedFiles) {
  if (!trackedFiles.includes('dist/index.js')) {
    throw new Error('git install branch must track dist/index.js');
  }
}

export function validateConfigSchema(configSchema) {
  const errors = [];

  if (configSchema.pluginAlias !== 'TuyaSmartLife') {
    errors.push('config.schema.json pluginAlias must be TuyaSmartLife');
  }

  if (configSchema.pluginType !== 'platform') {
    errors.push('config.schema.json pluginType must be platform');
  }

  throwIfErrors(errors);
}

export function validatePublishWorkflow(workflowContent) {
  if (!workflowContent.includes('npm publish --provenance --access public')) {
    throw new Error('publish workflow must run npm publish --provenance --access public');
  }
}

export function validatePackFiles(packJson) {
  const files = new Set(packJson.flatMap((entry) => entry.files?.map((file) => file.path) ?? []));
  const errors = [];

  if (!files.has('dist/index.js')) {
    errors.push('npm pack must include dist/index.js');
  }

  if (!files.has('config.schema.json')) {
    errors.push('npm pack must include config.schema.json');
  }

  throwIfErrors(errors);
}

async function main() {
  const root = process.cwd();
  const packageJson = await readJson(resolve(root, 'package.json'));
  const configSchema = await readJson(resolve(root, 'config.schema.json'));
  const publishWorkflow = await readFile(resolve(root, '.github/workflows/publish.yml'), 'utf8');

  validatePackageMetadata(packageJson);
  validateConfigSchema(configSchema);
  validatePublishWorkflow(publishWorkflow);
  validateGitInstallFiles(runGitLsFiles(root));
  validatePackFiles(runNpmPackDryRun(root));

  console.log('Release check passed.');
}

function runNpmPackDryRun(cwd) {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NPM_CONFIG_CACHE:
        process.env.RELEASE_CHECK_NPM_CACHE ?? resolve(tmpdir(), 'homebridge-tuya-smartlife-npm-cache'),
      npm_config_cache:
        process.env.RELEASE_CHECK_NPM_CACHE ?? resolve(tmpdir(), 'homebridge-tuya-smartlife-npm-cache'),
    },
  });

  if (result.status !== 0) {
    throw new Error(`npm pack --dry-run failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function runGitLsFiles(cwd) {
  const result = spawnSync('git', ['ls-files'], {
    cwd,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout.split('\n').filter(Boolean);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function throwIfErrors(errors) {
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
