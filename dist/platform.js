"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuyaSmartLifePlatform = void 0;
// tdd-audit: exempt
const node_path_1 = require("node:path");
const errors_1 = require("./auth/errors");
const sensorAccessory_1 = require("./accessories/sensorAccessory");
const switchOutletAccessory_1 = require("./accessories/switchOutletAccessory");
const thermostatAccessory_1 = require("./accessories/thermostatAccessory");
const customerApi_1 = require("./auth/customerApi");
const tokenStore_1 = require("./auth/tokenStore");
const deviceRepository_1 = require("./discovery/deviceRepository");
const accessoryRegistry_1 = require("./platform/accessoryRegistry");
const platformDiscovery_1 = require("./platformDiscovery");
const settings_1 = require("./settings");
const poller_1 = require("./updates/poller");
const updateHub_1 = require("./updates/updateHub");
/**
 * TuyaSmartLifePlatform is the Homebridge dynamic platform. It caches accessories restored from
 * disk and, once Homebridge has finished launching, will discover Tuya devices from the cloud.
 *
 * Device-specific services are added in later phases; this class only wires platform lifecycle.
 */
class TuyaSmartLifePlatform {
    log;
    config;
    api;
    accessories = [];
    statusPoller;
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        this.log.debug('Initialising %s platform (%s)', settings_1.PLATFORM_NAME, settings_1.PLUGIN_NAME);
        // HAP types/Characteristics are accessed via this.api.hap (never imported directly).
        this.log.debug('Using HAP characteristics: %s', this.api.hap.Characteristic !== undefined);
        this.api.on('didFinishLaunching', () => {
            void this.discoverDevices();
        });
    }
    /**
     * Invoked by Homebridge for each accessory restored from cache on startup.
     */
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache: %s', accessory.displayName);
        this.accessories.push(accessory);
    }
    async discoverDevices() {
        const tokenStore = new tokenStore_1.FileTokenStore((0, node_path_1.join)(this.api.user.storagePath(), settings_1.TOKEN_FILE_NAME));
        let activeRepository;
        const updateHub = new updateHub_1.UpdateHub();
        const communicationFailure = () => new this.api.hap.HapStatusError(-70402 /* this.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        const registry = new accessoryRegistry_1.AccessoryRegistry({
            api: this.api,
            pluginName: settings_1.PLUGIN_NAME,
            platformName: settings_1.PLATFORM_NAME,
            cachedAccessories: this.accessories,
            bindAccessory: (accessory, device) => {
                if (activeRepository === undefined) {
                    throw new Error('Device repository is not ready');
                }
                (0, switchOutletAccessory_1.bindSwitchOutletAccessory)({
                    hap: this.api.hap,
                    accessory,
                    device,
                    sendCommands: (deviceId, commands) => activeRepository?.sendCommands(deviceId, commands),
                    getDevice: (deviceId) => updateHub.get(deviceId),
                    applySnapshot: (deviceSnapshot) => updateHub.applySnapshot(deviceSnapshot),
                    communicationFailure,
                });
                (0, sensorAccessory_1.bindSensorAccessory)({
                    hap: this.api.hap,
                    accessory,
                    device,
                    getDevice: (deviceId) => updateHub.get(deviceId),
                    communicationFailure,
                });
                (0, thermostatAccessory_1.bindThermostatAccessory)({
                    hap: this.api.hap,
                    accessory,
                    device,
                    sendCommands: (deviceId, commands) => activeRepository?.sendCommands(deviceId, commands),
                    getDevice: (deviceId) => updateHub.get(deviceId),
                    applySnapshot: (deviceSnapshot) => updateHub.applySnapshot(deviceSnapshot),
                    communicationFailure,
                });
            },
        });
        const discovery = await (0, platformDiscovery_1.runPlatformDiscovery)({
            log: this.log,
            tokenStore,
            createClient: (token) => new customerApi_1.TuyaDeviceSharingClient({
                clientId: settings_1.TUYA_CLIENT_ID,
                endpoint: requireEndpoint(token),
                token,
                onTokenUpdate: (nextToken) => tokenStore.save(mergeTokenUpdate(token, nextToken)),
            }),
            createRepository: (client) => {
                activeRepository = new deviceRepository_1.DeviceRepository(client);
                return activeRepository;
            },
            registry,
        });
        if (discovery.status !== 'success' || activeRepository === undefined) {
            return;
        }
        updateHub.replaceAll(discovery.devices);
        this.statusPoller?.stop();
        this.statusPoller = new poller_1.DeviceStatusPoller({
            repository: activeRepository,
            updateHub,
            log: this.log,
            intervalMs: 120_000,
            jitterRatio: 0.2,
            backoffMultiplier: 2,
            maxBackoffMs: 15 * 60_000,
        });
        this.statusPoller.start();
    }
}
exports.TuyaSmartLifePlatform = TuyaSmartLifePlatform;
function requireEndpoint(token) {
    if (!token.endpoint) {
        throw new errors_1.TuyaReauthRequiredError('missing endpoint');
    }
    return token.endpoint;
}
function mergeTokenUpdate(storedToken, nextToken) {
    return {
        ...storedToken,
        ...nextToken,
    };
}
