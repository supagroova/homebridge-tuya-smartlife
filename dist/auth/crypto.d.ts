import type { TuyaSignedHeaders } from './types';
export declare function formToJson(content: Record<string, unknown>): string;
export declare function md5HashKey(requestId: string, refreshToken: string): string;
export declare function generateSecret(requestId: string, sessionId: string, hashKey: string): string;
export declare function encryptAesGcm(rawData: string, secret: string, nonce?: string): string;
export declare function decryptAesGcm(cipherData: string, secret: string): string;
export declare function restfulSign(hashKey: string, queryEncdata: string, bodyEncdata: string, headers: TuyaSignedHeaders): string;
