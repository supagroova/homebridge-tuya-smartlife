export type TuyaEndpoint = string;

export type TuyaSignedHeaders = {
  'X-appKey': string;
  'X-requestId': string;
  'X-sid': string;
  'X-time': string;
  'X-token'?: string;
};

export type TokenInfo = {
  uid: string;
  accessToken: string;
  refreshToken: string;
  expireTimeMs: number;
};

export type PersistedTokenInfo = TokenInfo & {
  userCode?: string;
  terminalId?: string;
  endpoint?: TuyaEndpoint;
};

export type TuyaAuthClientOptions = {
  clientId: string;
  endpoint: TuyaEndpoint;
};

