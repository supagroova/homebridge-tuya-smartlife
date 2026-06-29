"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceStatusPoller = void 0;
class DeviceStatusPoller {
    options;
    timer;
    running = false;
    polling = false;
    nextDelayMs;
    random;
    constructor(options) {
        this.options = options;
        this.nextDelayMs = options.intervalMs;
        this.random = options.random ?? Math.random;
    }
    start() {
        if (this.running) {
            return;
        }
        this.running = true;
        this.schedule(0);
    }
    stop() {
        this.running = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
    schedule(delayMs) {
        if (!this.running) {
            return;
        }
        this.timer = setTimeout(() => {
            void this.poll();
        }, delayMs);
    }
    async poll() {
        if (!this.running || this.polling) {
            return;
        }
        this.polling = true;
        try {
            const discovery = await this.options.repository.discoverDevices();
            this.options.updateHub.replaceAll(discovery.devices);
            this.nextDelayMs = this.options.intervalMs;
        }
        catch (error) {
            this.options.log.warn('Tuya status poll failed: %s', errorMessage(error));
            this.nextDelayMs = Math.min(Math.max(this.options.intervalMs, this.nextDelayMs * this.options.backoffMultiplier), this.options.maxBackoffMs);
        }
        finally {
            this.polling = false;
            this.schedule(jitteredDelay(this.nextDelayMs, this.options.jitterRatio, this.random));
        }
    }
}
exports.DeviceStatusPoller = DeviceStatusPoller;
function jitteredDelay(intervalMs, jitterRatio, random) {
    if (jitterRatio <= 0) {
        return intervalMs;
    }
    const jitterRange = intervalMs * jitterRatio;
    const offset = (random() * 2 - 1) * jitterRange;
    return Math.max(0, Math.round(intervalMs + offset));
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
