import {
  SPATIAL_SDK_VERSION,
  applySpatialSdkRuntimeBlock,
  renderSpatialSdkRuntimeBlock,
} from '../../plugin/src/withPicoSpatialSdkRuntime';

const APP_GRADLE = 'android {\n}\n';

describe('PICO Spatial SDK runtime block', () => {
  it('links Spatial SDK 6.2.8 into the pico and dual flavors', () => {
    expect(SPATIAL_SDK_VERSION).toBe('6.2.8');
    const out = applySpatialSdkRuntimeBlock(APP_GRADLE);
    expect(out).toContain('add(configuration, "com.pico.spatial.core:core:6.2.8")');
    expect(out).toContain('["picoImplementation", "dualImplementation"]');
    expect(out).toContain('url "https://artifact.bytedance.com/repository/Volcengine/"');
    expect(out).toContain('includeGroup "com.pico.spatial.core"');
    expect(out).toContain('includeGroup "com.pico.spatial.foundation"');
  });

  it('is applied once', () => {
    const once = applySpatialSdkRuntimeBlock(APP_GRADLE);
    expect(applySpatialSdkRuntimeBlock(once)).toBe(once);
  });

  it('moves a block written by an earlier release to the current SDK', () => {
    const old = APP_GRADLE + renderSpatialSdkRuntimeBlock('6.1.9');
    const out = applySpatialSdkRuntimeBlock(old);
    expect(out).not.toContain('6.1.9');
    expect(out).toBe(applySpatialSdkRuntimeBlock(APP_GRADLE));
  });

  it('leaves Spatial SDK coordinates above the marker alone', () => {
    const app = 'dependencies {\n    picoCompileOnly "com.pico.spatial.core:core:6.0.0"\n}\n';
    const out = applySpatialSdkRuntimeBlock(app);
    expect(out.startsWith(app)).toBe(true);
  });
});
