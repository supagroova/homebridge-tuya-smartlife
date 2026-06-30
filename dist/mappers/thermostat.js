"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildThermostatMapping = buildThermostatMapping;
const scaling_1 = require("./scaling");
const sensor_1 = require("./sensor");
function buildThermostatMapping(device) {
    if (device.category !== 'wk') {
        return undefined;
    }
    const currentSpecSource = device.statusRanges.temp_current;
    const targetSpecSource = device.statusRanges.temp_set ?? device.functions.temp_set;
    if (!currentSpecSource || !targetSpecSource) {
        return undefined;
    }
    const currentSpec = (0, scaling_1.parseIntegerSpec)(currentSpecSource);
    const targetSpec = (0, scaling_1.parseIntegerSpec)(targetSpecSource);
    if (!currentSpec ||
        !targetSpec ||
        typeof device.status.temp_current !== 'number' ||
        typeof device.status.temp_set !== 'number') {
        return undefined;
    }
    const currentTemperature = (0, scaling_1.scaleTuyaInteger)(device.status.temp_current, currentSpec);
    const targetTemperature = (0, scaling_1.scaleTuyaInteger)(device.status.temp_set, targetSpec);
    if (currentTemperature === undefined || targetTemperature === undefined) {
        return undefined;
    }
    const state = stateFromDevice(device);
    return {
        currentTemperature,
        targetTemperature: {
            value: targetTemperature,
            min: targetSpec.minScaled,
            max: targetSpec.maxScaled,
            step: targetSpec.stepScaled,
            command: (value) => ({
                code: 'temp_set',
                value: (0, scaling_1.unscaleTuyaNumber)(clamp(value, targetSpec.minScaled, targetSpec.maxScaled), targetSpec),
            }),
        },
        currentState: state,
        targetState: state,
        battery: (0, sensor_1.buildBatteryMappings)(device),
        targetStateCommand: (targetState) => buildTargetStateCommands(device, targetState),
    };
}
function stateFromDevice(device) {
    if (device.status.switch === false) {
        return 'off';
    }
    if (device.status.mode === 'cool' || device.status.mode === 'auto' || device.status.mode === 'heat') {
        return device.status.mode;
    }
    return 'heat';
}
function buildTargetStateCommands(device, state) {
    if (state === 'off') {
        return [{ code: 'switch', value: false }];
    }
    const commands = [{ code: 'switch', value: true }];
    if (parseEnumRange(device.functions.mode?.values).includes(state)) {
        commands.push({ code: 'mode', value: state });
    }
    return commands;
}
function parseEnumRange(values) {
    if (!values) {
        return [];
    }
    try {
        const parsed = JSON.parse(values);
        return Array.isArray(parsed.range) ? parsed.range.filter((value) => typeof value === 'string') : [];
    }
    catch {
        return [];
    }
}
function clamp(value, min, max) {
    return Math.min(max ?? value, Math.max(min ?? value, value));
}
