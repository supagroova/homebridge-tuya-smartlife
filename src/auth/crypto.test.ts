import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  decryptAesGcm,
  encryptAesGcm,
  formToJson,
  generateSecret,
  md5HashKey,
  restfulSign,
} from './crypto';
import type { TuyaSignedHeaders } from './types';

type CryptoFixture = {
  requestId: string;
  refreshToken: string;
  accessToken: string;
  clientId: string;
  time: string;
  nonce: string;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
  queryJson: string;
  bodyJson: string;
  hashKey: string;
  emptySidSecret: string;
  nonEmptySid: string;
  nonEmptySidSecret: string;
  queryEncdata: string;
  bodyEncdata: string;
  xSign: string;
  noTokenSign: string;
};

const fixture = JSON.parse(
  readFileSync(join(__dirname, '../../test/fixtures/tuya-sharing-crypto-vectors.json'), 'utf8'),
) as CryptoFixture;

describe('Tuya device-sharing crypto helpers', () => {
  it('serializes JSON in the compact Python SDK form', () => {
    expect(formToJson(fixture.query)).toBe(fixture.queryJson);
    expect(formToJson(fixture.body)).toBe(fixture.bodyJson);
  });

  it('derives the SDK hash key and request secret', () => {
    expect(md5HashKey(fixture.requestId, fixture.refreshToken)).toBe(fixture.hashKey);
    expect(generateSecret(fixture.requestId, '', fixture.hashKey)).toBe(fixture.emptySidSecret);
    expect(generateSecret(fixture.requestId, fixture.nonEmptySid, fixture.hashKey)).toBe(
      fixture.nonEmptySidSecret,
    );
  });

  it('encrypts and decrypts AES-GCM encdata with the SDK wire encoding', () => {
    expect(encryptAesGcm(fixture.queryJson, fixture.emptySidSecret, fixture.nonce)).toBe(
      fixture.queryEncdata,
    );
    expect(encryptAesGcm(fixture.bodyJson, fixture.emptySidSecret, fixture.nonce)).toBe(
      fixture.bodyEncdata,
    );
    expect(decryptAesGcm(fixture.queryEncdata, fixture.emptySidSecret)).toBe(fixture.queryJson);
    expect(decryptAesGcm(fixture.bodyEncdata, fixture.emptySidSecret)).toBe(fixture.bodyJson);
  });

  it('signs headers and encrypted payloads in fixed SDK header order', () => {
    const headers: TuyaSignedHeaders = {
      'X-token': fixture.accessToken,
      'X-time': fixture.time,
      'X-sid': '',
      'X-requestId': fixture.requestId,
      'X-appKey': fixture.clientId,
    };

    expect(restfulSign(fixture.hashKey, fixture.queryEncdata, fixture.bodyEncdata, headers)).toBe(
      fixture.xSign,
    );
  });

  it('omits empty header values when signing', () => {
    const headers: TuyaSignedHeaders = {
      'X-appKey': fixture.clientId,
      'X-requestId': fixture.requestId,
      'X-sid': '',
      'X-time': fixture.time,
    };

    expect(restfulSign(fixture.hashKey, '', '', headers)).toBe(fixture.noTokenSign);
  });
});
