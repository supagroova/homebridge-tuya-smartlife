import type { PersistedTokenInfo } from './types';
export type TokenStore = {
    load(): Promise<PersistedTokenInfo | null>;
    save(token: PersistedTokenInfo): Promise<void>;
};
export declare class FileTokenStore implements TokenStore {
    private readonly path;
    constructor(path: string);
    load(): Promise<PersistedTokenInfo | null>;
    save(token: PersistedTokenInfo): Promise<void>;
}
