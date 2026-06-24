import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { PersistedTokenInfo } from './types';

export type TokenStore = {
  load(): Promise<PersistedTokenInfo | null>;
  save(token: PersistedTokenInfo): Promise<void>;
};

export class FileTokenStore implements TokenStore {
  constructor(private readonly path: string) {}

  async load(): Promise<PersistedTokenInfo | null> {
    try {
      return JSON.parse(await readFile(this.path, 'utf8')) as PersistedTokenInfo;
    } catch (error) {
      if (isRecoverableReadError(error)) {
        return null;
      }

      throw error;
    }
  }

  async save(token: PersistedTokenInfo): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });

    const tempPath = `${this.path}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(token, null, 2)}\n`, 'utf8');
    await rename(tempPath, this.path);
  }
}

function isRecoverableReadError(error: unknown): boolean {
  return (
    error instanceof SyntaxError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT')
  );
}
