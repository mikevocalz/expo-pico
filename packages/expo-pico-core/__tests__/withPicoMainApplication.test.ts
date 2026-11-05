import {
  injectIntoJavaMainApplication,
  injectIntoKotlinMainApplication,
} from '../plugin/src/withPicoMainApplication';
import { resolveOptions } from '../plugin/src/types';

const KT_TEMPLATE = `package com.example.app

import android.app.Application
import com.facebook.react.PackageList

class MainApplication : Application() {
    override fun getPackages(): List<ReactPackage> {
        val packages = PackageList(this).packages
        // add(MyReactNativePackage())
        return packages
    }

    override fun onCreate() {
        super.onCreate()
        loadReactNative(this)
    }
}
`;

const JAVA_TEMPLATE = `package com.example.app;

import android.app.Application;
import com.facebook.react.PackageList;

public class MainApplication extends Application {
    @Override
    protected List<ReactPackage> getPackages() {
        List<ReactPackage> packages = new PackageList(this).getPackages();
        return packages;
    }
}
`;

// What older prebuilds injected. Autolinking registers PicoCorePackage now, so a leftover would register it twice.
const LEGACY_KT = KT_TEMPLATE.replace(
  'import com.facebook.react.PackageList\n',
  'import com.facebook.react.PackageList\n' +
    '// expo-pico-core: PicoCorePackage import\n' +
    'import expo.modules.pico.PicoCorePackage\n' +
    'import expo.modules.pico.PicoXRPlatform\n'
).replace(
  '        val packages = PackageList(this).packages\n',
  '        val packages = PackageList(this).packages\n' +
    '            // expo-pico-core: PicoCorePackage registration\n' +
    '            add(PicoCorePackage(PicoXRPlatform.PICO_OS5))\n'
);

const LEGACY_JAVA = JAVA_TEMPLATE.replace(
  'import com.facebook.react.PackageList;\n',
  'import com.facebook.react.PackageList;\n' +
    '// expo-pico-core: PicoCorePackage import\n' +
    'import expo.modules.pico.PicoCorePackage;\n' +
    'import expo.modules.pico.PicoXRPlatform;\n'
).replace(
  '        List<ReactPackage> packages = new PackageList(this).getPackages();\n',
  '        List<ReactPackage> packages = new PackageList(this).getPackages();\n' +
    '      // expo-pico-core: PicoCorePackage registration\n' +
    '      packages.add(new PicoCorePackage(PicoXRPlatform.PICO_SWAN));\n'
);

describe('injectIntoKotlinMainApplication', () => {
  it.each(['pico-os5', 'pico-swan'] as const)(
    'does not register PicoCorePackage for xrMode=%s (core autolinks)',
    (xrMode) => {
      const out = injectIntoKotlinMainApplication(KT_TEMPLATE, resolveOptions({ xrMode }))!;
      expect(out).not.toContain('PicoCorePackage');
      expect(out).not.toContain('PicoXRPlatform');
    }
  );

  it('strips the registration and imports left by an older prebuild', () => {
    const out = injectIntoKotlinMainApplication(LEGACY_KT, resolveOptions({ xrMode: 'pico-os5' }))!;
    expect(out).not.toContain('PicoCorePackage');
    expect(out).not.toContain('PicoXRPlatform');
    expect(out).toContain('val packages = PackageList(this).packages');
    expect(out).toContain('import com.facebook.react.PackageList');
  });
});

describe('injectIntoJavaMainApplication', () => {
  it('leaves a clean Java MainApplication unchanged', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    expect(injectIntoJavaMainApplication(JAVA_TEMPLATE, options)).toBe(JAVA_TEMPLATE);
  });

  it('strips the registration and imports left by an older prebuild', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    expect(injectIntoJavaMainApplication(LEGACY_JAVA, options)).toBe(JAVA_TEMPLATE);
  });
});

