"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindSwitchOutletAccessory = bindSwitchOutletAccessory;
const switchOutlet_1 = require("../mappers/switchOutlet");
const statusReader_1 = require("./statusReader");
function bindSwitchOutletAccessory(options) {
    options.accessory.context.tuyaStatus = { ...options.device.status };
    const statusReader = (0, statusReader_1.createStatusReader)(options);
    for (const mapping of (0, switchOutlet_1.buildSwitchOutletMappings)(options.device)) {
        const serviceConstructor = mapping.serviceType === 'outlet' ? options.hap.Service.Outlet : options.hap.Service.Switch;
        const service = options.accessory.getServiceById(serviceConstructor, mapping.code) ??
            options.accessory.addService(serviceConstructor, mapping.displayName, mapping.code);
        if (mapping.serviceType === 'outlet') {
            service.setCharacteristic?.(options.hap.Characteristic.OutletInUse, true);
        }
        service
            .getCharacteristic(options.hap.Characteristic.On)
            .onGet(() => statusReader.statusValue(mapping.code))
            .onSet(async (value) => {
            statusReader.requireOnlineDevice();
            const nextValue = Boolean(value);
            const command = mapping.command(nextValue);
            await options.sendCommands(options.device.id, [command]);
            const nextDevice = statusReader.applyCommandValues([command]);
            options.accessory.context.tuyaStatus = { ...nextDevice.status };
        });
    }
}
