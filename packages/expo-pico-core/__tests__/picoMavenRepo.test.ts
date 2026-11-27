// https://developer.pico-interactive.com/maven answers 302 with a redirect to
// PICO's homepage, and nothing in this repo resolves from the com.pvr groups
// it was filtered to. The plugin no longer writes it and strips the entry an
// older release wrote into an existing android/build.gradle.

import { DEAD_PICO_MAVEN_REPO, PICO_MAVEN_REPO } from '../plugin/src/constants';
import { removeDeadPicoMavenRepo } from '../plugin/src/withPicoGradle';

// The project build.gradle block that @expo-pico/core wrote before this change.
const OLD_PROJECT_GRADLE = `allprojects {
    repositories {
        // expo-pico-core: pico maven repo
        maven {
            url "https://developer.pico-interactive.com/maven"
            content {
                includeGroup "com.pvr"
                includeGroup "com.pvr.platform"
            }
        }
        // PICO Platform Service SDK (com.pico.pps:*) — public maven hosted
        // by Bytedance, referenced from the PPS integration doc at
        // https://developer.picoxr.com/document/platform_service/integrate-the-pico-platform-service-sdk/
        maven {
            url "https://artifact.bytedance.com/repository/Volcengine/"
            content {
                includeGroup "com.pico.pps"
                includeGroup "com.pico"
            }
        }
        google()
        mavenCentral()
    }
}
`;

describe('PICO maven repositories', () => {
  it('points at the Volcengine repo that serves com.pico.pps and com.pico.spatial', () => {
    expect(PICO_MAVEN_REPO).toBe('https://artifact.bytedance.com/repository/Volcengine/');
  });

  it('removes the dead repo entry an older release wrote', () => {
    const out = removeDeadPicoMavenRepo(OLD_PROJECT_GRADLE);
    expect(out).not.toContain(DEAD_PICO_MAVEN_REPO);
    expect(out).not.toContain('includeGroup "com.pvr"');
    expect(out).toContain('// expo-pico-core: pico maven repo');
    expect(out).toContain('url "https://artifact.bytedance.com/repository/Volcengine/"');
    expect(out).toContain('includeGroup "com.pico.pps"');
    expect(out).toContain('google()\n        mavenCentral()');
  });

  it('leaves a build.gradle without the dead repo unchanged', () => {
    const clean = removeDeadPicoMavenRepo(OLD_PROJECT_GRADLE);
    expect(removeDeadPicoMavenRepo(clean)).toBe(clean);
  });
});
