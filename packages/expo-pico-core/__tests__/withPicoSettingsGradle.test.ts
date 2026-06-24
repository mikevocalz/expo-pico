import { applySettingsGradleTransform } from '../plugin/src/withPicoSettingsGradle';
import { resolveOptions } from '../plugin/src/types';

const BASE_SETTINGS = `rootProject.name = 'example'
include ':app'
`;

describe('applySettingsGradleTransform', () => {
  it('is a no-op when xrMode !== pico-swan', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    expect(applySettingsGradleTransform(BASE_SETTINGS, options)).toBe(BASE_SETTINGS);
  });

  it('is a no-op when xrMode=pico-swan but no swanRuntimeProject is provided', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    expect(applySettingsGradleTransform(BASE_SETTINGS, options)).toBe(BASE_SETTINGS);
  });

  it('appends include + projectDir when swanRuntimeProject is provided', () => {
    const options = resolveOptions({
      xrMode: 'pico-swan',
      picoSwan: {
        swanRuntimeProject: {
          name: 'pico_swan_runtime',
          path: '../node_modules/@pico/swan-runtime-android/android',
        },
      },
    });
    const out = applySettingsGradleTransform(BASE_SETTINGS, options);
    expect(out).toContain("include ':pico_swan_runtime'");
    expect(out).toContain(
      "project(':pico_swan_runtime').projectDir = new File(rootProject.projectDir, '../node_modules/@pico/swan-runtime-android/android')"
    );
    expect(out).toContain('// expo-pico-core: pico subprojects');
  });

  it('does not duplicate inclusion on repeat prebuilds (idempotency fix vs Viro)', () => {
    const options = resolveOptions({
      xrMode: 'pico-swan',
      picoSwan: {
        swanRuntimeProject: { name: 'pico_swan_runtime', path: '../swan' },
      },
    });
    const first = applySettingsGradleTransform(BASE_SETTINGS, options);
    const second = applySettingsGradleTransform(first, options);
    const count = (second.match(/include ':pico_swan_runtime'/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('updates project path in place when the path changes', () => {
    const first = applySettingsGradleTransform(
      BASE_SETTINGS,
      resolveOptions({
        xrMode: 'pico-swan',
        picoSwan: {
          swanRuntimeProject: { name: 'pico_swan_runtime', path: '../old' },
        },
      })
    );
    const second = applySettingsGradleTransform(
      first,
      resolveOptions({
        xrMode: 'pico-swan',
        picoSwan: {
          swanRuntimeProject: { name: 'pico_swan_runtime', path: '../new' },
        },
      })
    );
    expect(second).toContain("'../new'");
    expect(second).not.toContain("'../old'");
  });
});
