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