describe('New Architecture flag guard', () => {
  it('extends the new-arch defaults, never the plain defaults', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;

    expect(out).toContain('object : ReactNativeNewArchitectureFeatureFlagsDefaults()');
    expect(out).toContain(
      'import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlagsDefaults'
    );
    // The regression this pins: overriding the plain defaults reports
    // enableBridgelessArchitecture as false, which silently reverts the app to the
    // bridge. ReactHost then never starts — blank screen, no bundle request, and no
    // exception anywhere in logcat.
    expect(out).not.toMatch(/object\s*:\s*ReactNativeFeatureFlagsDefaults\(\)/);
  });

  it('places the guard after loadReactNative, which maps the JNI it needs', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;

    // Before loadReactNative, ReactNativeFeatureFlagsCxxInterop.<clinit> throws.
    expect(out.indexOf('loadReactNative(this)')).toBeLessThan(
      out.indexOf('dangerouslyForceOverride')
    );
  });

  it('does not duplicate the guard on repeat runs', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    const twice = injectIntoKotlinMainApplication(once, options)!;

    expect((twice.match(/dangerouslyForceOverride/g) ?? []).length).toBe(1);
  });

  it('warns and leaves the file usable when loadReactNative is absent', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const noOnCreate = KT_TEMPLATE.replace(/    override fun onCreate[\s\S]*?\n    }\n/, '');
    const options = resolveOptions({ xrMode: 'pico-os5' });

    const out = injectIntoKotlinMainApplication(noOnCreate, options)!;

    expect(out).toBe(noOnCreate);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('withPicoMainApplication on a quest-only build (xrMode mobile)', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    withPicoMainApplication,
    usesViroVrActivity,
  } = require('../plugin/src/withPicoMainApplication');

  async function run(plugins: unknown[]): Promise<string> {
    const config = withPicoMainApplication(
      { name: 'x', slug: 'x', plugins },
      resolveOptions({ xrMode: 'mobile' })
    );
    const mod = config.mods?.android?.mainApplication;
    if (!mod) return KT_TEMPLATE;
    const applied = await mod({
      modRequest: { nextMod: (result: unknown) => result },
      modResults: { contents: KT_TEMPLATE, language: 'kt' },
    });
    return applied.modResults.contents;
  }

  it('adds the flag guard when react-viro generates a VRActivity', async () => {
    // Without it, Enter XR on a Quest 3S crashed in ReactHostImpl.onHostPause:
    // "Pausing an activity that is not the current activity".
    const out = await run([['@reactvision/react-viro', { xRMode: ['QUEST'] }]]);
    expect(out).toContain('skipActivityIdentityAssertionOnHostPause(): Boolean = true');
  });

  it('leaves a phone app without react-viro untouched', async () => {
    expect(await run(['expo-router'])).toBe(KT_TEMPLATE);
  });

  it('detects the plugin by name, with or without options', () => {
    expect(usesViroVrActivity({ plugins: ['@reactvision/react-viro'] })).toBe(true);
    expect(usesViroVrActivity({ plugins: [['@reactvision/react-viro', {}]] })).toBe(true);
    expect(usesViroVrActivity({ plugins: ['expo-horizon-core'] })).toBe(false);
    expect(usesViroVrActivity({})).toBe(false);
  });
});

describe('immersive activity tracker install', () => {
  // The tracker used to install from PicoCorePackage.createNativeModules, which
  // runs only once React initializes. A VRActivity the system restores before
  // that was never seen, so requestImmersivePermission answered
  // no_immersive_activity while the activity was on screen. Installing from
  // Application.onCreate sees every activity the process creates.
  const options = resolveOptions({ xrMode: 'pico-os5' });
  const JAVA_WITH_ON_CREATE = JAVA_TEMPLATE.replace(
    '    @Override\n    protected List',
    '    @Override\n    public void onCreate() {\n        super.onCreate();\n    }\n\n    @Override\n    protected List'
  );

  it('installs the tracker first thing in a Kotlin onCreate', () => {
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    expect(out).toContain('import com.margelo.nitro.expopico.picocore.ImmersiveActivityTracker');
    const superAt = out.indexOf('super.onCreate()');
    const installAt = out.indexOf('ImmersiveActivityTracker.install(this)');
    expect(installAt).toBeGreaterThan(superAt);
    expect(installAt).toBeLessThan(out.indexOf('loadReactNative(this)'));
  });

  it('installs the tracker in a Java onCreate', () => {
    const out = injectIntoJavaMainApplication(JAVA_WITH_ON_CREATE, options)!;
    expect(out).toContain('import com.margelo.nitro.expopico.picocore.ImmersiveActivityTracker;');
    expect(out).toMatch(/super\.onCreate\(\);\n.*\n\s*ImmersiveActivityTracker\.install\(this\);/);
  });

  it('does not duplicate the install on repeat runs', () => {
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    const twice = injectIntoKotlinMainApplication(once, options)!;
    expect(twice).toBe(once);
    const javaOnce = injectIntoJavaMainApplication(JAVA_WITH_ON_CREATE, options)!;
    expect(injectIntoJavaMainApplication(javaOnce, options)).toBe(javaOnce);
  });

  it('exposes install to MainApplication, callable from Kotlin and Java', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const kt = fs.readFileSync(
      path.join(__dirname, '..', 'android', 'src', 'nitro', 'ImmersiveActivityTracker.kt'),
      'utf8'
    );
    expect(kt).toMatch(/^object ImmersiveActivityTracker\b/m);
    expect(kt).toMatch(/@JvmStatic\s+@Synchronized\s+fun install\(application: Application\)/);
  });
});
