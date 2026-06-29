"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPlatformDiscovery = runPlatformDiscovery;
const errors_1 = require("./auth/errors");
async function runPlatformDiscovery(options) {
    const token = await options.tokenStore.load();
    if (token === null) {
        options.log.warn('Tuya Smart Life authentication is required before device discovery can run.');
        return { status: 'reauth-required' };
    }
    try {
        const client = options.createClient(token);
        const repository = options.createRepository(client);
        const discovery = await repository.discoverDevices();
        const reconcile = options.registry.reconcile(discovery.devices);
        options.log.info('Tuya discovery complete: %d homes, %d devices, %d registered, %d restored, %d pruned, %d unsupported.', discovery.homes.length, discovery.devices.length, reconcile.registered.length, reconcile.restored.length, reconcile.pruned.length, reconcile.unsupported.length);
        return {
            status: 'success',
            homes: discovery.homes,
            devices: discovery.devices,
            reconcile,
        };
    }
    catch (error) {
        if (error instanceof errors_1.TuyaReauthRequiredError) {
            options.log.warn('Tuya Smart Life re-authentication is required before device discovery can run.');
            return { status: 'reauth-required' };
        }
        options.log.error('Tuya discovery failed: %s', errorMessage(error));
        return { status: 'failed', error };
    }
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
