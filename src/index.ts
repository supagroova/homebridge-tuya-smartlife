// tdd-audit: exempt
import type { API } from 'homebridge';

import { TuyaSmartLifePlatform } from './platform';
import { PLATFORM_NAME } from './settings';

/**
 * Plugin entry point. Homebridge calls this with the API; we register the dynamic platform.
 */
export default (api: API): void => {
  api.registerPlatform(PLATFORM_NAME, TuyaSmartLifePlatform);
};
