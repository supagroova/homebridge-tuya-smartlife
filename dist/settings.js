"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_FILE_NAME = exports.TUYA_CLIENT_ID = exports.PLUGIN_NAME = exports.PLATFORM_NAME = void 0;
/**
 * The platform name registered with Homebridge. Must match `pluginAlias` in config.schema.json.
 */
exports.PLATFORM_NAME = 'TuyaSmartLife';
/**
 * The npm package name. Must match the `name` field in package.json.
 */
exports.PLUGIN_NAME = 'homebridge-tuya-smartlife';
/**
 * Tuya-published Home Assistant compatible device-sharing client id.
 */
exports.TUYA_CLIENT_ID = 'HA_3y9q4ak7g4ephrvke';
/**
 * Stored under Homebridge's storage path.
 */
exports.TOKEN_FILE_NAME = 'tuya-smartlife-token.json';
