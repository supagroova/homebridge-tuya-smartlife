"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindSensorAccessory = bindSensorAccessory;
const sensor_1 = require("../mappers/sensor");
const statusReader_1 = require("./statusReader");
function bindSensorAccessory(options) {
    const sensorMappings = (0, sensor_1.buildSensorMappings)(options.device);
    if (sensorMappings.length === 0) {
        return;
    }
    options.accessory.context.tuyaStatus = { ...options.device.status };
    const statusReader = (0, statusReader_1.createStatusReader)(options);
    for (const mapping of [...sensorMappings, ...(0, sensor_1.buildBatteryMappings)(options.device)]) {
        const serviceConstructor = serviceConstructorFor(options.hap, mapping);
        const service = serviceFor(options, serviceConstructor, mapping);
        service
            .getCharacteristic(characteristicFor(options.hap, mapping))
            .onGet(() => currentMappingValue(statusReader.requireOnlineDevice(), mapping));
    }
}
function currentMappingValue(device, mapping) {
    return [...(0, sensor_1.buildSensorMappings)(device), ...(0, sensor_1.buildBatteryMappings)(device)].find((candidate) => candidate.code === mapping.code &&
        candidate.serviceType === mapping.serviceType &&
        candidate.characteristic === mapping.characteristic)?.value;
}
function serviceFor(options, serviceConstructor, mapping) {
    const subType = mapping.serviceType === 'battery' ? 'battery' : mapping.code;
    return (options.accessory.getServiceById(serviceConstructor, subType) ??
        options.accessory.addService(serviceConstructor, displayNameFor(options.device.name, mapping), subType));
}
function serviceConstructorFor(hap, mapping) {
    switch (mapping.serviceType) {
        case 'temperature':
            return hap.Service.TemperatureSensor;
        case 'humidity':
            return hap.Service.HumiditySensor;
        case 'contact':
            return hap.Service.ContactSensor;
        case 'motion':
            return hap.Service.MotionSensor;
        case 'leak':
            return hap.Service.LeakSensor;
        case 'smoke':
            return hap.Service.SmokeSensor;
        case 'battery':
            return hap.Service.Battery;
    }
}
function characteristicFor(hap, mapping) {
    switch (mapping.characteristic) {
        case 'currentTemperature':
            return hap.Characteristic.CurrentTemperature;
        case 'currentRelativeHumidity':
            return hap.Characteristic.CurrentRelativeHumidity;
        case 'contactSensorState':
            return hap.Characteristic.ContactSensorState;
        case 'motionDetected':
            return hap.Characteristic.MotionDetected;
        case 'leakDetected':
            return hap.Characteristic.LeakDetected;
        case 'smokeDetected':
            return hap.Characteristic.SmokeDetected;
        case 'batteryLevel':
            return hap.Characteristic.BatteryLevel;
        case 'statusLowBattery':
            return hap.Characteristic.StatusLowBattery;
    }
}
function displayNameFor(deviceName, mapping) {
    const suffixByServiceType = {
        temperature: 'Temperature',
        humidity: 'Humidity',
        contact: 'Contact',
        motion: 'Motion',
        leak: 'Leak',
        smoke: 'Smoke',
        battery: 'Battery',
    };
    return `${deviceName} ${suffixByServiceType[mapping.serviceType]}`;
}
