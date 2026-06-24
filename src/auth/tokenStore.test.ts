import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { FileTokenStore } from './tokenStore';
import type { PersistedTokenInfo } from './types';

const token: PersistedTokenInfo = {
  uid: 'user-1',
  accessToken: 'dummy-access-token',
  refreshToken: 'dummy-refresh-token',
  expireTimeMs: 1_710_000_000_000,
  userCode: 'dummy-user-code',
  terminalId: 'dummy-terminal-id',
  endpoint: 'https://openapi.example.test',
};

describe('FileTokenStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'tuya-token-store-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when the token file is missing', async () => {
    await expect(new FileTokenStore(join(dir, 'missing.json')).load()).resolves.toBeNull();
  });

  it('saves and loads a token round trip', async () => {
    const store = new FileTokenStore(join(dir, 'token.json'));

    await store.save(token);

    await expect(store.load()).resolves.toEqual(token);
  });

  it('loads a token saved by a previous store instance', async () => {
    const path = join(dir, 'token.json');

    await new FileTokenStore(path).save(token);

    await expect(new FileTokenStore(path).load()).resolves.toEqual(token);
  });

  it('returns null for corrupt JSON so callers can re-authenticate', async () => {
    const path = join(dir, 'token.json');

    await writeFile(path, '{not-json', 'utf8');

    await expect(new FileTokenStore(path).load()).resolves.toBeNull();
  });

  it('creates parent directories when saving', async () => {
    const path = join(dir, 'nested', 'auth', 'token.json');

    await new FileTokenStore(path).save(token);

    await expect(readFile(path, 'utf8')).resolves.toContain('dummy-access-token');
  });

  it('does not add debug metadata to the saved token file', async () => {
    const path = join(dir, 'token.json');

    await new FileTokenStore(path).save(token);

    const saved = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    expect(Object.keys(saved).sort()).toEqual([
      'accessToken',
      'endpoint',
      'expireTimeMs',
      'refreshToken',
      'terminalId',
      'uid',
      'userCode',
    ]);
  });
});
