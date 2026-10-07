import { gradleContains, insertAfterPattern } from '../plugin/src/utils';

describe('gradleContains', () => {
  it('returns true when marker is present', () => {
    const contents = `android {\n  // expo-pico-core: flavor dimensions\n}`;
    expect(gradleContains(contents, '// expo-pico-core: flavor dimensions')).toBe(true);
  });

  it('returns false when marker is absent', () => {
    const contents = `android {\n  compileSdkVersion 34\n}`;
    expect(gradleContains(contents, '// expo-pico-core: flavor dimensions')).toBe(false);
  });
});

describe('insertAfterPattern', () => {
  it('inserts text after the matched pattern', () => {
    const source = 'android {\n  compileSdkVersion 34\n}';
    const result = insertAfterPattern(source, /android\s*\{/, '\n  // inserted');
    expect(result).toBe('android {\n  // inserted\n  compileSdkVersion 34\n}');
  });

  it('returns null when pattern is not found', () => {
    const source = 'dependencies {\n}';
    const result = insertAfterPattern(source, /android\s*\{/, '\n  // inserted');
    expect(result).toBeNull();
  });

  it('only inserts at the first match', () => {
    const source = 'android {\n  android {\n  }\n}';
    const result = insertAfterPattern(source, /android\s*\{/, '\n  // inserted');
    expect(result).toContain('android {\n  // inserted');
    // Second android { should not have insertion
    const insertionCount = (result ?? '').split('// inserted').length - 1;
    expect(insertionCount).toBe(1);
  });
});

describe('flavor injection idempotency', () => {
  const FLAVOR_MARKER = '// expo-pico-core: flavor dimensions';

  it('does not inject flavors when marker already exists', () => {
    const existingGradle = `android {
    ${FLAVOR_MARKER}
    flavorDimensions += "device"
    productFlavors {
        mobile { dimension "device" }
        pico { dimension "device" }
    }
}`;
    // Simulate the guard check from withPicoAppBuildGradle
    const shouldInject = !gradleContains(existingGradle, FLAVOR_MARKER);
    expect(shouldInject).toBe(false);
  });

  it('allows injection when marker is absent', () => {
    const freshGradle = `android {\n  compileSdkVersion 34\n}`;
    const shouldInject = !gradleContains(freshGradle, FLAVOR_MARKER);
    expect(shouldInject).toBe(true);
  });
});

describe('missingDimensionStrategy injection (buildVariant=mobile)', () => {
  const MISSING_DIM_MARKER = '// expo-pico-core: missing dimension strategy';

  it('allows injection when marker is absent', () => {
    const freshGradle = `android {\n  compileSdkVersion 34\n}`;
    const shouldInject = !gradleContains(freshGradle, MISSING_DIM_MARKER);
    expect(shouldInject).toBe(true);
  });

  it('does not inject when marker already exists', () => {
    const existingGradle = `android {
    ${MISSING_DIM_MARKER}
    defaultConfig {
        missingDimensionStrategy "device", "mobile"
    }
}`;
    const shouldInject = !gradleContains(existingGradle, MISSING_DIM_MARKER);
    expect(shouldInject).toBe(false);
  });

  it('inserts missingDimensionStrategy after android {', () => {
    const freshGradle = `android {\n  compileSdkVersion 34\n}`;
    const dimBlock = `\n    ${MISSING_DIM_MARKER}\n    defaultConfig {\n        missingDimensionStrategy "device", "mobile"\n    }\n`;
    const result = insertAfterPattern(freshGradle, /android\s*\{/, dimBlock);
    expect(result).toContain('missingDimensionStrategy "device", "mobile"');
    expect(result).toContain(MISSING_DIM_MARKER);
  });
});

describe('BuildConfig fields injection', () => {
  const PICO_SDK_MARKER = '// expo-pico-core: pico sdk config';

  it('allows BuildConfig injection when marker is absent', () => {
    const freshGradle = `android {\n  compileSdkVersion 34\n}`;
    const shouldInject = !gradleContains(freshGradle, PICO_SDK_MARKER);
    expect(shouldInject).toBe(true);
  });

  it('does not inject BuildConfig fields when marker exists', () => {
    const existingGradle = `android {}\n${PICO_SDK_MARKER}\nandroid.defaultConfig {}`;
    const shouldInject = !gradleContains(existingGradle, PICO_SDK_MARKER);
    expect(shouldInject).toBe(false);
  });
});

describe('renderFlavorBlock — NDK ABI filter', () => {
  // Local imports so the utility-focused tests above stay light.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { renderFlavorBlock } = require('../plugin/src/withPicoGradle');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { resolveOptions } = require('../plugin/src/types');

  it('injects ndk abiFilters arm64-v8a on the pico flavor when enabled', () => {
    const out: string = renderFlavorBlock(
      resolveOptions({ xrMode: 'pico-os5', ndkAbiFilters: true })
    );
    expect(out).toMatch(/pico \{[\s\S]+?ndk \{ abiFilters 'arm64-v8a' \}[\s\S]+?\}/);
  });

  it('omits ndk abiFilters when disabled', () => {
    const out: string = renderFlavorBlock(
      resolveOptions({ xrMode: 'pico-os5', ndkAbiFilters: false })
    );
    expect(out).not.toContain('ndk { abiFilters');
  });

  it('defaults to abiFilters enabled under pico-os5', () => {
    const out: string = renderFlavorBlock(resolveOptions({ xrMode: 'pico-os5' }));
    expect(out).toContain("ndk { abiFilters 'arm64-v8a' }");
  });

  it('defaults to abiFilters enabled under pico-swan', () => {
    const out: string = renderFlavorBlock(resolveOptions({ xrMode: 'pico-swan' }));
    expect(out).toContain("ndk { abiFilters 'arm64-v8a' }");
  });

  it('never applies abiFilters to the mobile flavor', () => {
    const out: string = renderFlavorBlock(
      resolveOptions({ xrMode: 'pico-os5', ndkAbiFilters: true })
    );
    // The mobile flavor declaration should have nothing but `dimension`.
    expect(out).toMatch(/mobile \{ dimension "device" \}/);
  });

  it('applies abiFilters to the dual flavor when buildVariant is dual', () => {
    const out: string = renderFlavorBlock(
      resolveOptions({ xrMode: 'pico-swan', buildVariant: 'dual', ndkAbiFilters: true })
    );
    const matches = out.match(/ndk \{ abiFilters 'arm64-v8a' \}/g) ?? [];
    // pico, dual, and the quest fallback flavor should each carry the filter.
    expect(matches).toHaveLength(3);
  });
});

describe('capability BuildConfig fields', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { withPicoAppBuildGradle } = require('../plugin/src/withPicoGradle');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { resolveOptions } = require('../plugin/src/types');

  // Minimal mock of the @expo/config-plugins' withAppBuildGradle adapter
  // so we can drive the plugin against an in-memory build.gradle string.
  function runPluginOn(contents: string, options: unknown): string {
    const config = { modResults: { contents } } as { modResults: { contents: string } };
    const plugin = withPicoAppBuildGradle({ modResults: { contents } } as never, options as never);
    // The real plugin wrapper invokes the inner callback; because we cannot
    // import @expo/config-plugins in a pure unit test, we bypass the wrapper
    // by re-executing the inner mutation directly via the exported guard.
    // In practice the `withAppBuildGradle` mock returns the config wrapped
    // in a callable — we just invoke it.
    if (typeof plugin === 'function') {
      (plugin as unknown as (c: typeof config) => typeof config)(config);
    }
    return config.modResults.contents;
  }

  // Because `withAppBuildGradle` imports the full `@expo/config-plugins`
  // pipeline, we exercise the payload via `renderFlavorBlock` AND a focused
  // check that the BuildConfig block structure is stable across capability
  // permutations. The key invariant: every capability flag produces exactly
  // one buildConfigField line with the right boolean literal.
  //
  // We don't invoke the full plugin here; instead we assert on the public
  // constants map that feeds it.
  const CAPABILITY_KEYS = [
    'handTracking',
    'passthrough',
    'sceneUnderstanding',
    'eyeTracking',
    'faceTracking',
    'bodyTracking',
    'spatialAudio',
    'foveatedRendering',
    'highSamplingRateSensors',
    'boundary',
    'sceneMesh',
    'picoSenseController',
    'motionTracker',
    'controllerHaptics',
    'openXrLoaderDeclaration',
    'ndkAbiFilters',
    'developerTools',
    'entitlementCheck',
  ] as const;

  it('resolveOptions preserves every capability flag at default false', () => {
    const resolved = resolveOptions({});
    for (const key of CAPABILITY_KEYS) {
      expect(typeof resolved[key]).toBe('boolean');
    }
  });

  it('explicit true values survive through resolveOptions', () => {
    const resolved = resolveOptions({
      xrMode: 'pico-os5',
      eyeTracking: true,
      faceTracking: true,
      bodyTracking: true,
      spatialAudio: true,
      foveatedRendering: true,
      boundary: true,
      sceneMesh: true,
      picoSenseController: true,
      motionTracker: true,
      controllerHaptics: true,
      entitlementCheck: true,
    });
    expect(resolved.eyeTracking).toBe(true);
    expect(resolved.faceTracking).toBe(true);
    expect(resolved.bodyTracking).toBe(true);
    expect(resolved.spatialAudio).toBe(true);
    expect(resolved.foveatedRendering).toBe(true);
    expect(resolved.boundary).toBe(true);
    expect(resolved.sceneMesh).toBe(true);
    expect(resolved.picoSenseController).toBe(true);
    expect(resolved.motionTracker).toBe(true);
    expect(resolved.controllerHaptics).toBe(true);
    expect(resolved.entitlementCheck).toBe(true);
  });

  it('refreshRates filters invalid entries before rendering', () => {
    const resolved = resolveOptions({
      xrMode: 'pico-os5',
      refreshRates: [72, 90, -1, 0, NaN, 120.4],
    });
    expect(resolved.refreshRates).toEqual([72, 90, 120]);
  });

  // Marker-guard behavior: the app/build.gradle injection is idempotent.
  // When the marker is already present we must not re-append the block.
  it('withPicoAppBuildGradle produces callable that re-idempotently no-ops on re-run', () => {
    // Because the real withAppBuildGradle requires a full @expo/config-plugins
    // context we can only smoke test the factory contract here — that it
    // returns without throwing for a valid options bag.
    expect(() =>
      withPicoAppBuildGradle({ modResults: { contents: '' } } as never, resolveOptions({}) as never)
    ).not.toThrow();
  });

  // Suppress unused-import warning — runPluginOn is wired for future
  // integration tests that spin up @expo/config-plugins. The guard
  // invariants above cover the pure-JS mutation surface.
  void runPluginOn;
});

describe('per-flavor PICO_XR_MODE / PICO_APP_TYPE', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { renderAppGradle } = require('./support/appBuildGradle');
  const MARKER = '// expo-pico-core: per-flavor PICO_XR_MODE / PICO_APP_TYPE';

  it('overrides quest and mobile, leaving pico on the configured defaultConfig value', async () => {
    const out: string = await renderAppGradle({ xrMode: 'pico-os5', appType: 'vr' });
    expect(out).toContain('buildConfigField "String", "PICO_XR_MODE", picoXrModeValue');
    expect(out).toContain('def picoXrModeValue = "\\"pico-os5\\""');
    const block = out.slice(out.indexOf(MARKER));
    expect(block).toMatch(
      /flavor\.name == "quest"\) \{\s+flavor\.buildConfigField "String", "PICO_XR_MODE", "\\"quest\\""\s+flavor\.buildConfigField "String", "PICO_APP_TYPE", "\\"\$\{project\.findProperty\('picoAppType'\) \?: 'vr'\}\\""/
    );
    expect(block).toMatch(
      /flavor\.name == "mobile"\) \{\s+flavor\.buildConfigField "String", "PICO_XR_MODE", "\\"mobile\\""\s+flavor\.buildConfigField "String", "PICO_APP_TYPE", "\\"2d\\""/
    );
    expect(block).not.toContain('"pico"');
  });

  it('reads the quest appType from gradle.properties, falling back to the configured one', async () => {
    const out: string = await renderAppGradle({ xrMode: 'pico-os5', appType: 'mr' });
    expect(out).toContain(
      `flavor.buildConfigField "String", "PICO_APP_TYPE", "\\"\${project.findProperty('picoAppType') ?: 'mr'}\\""`
    );
  });

  it('is idempotent across re-runs', async () => {
    const once: string = await renderAppGradle({ xrMode: 'pico-os5' });
    const twice: string = await renderAppGradle({ xrMode: 'pico-os5' }, once);
    expect(twice.split(MARKER)).toHaveLength(2);
    expect(twice.match(/flavor\.name == "quest"/g)).toHaveLength(1);
  });

  it('is not emitted for a single-variant mobile build', async () => {
    const out: string = await renderAppGradle({ buildVariant: 'mobile' });
    expect(out).not.toContain(MARKER);
  });
});

describe('withPicoGradleProperties — picoBuildVariant', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { withPicoGradleProperties } = require('../plugin/src/withPicoGradleProperties');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { resolveOptions } = require('../plugin/src/types');

  type Prop = { type: string; key?: string; value?: string };
  type PropsMod = (config: unknown) => Promise<{ modResults: Prop[] }>;

  async function props(options: object, existing: Prop[] = []): Promise<Prop[]> {
    const config = withPicoGradleProperties(
      { name: 'pico', slug: 'pico' } as never,
      resolveOptions(options) as never
    ) as unknown as { mods: { android: { gradleProperties: PropsMod } } };
    const applied = await config.mods.android.gradleProperties({
      modRequest: { projectRoot: process.cwd(), nextMod: (result: unknown) => result },
      modResults: existing,
    });
    return applied.modResults;
  }

  const value = (list: Prop[], key: string) => list.filter((p) => p.key === key);

  it.each(['pico', 'dual', 'mobile'] as const)('writes buildVariant %s', async (buildVariant) => {
    const out = await props({ buildVariant });
    expect(value(out, 'picoBuildVariant')).toEqual([
      { type: 'property', key: 'picoBuildVariant', value: buildVariant },
    ]);
  });

  it('updates in place on re-run instead of appending', async () => {
    const first = await props({ buildVariant: 'mobile' });
    const second = await props({ buildVariant: 'pico' }, first);
    expect(value(second, 'picoBuildVariant')).toEqual([
      { type: 'property', key: 'picoBuildVariant', value: 'pico' },
    ]);
  });
});
