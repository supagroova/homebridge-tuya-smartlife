"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateHub = void 0;
class UpdateHub {
    devices = new Map();
    listeners = new Map();
    replaceAll(devices) {
        for (const device of devices) {
            this.applySnapshot(device);
        }
    }
    applySnapshot(device) {
        const previous = this.devices.get(device.id);
        this.devices.set(device.id, device);
        if (!hasChanged(previous, device)) {
            return;
        }
        for (const listener of this.listeners.get(device.id) ?? []) {
            listener({ device, previous });
        }
    }
    get(deviceId) {
        return this.devices.get(deviceId);
    }
    subscribe(deviceId, listener) {
        let listeners = this.listeners.get(deviceId);
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(deviceId, listeners);
        }
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
            if (listeners.size === 0) {
                this.listeners.delete(deviceId);
            }
        };
    }
}
exports.UpdateHub = UpdateHub;
function hasChanged(previous, next) {
    return previous === undefined || previous.online !== next.online || !statusEqual(previous.status, next.status);
}
function statusEqual(left, right) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
        return false;
    }
    return leftKeys.every((key) => Object.is(left[key], right[key]));
}
