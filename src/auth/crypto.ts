import { createCipheriv, createDecipheriv, createHash, createHmac, randomInt } from 'node:crypto';

import type { TuyaSignedHeaders } from './types';

const NONCE_ALPHABET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
const SIGNED_HEADER_ORDER = ['X-appKey', 'X-requestId', 'X-sid', 'X-time', 'X-token'] as const;

export function formToJson(content: Record<string, unknown>): string {
  return JSON.stringify(content);
}

export function md5HashKey(requestId: string, refreshToken: string): string {
  return createHash('md5').update(requestId + refreshToken, 'utf8').digest('hex');
}

export function generateSecret(requestId: string, sessionId: string, hashKey: string): string {
  let message = hashKey;

  if (sessionId !== '') {
    const length = Math.min(sessionId.length, 16);
    let ecode = '';

    for (let index = 0; index < length; index += 1) {
      ecode += sessionId[sessionId.charCodeAt(index) % 16];
    }

    message += `_${ecode}`;
  }

  return createHmac('sha256', Buffer.from(requestId, 'utf8'))
    .update(message, 'utf8')
    .digest('hex')
    .slice(0, 16);
}

export function encryptAesGcm(rawData: string, secret: string, nonce = randomNonce()): string {
  const cipher = createCipheriv('aes-128-gcm', Buffer.from(secret, 'utf8'), Buffer.from(nonce, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(rawData, 'utf8'), cipher.final(), cipher.getAuthTag()]);

  return Buffer.from(nonce, 'utf8').toString('base64') + encrypted.toString('base64');
}

export function decryptAesGcm(cipherData: string, secret: string): string {
  const decoded = Buffer.from(cipherData, 'base64');
  const nonce = decoded.subarray(0, 12);
  const cipherTextWithTag = decoded.subarray(12);
  const authTag = cipherTextWithTag.subarray(cipherTextWithTag.length - 16);
  const cipherText = cipherTextWithTag.subarray(0, cipherTextWithTag.length - 16);
  const decipher = createDecipheriv('aes-128-gcm', Buffer.from(secret, 'utf8'), nonce);

  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
}

export function restfulSign(
  hashKey: string,
  queryEncdata: string,
  bodyEncdata: string,
  headers: TuyaSignedHeaders,
): string {
  let headerSignString = '';

  for (const header of SIGNED_HEADER_ORDER) {
    const value = headers[header] ?? '';

    if (value !== '') {
      headerSignString += `${header}=${value}||`;
    }
  }

  let signString = headerSignString.slice(0, -2);

  if (queryEncdata !== '') {
    signString += queryEncdata;
  }

  if (bodyEncdata !== '') {
    signString += bodyEncdata;
  }

  return createHmac('sha256', Buffer.from(hashKey, 'utf8')).update(signString, 'utf8').digest('hex');
}

function randomNonce(): string {
  let nonce = '';

  for (let index = 0; index < 12; index += 1) {
    nonce += NONCE_ALPHABET[randomInt(0, NONCE_ALPHABET.length)];
  }

  return nonce;
}
