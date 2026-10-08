"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PICO_OPTION_DEFAULTS = exports.PICO_SWAN_DEFAULTS = exports.PICO_PLATFORM_SERVICE_DEFAULTS = void 0;
exports.resolveOptions = resolveOptions;
exports.resolveTargetProfile = resolveTargetProfile;
exports.xrModeToNativeEnum = xrModeToNativeEnum;
const withQuestStoreDeviceTargets_1 = require("./withQuestStoreDeviceTargets");
/**
 * Default resolved platform-service state for an app with no identity
 * wired. `declareActivities` is `false` here because the resolver
 * activates it only when `hasIdentity` is true (no point declaring
 * login/browser activities for an app that cannot authenticate).
 */
exports.PICO_PLATFORM_SERVICE_DEFAULTS = {
    picoAppId: null,
    picoAppKey: null,
    picoMerchantId: null,
    picoPayKey: null,
    foreign: {
        picoAppId: null,
        picoAppKey: null,
        picoMerchantId: null,
        picoPayKey: null,
    },
    declareActivities: false,
    services: null,
    hasIdentity: false,
    hasIapIdentity: false,
};
exports.PICO_SWAN_DEFAULTS = {
    swanRuntimeProject: null,
    swanSdkArtifact: null,
    declareSpatialContainerCategory: true,
    swanMinSdkVersion: 33,
    scaffoldSwanSourceSet: false,
};
exports.PICO_OPTION_DEFAULTS = {
    enabled: true,
    picoAppId: '',
    buildVariant: 'pico',
    xrMode: 'pico-os5',
    picoSwan: exports.PICO_SWAN_DEFAULTS,
    appType: 'vr',
    platformService: exports.PICO_PLATFORM_SERVICE_DEFAULTS,
    targetProfile: 'auto',
    targetDevices: [],
    spatialMode: '2d',
    defaultContainerMode: 'none',
    defaultWidth: null,
    defaultHeight: null,
    handTracking: false,
    passthrough: false,
    sceneUnderstanding: false,
    entitlementCheck: false,
    eyeTracking: false,
    faceTracking: false,
    bodyTracking: false,
    spatialAudio: false,
    foveatedRendering: false,
    highSamplingRateSensors: false,
    refreshRates: [],
    boundary: false,
    sceneMesh: false,
    picoSenseController: false,
    motionTracker: false,
    controllerHaptics: false,
    ndkAbiFilters: true,
    openXrLoaderDeclaration: true,
    viroRendererOverlay: false,
    storeDeviceTargets: null,
    openXrLoaderOverlay: true,
    developerTools: false,
    enableEmulatorOptimizations: false,
    minSdkVersion: 32,
    targetSdkVersion: 34,
};
function resolveOptions(options = {}) {
    const buildVariant = options.buildVariant ?? exports.PICO_OPTION_DEFAULTS.buildVariant;
    const defaultXrMode = buildVariant === 'mobile' ? 'mobile' : 'pico-os5';
    const swan = {
        ...exports.PICO_SWAN_DEFAULTS,
        ...(options.picoSwan ?? {}),
        swanRuntimeProject: options.picoSwan?.swanRuntimeProject !== undefined
            ? (options.picoSwan.swanRuntimeProject ?? null)
            : exports.PICO_SWAN_DEFAULTS.swanRuntimeProject,
        swanSdkArtifact: options.picoSwan?.swanSdkArtifact !== undefined
            ? (options.picoSwan.swanSdkArtifact ?? null)
            : exports.PICO_SWAN_DEFAULTS.swanSdkArtifact,
    };
    const xrMode = options.xrMode ?? defaultXrMode;
    // appType default tracks xrMode. Mobile builds default to 2d (no immersive
    // launcher categories injected); PICO modes default to vr. The user can
    // override with 'mr' for passthrough-first apps.
    const appType = options.appType ?? (xrMode === 'mobile' ? '2d' : 'vr');
    const platformService = resolvePlatformServiceOptions(options.platformService, 
    /* legacyPicoAppId */ options.picoAppId);
    // When xrMode is 'pico-swan', lift minSdkVersion floor to Swan's
    // documented requirement unless the user explicitly overrides it.
    const minSdkVersion = options.minSdkVersion ??
        (xrMode === 'pico-swan' ? swan.swanMinSdkVersion : exports.PICO_OPTION_DEFAULTS.minSdkVersion);
    // Toolchain / loader defaults. When the build is an
    // immersive PICO build, default to ABI-filtered arm64 and declare the
    // OpenXR loader. Mobile builds keep both off to stay ABI-flexible and
    // avoid an unused loader declaration.
    const ndkAbiFilters = options.ndkAbiFilters ?? xrMode !== 'mobile';
    const openXrLoaderDeclaration = options.openXrLoaderDeclaration ?? xrMode !== 'mobile';
    // Opt-in, and never on the mobile flavor: it replaces a library the app got
    // from another package, so it should not happen because someone set xrMode.
    const canOverlay = xrMode !== 'mobile' && buildVariant !== 'mobile';
    const viroRendererOverlay = (options.viroRendererOverlay ?? false) && canOverlay;
    const openXrLoaderOverlay = (options.openXrLoaderOverlay ?? true) && canOverlay;
    return {
        ...exports.PICO_OPTION_DEFAULTS,
        ...options,
        buildVariant,
        xrMode,
        picoSwan: swan,
        appType,
        platformService,
        minSdkVersion,
        ndkAbiFilters,
        openXrLoaderDeclaration,
        viroRendererOverlay,
        openXrLoaderOverlay,
        storeDeviceTargets: (0, withQuestStoreDeviceTargets_1.normalizeStoreDeviceTargets)(options.storeDeviceTargets),
        targetDevices: options.targetDevices ?? exports.PICO_OPTION_DEFAULTS.targetDevices,
        defaultWidth: nonEmpty(options.defaultWidth) ?? exports.PICO_OPTION_DEFAULTS.defaultWidth,
        defaultHeight: nonEmpty(options.defaultHeight) ?? exports.PICO_OPTION_DEFAULTS.defaultHeight,
        // Copy refreshRates to avoid mutating user input, and filter out
        // non-positive / non-finite entries that would produce invalid
        // meta-data values.
        refreshRates: (options.refreshRates ?? exports.PICO_OPTION_DEFAULTS.refreshRates)
            .filter((hz) => Number.isFinite(hz) && hz > 0)
            .map((hz) => Math.round(hz)),
    };
}
/**
 * Resolve platform-service identity. Falls back to top-level `picoAppId`
 * (the legacy field already in `PicoPluginOptions`) when
 * `platformService.picoAppId` is not provided, so apps that only use the
 * legacy surface keep working without changes.
 */
