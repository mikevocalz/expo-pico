import { applySwanGradleTransform } from '../plugin/src/withPicoSwan';
import { resolveOptions, xrModeToNativeEnum } from '../plugin/src/types';

const BASE_GRADLE = `apply plugin: "com.android.application"
android {
  defaultConfig {}
}
`;

describe('applySwanGradleTransform', () => {
  it('is a no-op when xrMode !== pico-swan', () => {
    const options = resolveOptions({ xrMode: 'pico-os6' });
    expect(applySwanGradleTransform(BASE_GRADLE, options)).toBe(BASE_GRADLE);
  });

  it('is a no-op when xrMode=pico-swan but no artifact or project is provided', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const out = applySwanGradleTransform(BASE_GRADLE, options);
    expect(out).not.toContain('// expo-pico-core: swan dependencies');
  });

  it('writes a dependency block for swanSdkArtifact', () => {
    const options = resolveOptions({
      xrMode: 'pico-swan',
      picoSwan: { swanSdkArtifact: 'com.pvr.swan:pvr-swan-runtime:0.1.0' },
    });
    const out = applySwanGradleTransform(BASE_GRADLE, options);
    expect(out).toContain("implementation 'com.pvr.swan:pvr-swan-runtime:0.1.0'");
    expect(out).toContain('// expo-pico-core: swan dependencies');
  });

  it('writes a project dependency for swanRuntimeProject', () => {
    const options = resolveOptions({
      xrMode: 'pico-swan',
      picoSwan: {
        swanRuntimeProject: { name: 'pico_swan_runtime', path: '../swan' },
      },
    });
    const out = applySwanGradleTransform(BASE_GRADLE, options);
    expect(out).toContain("implementation project(':pico_swan_runtime')");
  });

  it('replaces the block in place when the artifact changes', () => {
    const first = applySwanGradleTransform(
      BASE_GRADLE,
      resolveOptions({
        xrMode: 'pico-swan',
        picoSwan: { swanSdkArtifact: 'com.pvr.swan:pvr-swan-runtime:0.1.0' },
      })
    );
    const second = applySwanGradleTransform(
      first,
      resolveOptions({
        xrMode: 'pico-swan',
        picoSwan: { swanSdkArtifact: 'com.pvr.swan:pvr-swan-runtime:0.2.0' },
      })
    );
    expect(second).toContain('0.2.0');
    expect(second).not.toContain('0.1.0');
  });

  it('does not duplicate the block on repeat runs', () => {
    const options = resolveOptions({
      xrMode: 'pico-swan',
      picoSwan: { swanSdkArtifact: 'com.pvr.swan:pvr-swan-runtime:0.1.0' },
    });
    const first = applySwanGradleTransform(BASE_GRADLE, options);
    const second = applySwanGradleTransform(first, options);
    const beginCount = (
      second.match(/\/\/ expo-pico-core: swan dependencies/g) ?? []
    ).length;
    const implCount = (
      second.match(/implementation 'com\.pvr\.swan/g) ?? []
    ).length;
    expect(beginCount).toBe(1);
    expect(implCount).toBe(1);
  });
});

describe('xrModeToNativeEnum', () => {
  it('maps plugin strings to native enum symbols', () => {
    expect(xrModeToNativeEnum('mobile')).toBe('MOBILE');
    expect(xrModeToNativeEnum('pico-os6')).toBe('PICO_OS6');
    expect(xrModeToNativeEnum('pico-swan')).toBe('PICO_SWAN');
  });
});
