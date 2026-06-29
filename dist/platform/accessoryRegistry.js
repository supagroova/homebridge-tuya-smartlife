"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccessoryRegistry = void 0;
const supportedCategories_1 = require("../discovery/supportedCategories");
class AccessoryRegistry {
    options;
    constructor(options) {
        this.options = options;
    }
    reconcile(devices) {
        const discoveredIds = new Set(devices.map((device) => device.id));
        const cachedByDeviceId = new Map(this.options.cachedAccessories
            .map((accessory) => [accessory.context.tuyaDeviceId, accessory])
            .filter((entry) => typeof entry[0] === 'string'));
        const registered = [];
        const restored = [];
        const unsupported = [];
        for (const device of devices) {
            if (!(0, supportedCategories_1.isSupportedCategory)(device.category)) {
                unsupported.push(device);
                continue;
            }
            const cached = cachedByDeviceId.get(device.id);
            if (cached) {
                updateContext(cached, device);
                this.options.bindAccessory?.(cached, device);
                restored.push(cached);
                continue;
            }
            const accessory = new this.options.api.platformAccessory(device.name, this.uuidFor(device.id));
            updateContext(accessory, device);
            this.options.bindAccessory?.(accessory, device);
            registered.push(accessory);
        }
        if (registered.length > 0) {
            this.options.api.registerPlatformAccessories(this.options.pluginName, this.options.platformName, registered);
        }
        const pruned = this.options.cachedAccessories.filter((accessory) => {
            const deviceId = accessory.context.tuyaDeviceId;
            return typeof deviceId === 'string' && !discoveredIds.has(deviceId);
        });
        if (pruned.length > 0) {
            this.options.api.unregisterPlatformAccessories(this.options.pluginName, this.options.platformName, pruned);
        }
        return {
            registered,
            restored,
            pruned,
            unsupported,
        };
    }
    uuidFor(deviceId) {
        return this.options.api.hap.uuid.generate(`tuya-smartlife:${deviceId}`);
    }
}
exports.AccessoryRegistry = AccessoryRegistry;
function updateContext(accessory, device) {
    accessory.context.tuyaDeviceId = device.id;
    accessory.context.tuyaCategory = device.category;
    accessory.context.tuyaHomeId = device.homeId;
    accessory.context.tuyaDeviceName = device.name;
    accessory.context.tuyaDeviceOnline = device.online;
    accessory.context.tuyaProductId = device.productId;
    accessory.context.tuyaStatus = device.status;
}
