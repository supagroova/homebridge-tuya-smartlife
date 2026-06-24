#!/usr/bin/env node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);

const usage = `Usage: npm run auth:qr-login -- --user-code <code> --client-id <id> --schema <schema> [options]

Dev-only Smart Life QR login probe. Run npm run build first, or use the npm script above.

Required:
  --user-code <code>       Smart Life user code from the app
  --client-id <id>         Tuya-issued client id for this probe
  --schema <schema>        Tuya-issued app schema for this probe

Options:
  --token-file <path>      Token output path (default: .tuya-token.json)
  --login-endpoint <url>   Login endpoint (default: https://apigw.iotbing.com)
  --poll-interval-ms <ms>  Poll interval after QR is printed (default: 3000)
  --max-polls <count>      Max poll attempts (default: 60)
  --help                   Show this help

Warning:
  Temporary probe credentials, including any Home Assistant credential used locally, are not a
  production path and must never be committed, documented as setup, or shipped in package defaults.
`;

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(usage);
  process.exit(0);
}

const missing = ['userCode', 'clientId', 'schema'].filter((key) => !args[key]);

if (missing.length > 0) {
  console.error(`Missing required option(s): ${missing.join(', ')}\n`);
  console.error(usage);
  process.exit(2);
}

const { QrLoginFlow } = require('../dist/auth/qrLoginFlow.js');
const { FileTokenStore } = require('../dist/auth/tokenStore.js');

const tokenFile = resolve(args.tokenFile ?? '.tuya-token.json');
const flow = new QrLoginFlow({
  clientId: args.clientId,
  schema: args.schema,
  loginEndpoint: args.loginEndpoint,
  tokenStore: new FileTokenStore(tokenFile),
});

console.log('Starting dev-only Tuya QR login probe.');
console.log('No credentials are embedded in the plugin package; all values came from CLI/env input.');

const created = await flow.createQrCode(args.userCode);

if (created.state !== 'created') {
  console.error(`QR token creation failed: ${created.code} ${created.message}`);
  process.exit(1);
}

console.log(`Scan this QR URL with Smart Life: ${created.qrUrl}`);
console.log(`Polling for scan result; token output path: ${tokenFile}`);

for (let attempt = 1; attempt <= args.maxPolls; attempt += 1) {
  const result = await flow.pollLoginResult(created.token, args.userCode);

  if (result.state === 'success') {
    console.log('QR login succeeded. Token was saved locally.');
    console.log(`Endpoint: ${result.token.endpoint ?? '(not supplied)'}`);
    process.exit(0);
  }

  if (result.state === 'failed' || result.state === 'expired') {
    console.error(`QR login ${result.state}: ${result.code} ${result.message}`);
    process.exit(1);
  }

  console.log(`Waiting for QR scan (${attempt}/${args.maxPolls})...`);
  await delay(args.pollIntervalMs);
}

console.error('QR login timed out before a successful scan.');
process.exit(1);

function parseArgs(argv) {
  const parsed = {
    pollIntervalMs: 3000,
    maxPolls: 60,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }

    const value = argv[index + 1];

    switch (arg) {
      case '--user-code':
        parsed.userCode = value;
        index += 1;
        break;
      case '--client-id':
        parsed.clientId = value;
        index += 1;
        break;
      case '--schema':
        parsed.schema = value;
        index += 1;
        break;
      case '--token-file':
        parsed.tokenFile = value;
        index += 1;
        break;
      case '--login-endpoint':
        parsed.loginEndpoint = value;
        index += 1;
        break;
      case '--poll-interval-ms':
        parsed.pollIntervalMs = Number(value);
        index += 1;
        break;
      case '--max-polls':
        parsed.maxPolls = Number(value);
        index += 1;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return parsed;
}
