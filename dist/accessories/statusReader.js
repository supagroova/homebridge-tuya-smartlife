"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStatusReader = createStatusReader;
function createStatusReader(options) {
    return {
        currentDevice: () => currentDevice(options),
        requireOnlineDevice: () => requireOnlineDevice(options),
        statusValue: (code) => requireOnlineDevice(options).status[code],
        applyCommandValues: (commands) => applyCommandValues(options, commands),
    };
}
function currentDevice(options) {
    return options.getDevice?.(options.device.id) ?? options.device;
}
function requireOnlineDevice(options) {
    const device = currentDevice(options);
    if (!device.online) {
        throw (options.communicationFailure ?? defaultCommunicationFailure)();
    }
    return device;
}
function applyCommandValues(options, commands) {
    const device = currentDevice(options);
    const nextDevice = {
        ...device,
        status: {
            ...device.status,
            ...Object.fromEntries(commands.map((command) => [command.code, command.value])),
        },
    };
    if (options.applySnapshot) {
        options.applySnapshot(nextDevice);
        return nextDevice;
    }
    options.device.status = nextDevice.status;
    return nextDevice;
}
function defaultCommunicationFailure() {
    return new Error('Tuya device is offline');
}
