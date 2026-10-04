import { type PicoCapabilities } from './picoCapabilities';
import { type WindowProperties } from './picoSpatial';
export type BootOptions = WindowProperties & {
    hydrateStorage?: boolean;
};
export declare function bootPico(options?: BootOptions): Promise<PicoCapabilities>;
//# sourceMappingURL=picoBoot.d.ts.map