function resolvePlatformServiceOptions(options, legacyPicoAppId) {
    const raw = options ?? {};
    const foreignRaw = raw.foreign ?? {};
    const picoAppId = nonEmpty(raw.picoAppId) ?? nonEmpty(legacyPicoAppId);
    const picoAppKey = nonEmpty(raw.picoAppKey);
    const picoMerchantId = nonEmpty(raw.picoMerchantId);
    const picoPayKey = nonEmpty(raw.picoPayKey);
    const foreign = {
        picoAppId: nonEmpty(foreignRaw.picoAppId),
        picoAppKey: nonEmpty(foreignRaw.picoAppKey),
        picoMerchantId: nonEmpty(foreignRaw.picoMerchantId),
        picoPayKey: nonEmpty(foreignRaw.picoPayKey),
    };
    const hasIdentity = Boolean(picoAppId ||
        picoAppKey ||
        foreign.picoAppId ||
        foreign.picoAppKey ||
        picoMerchantId ||
        picoPayKey ||
        foreign.picoMerchantId ||
        foreign.picoPayKey);
    const hasIapIdentity = Boolean((picoMerchantId && picoPayKey) || (foreign.picoMerchantId && foreign.picoPayKey));
    return {
        picoAppId,
        picoAppKey,
        picoMerchantId,
        picoPayKey,
        foreign,
        declareActivities: raw.declareActivities ?? hasIdentity,
        services: raw.services && raw.services.length > 0
            ? [...new Set(raw.services)].sort()
            : null,
        hasIdentity,
        hasIapIdentity,
    };
}
function nonEmpty(value) {
    if (value == null)
        return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}
/**
 * Resolve the effective target profile from options.
 * When 'auto', infer from targetDevices, then from xrMode.
 */
function resolveTargetProfile(options) {
    if (options.targetProfile !== 'auto') {
        return options.targetProfile;
    }
    const devices = options.targetDevices;
    if (devices.includes('swan'))
        return 'swan';
    if (devices.includes('pico-4-ultra'))
        return 'pico4ultra';
    if (devices.includes('pico-4'))
        return 'pico4';
    if (devices.includes('neo3'))
        return 'legacy';
    // When no devices are listed, fall back to xrMode-derived guess.
    if (options.xrMode === 'pico-swan')
        return 'swan';
    return 'pico4';
}
/**
 * Map the plugin-facing xrMode string to the native PicoXRPlatform enum
 * value rendered into MainApplication and BuildConfig.
 */
function xrModeToNativeEnum(mode) {
    switch (mode) {
        case 'mobile':
            return 'MOBILE';
        case 'pico-os5':
            return 'PICO_OS5';
        case 'pico-swan':
            return 'PICO_SWAN';
    }
}
//# sourceMappingURL=types.js.map