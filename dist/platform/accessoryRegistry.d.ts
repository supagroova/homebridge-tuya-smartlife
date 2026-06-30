import type { TuyaDevice } from '../discovery/types';
export type RegistryAccessory = {
    displayName: string;
    UUID: string;
    context: Record<string, unknown>;
};
type AccessoryConstructor<TAccessory extends RegistryAccessory> = new (displayName: string, uuid: string) => TAccessory;
type AccessoryRegistryApi<TAccessory extends RegistryAccessory> = {
    hap: {
        uuid: {
            generate(input: string): string;
        };
    };
    platformAccessory: AccessoryConstructor<TAccessory>;
    registerPlatformAccessories(pluginName: string, platformName: string, accessories: TAccessory[]): void;
    unregisterPlatformAccessories(pluginName: string, platformName: string, accessories: TAccessory[]): void;
};
export type AccessoryRegistryOptions<TAccessory extends RegistryAccessory> = {
    api: AccessoryRegistryApi<TAccessory>;
    pluginName: string;
    platformName: string;
    cachedAccessories: TAccessory[];
    bindAccessory?: (accessory: TAccessory, device: TuyaDevice) => void;
};
export type AccessoryReconcileResult<TAccessory extends RegistryAccessory> = {
    registered: TAccessory[];
    restored: TAccessory[];
    pruned: TAccessory[];
    unsupported: TuyaDevice[];
};
export declare class AccessoryRegistry<TAccessory extends RegistryAccessory = RegistryAccessory> {
    private readonly options;
    constructor(options: AccessoryRegistryOptions<TAccessory>);
    reconcile(devices: TuyaDevice[]): AccessoryReconcileResult<TAccessory>;
    private uuidFor;
}
export {};
