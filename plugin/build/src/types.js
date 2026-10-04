"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPATIAL_DEFAULTS = void 0;
exports.resolveSpatialOptions = resolveSpatialOptions;
exports.SPATIAL_DEFAULTS = {
    enableSpatialSdk: false,
    anchorPersistence: false,
    sceneMeshEnabled: false,
    spatialToolsVersion: '2.1.0',
};
function resolveSpatialOptions(options = {}) {
    return { ...exports.SPATIAL_DEFAULTS, ...options };
}
//# sourceMappingURL=types.js.map