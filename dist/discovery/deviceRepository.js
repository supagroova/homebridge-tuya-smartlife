"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceRepository = void 0;
class DeviceRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async queryHomes() {
        const response = await this.client.get('/v1.0/m/life/users/homes');
        const homes = asArray(response.result);
        return homes.map((home) => ({
            id: String(home.ownerId),
            name: home.name ?? String(home.ownerId),
        }));
    }
    async queryDevicesByHome(homeId) {
        const response = await this.client.get('/v1.0/m/life/ha/home/devices', { homeId });
        const rawDevices = asArray(response.result);
        return Promise.all(rawDevices.map((device) => this.normalizeDevice(homeId, device)));
    }
    async discoverDevices() {
        const homes = await this.queryHomes();
        const deviceGroups = await Promise.all(homes.map((home) => this.queryDevicesByHome(home.id)));
        return {
            homes,
            devices: deviceGroups.flat(),
        };
    }
    async sendCommands(deviceId, commands) {
        await this.client.post(`/v1.1/m/thing/${deviceId}/commands`, undefined, { commands });
    }
    async normalizeDevice(homeId, raw) {
        const [specification, statusRanges, reportTypes] = await Promise.all([
            this.querySpecifications(raw.id),
            this.queryStatusRanges(raw.id),
            this.queryReportTypes(raw.id),
        ]);
        return {
            id: raw.id,
            name: raw.name ?? raw.id,
            category: raw.category ?? '',
            productId: raw.product_id,
            productName: raw.product_name,
            online: raw.online ?? false,
            homeId,
            status: Object.fromEntries((raw.status ?? []).map((item) => [item.code, item.value])),
            functions: byCode(specification.functions ?? []),
            statusRanges: {
                ...byCode(specification.status ?? []),
                ...byCode(statusRanges),
            },
            reportTypes,
            raw,
        };
    }
    async querySpecifications(deviceId) {
        const response = await this.client.get(`/v1.1/m/life/${deviceId}/specifications`);
        return (response.result ?? {});
    }
    async queryStatusRanges(deviceId) {
        const response = await this.client.get(`/v1.0/m/life/devices/${deviceId}/status`);
        return asArray(response.result);
    }
    async queryReportTypes(deviceId) {
        const response = await this.client.get(`/v1.0/m/life/ha/${deviceId}/dp-report-types`);
        return (response.result ?? {});
    }
}
exports.DeviceRepository = DeviceRepository;
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function byCode(items) {
    return Object.fromEntries(items.map((item) => [item.code, item]));
}
