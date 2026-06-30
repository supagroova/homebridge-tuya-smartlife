"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const platform_1 = require("./platform");
const settings_1 = require("./settings");
/**
 * Plugin entry point. Homebridge calls this with the API; we register the dynamic platform.
 */
exports.default = (api) => {
    api.registerPlatform(settings_1.PLATFORM_NAME, platform_1.TuyaSmartLifePlatform);
};
