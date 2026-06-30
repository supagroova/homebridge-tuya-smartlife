"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindThermostatAccessory = bindThermostatAccessory;
const thermostat_1 = require("../mappers/thermostat");
const statusReader_1 = require("./statusReader");
const THERMOSTAT_SUBTYPE = 'thermostat';
const BATTERY_SUBTYPE = 'battery';
function bindThermostatAccessory(options) {
    const mapping = (0, thermostat_1.buildThermostatMapping)(options.device);
    if (!mapping) {
        return;
    }
    options.accessory.context.tuyaStatus = { ...options.device.status };
    const statusReader = (0, statusReader_1.createStatusReader)(options);
    const service = options.accessory.getServiceById(options.hap.Service.Thermostat, THERMOSTAT_SUBTYPE) ??
        options.accessory.addService(options.hap.Service.Thermostat, options.device.name, THERMOSTAT_SUBTYPE);
    bindThermostatCharacteristics(options, service);
    bindBatteryCharacteristics(options, mapping, statusReader.requireOnlineDevice);
}
function bindThermostatCharacteristics(options, service) {
    service.getCharacteristic(options.hap.Characteristic.CurrentTemperature).onGet(() => {
        return currentMapping(options)?.currentTemperature;
    });
    service.getCharacteristic(options.hap.Characteristic.TargetTemperature).onGet(() => {
        return currentMapping(options)?.targetTemperature.value;
    });
    service
        .getCharacteristic(characteristicToken(options.hap.Characteristic.CurrentHeatingCoolingState))
        .onGet(() => currentStateValue(options.hap, currentMapping(options)?.currentState));
    service
        .getCharacteristic(characteristicToken(options.hap.Characteristic.TargetHeatingCoolingState))
        .onGet(() => targetStateValue(options.hap, currentMapping(options)?.targetState))
        .onSet((value) => setTargetState(options, value));
    service.getCharacteristic(options.hap.Characteristic.TargetTemperature).onSet((value) => {
        return setTargetTemperature(options, value);
    });
    service.setCharacteristic?.(characteristicToken(options.hap.Characteristic.TemperatureDisplayUnits), options.hap.Characteristic.TemperatureDisplayUnits.CELSIUS);
}
function bindBatteryCharacteristics(options, mapping, requireOnlineDevice) {
    for (const batteryMapping of mapping.battery) {
        const service = options.accessory.getServiceById(options.hap.Service.Battery, BATTERY_SUBTYPE) ??
            options.accessory.addService(options.hap.Service.Battery, `${options.device.name} Battery`, BATTERY_SUBTYPE);
        service
            .getCharacteristic(batteryCharacteristicFor(options.hap, batteryMapping))
            .onGet(() => currentBatteryValue(requireOnlineDevice(), batteryMapping));
    }
}
async function setTargetTemperature(options, value) {
    if (typeof value !== 'number') {
        return;
    }
    const statusReader = (0, statusReader_1.createStatusReader)(options);
    statusReader.requireOnlineDevice();
    const mapping = currentMapping(options);
    if (!mapping) {
        return;
    }
    const command = mapping.targetTemperature.command(value);
    await options.sendCommands(options.device.id, [command]);
    const nextDevice = statusReader.applyCommandValues([command]);
    options.accessory.context.tuyaStatus = { ...nextDevice.status };
}
async function setTargetState(options, value) {
    const state = stateFromTargetValue(options.hap, value);
    const statusReader = (0, statusReader_1.createStatusReader)(options);
    statusReader.requireOnlineDevice();
    const mapping = currentMapping(options);
    if (!state || !mapping) {
        return;
    }
    const commands = mapping.targetStateCommand(state);
    await options.sendCommands(options.device.id, commands);
    const nextDevice = statusReader.applyCommandValues(commands);
    options.accessory.context.tuyaStatus = { ...nextDevice.status };
}
function currentMapping(options) {
    return (0, thermostat_1.buildThermostatMapping)((0, statusReader_1.createStatusReader)(options).requireOnlineDevice());
}
function currentBatteryValue(device, mapping) {
    return (0, thermostat_1.buildThermostatMapping)(device)?.battery.find((candidate) => candidate.code === mapping.code && candidate.characteristic === mapping.characteristic)?.value;
}
function currentStateValue(hap, state) {
    if (state === 'off') {
        return hap.Characteristic.CurrentHeatingCoolingState.OFF;
    }
    if (state === 'cool') {
        return hap.Characteristic.CurrentHeatingCoolingState.COOL;
    }
    return hap.Characteristic.CurrentHeatingCoolingState.HEAT;
}
function targetStateValue(hap, state) {
    switch (state) {
        case 'off':
            return hap.Characteristic.TargetHeatingCoolingState.OFF;
        case 'cool':
            return hap.Characteristic.TargetHeatingCoolingState.COOL;
        case 'auto':
            return hap.Characteristic.TargetHeatingCoolingState.AUTO;
        case 'heat':
        case undefined:
            return hap.Characteristic.TargetHeatingCoolingState.HEAT;
    }
}
function stateFromTargetValue(hap, value) {
    if (value === hap.Characteristic.TargetHeatingCoolingState.OFF) {
        return 'off';
    }
    if (value === hap.Characteristic.TargetHeatingCoolingState.COOL) {
        return 'cool';
    }
    if (value === hap.Characteristic.TargetHeatingCoolingState.AUTO) {
        return 'auto';
    }
    if (value === hap.Characteristic.TargetHeatingCoolingState.HEAT) {
        return 'heat';
    }
    return undefined;
}
function batteryCharacteristicFor(hap, mapping) {
    if (mapping.characteristic === 'statusLowBattery') {
        return hap.Characteristic.StatusLowBattery;
    }
    return hap.Characteristic.BatteryLevel;
}
function characteristicToken(characteristic) {
    return characteristic.token ?? characteristic;
}
