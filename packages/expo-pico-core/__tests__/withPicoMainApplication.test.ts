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

describe('injectIntoKotlinMainApplication', () => {
  it('registers PicoCorePackage with PICO_OS5 for xrMode=pico-os5', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options);
    expect(out).not.toBeNull();
    expect(out!).toContain('add(PicoCorePackage(PicoXRPlatform.PICO_OS5))');
    expect(out!).toContain('import expo.modules.pico.PicoCorePackage');
    expect(out!).toContain('import expo.modules.pico.PicoXRPlatform');
  });

  it('registers PicoCorePackage with PICO_SWAN for xrMode=pico-swan', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options);
    expect(out!).toContain('add(PicoCorePackage(PicoXRPlatform.PICO_SWAN))');
  });

  it('does not duplicate the registration on repeat runs with the same xrMode', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    const twice = injectIntoKotlinMainApplication(once, options)!;
    const count = (twice.match(/add\(PicoCorePackage\(PicoXRPlatform\.PICO_OS5\)\)/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('replaces registration when xrMode toggles from PICO_OS5 to PICO_SWAN', () => {
    const optionsA = resolveOptions({ xrMode: 'pico-os5' });
    const optionsB = resolveOptions({ xrMode: 'pico-swan' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, optionsA)!;
    const twice = injectIntoKotlinMainApplication(once, optionsB)!;
    expect(twice).toContain('PicoXRPlatform.PICO_SWAN');
    expect(twice).not.toContain('PicoXRPlatform.PICO_OS5');
  });

  it('returns null when no PackageList anchor is present', () => {
    const broken = `package com.example.app\n\nclass MainApplication\n`;
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const out = injectIntoKotlinMainApplication(broken, options);
    expect(out).toBeNull();
  });

  it('idempotent import: does not duplicate the import on repeat runs', () => {
    const options = resolveOptions({ xrMode: 'pico-os5' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    const twice = injectIntoKotlinMainApplication(once, options)!;
    const count = (twice.match(/import expo\.modules\.pico\.PicoCorePackage/g) ?? []).length;
    expect(count).toBe(1);
  });
});

describe('injectIntoJavaMainApplication', () => {
  it('registers PicoCorePackage in Java MainApplication', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const out = injectIntoJavaMainApplication(JAVA_TEMPLATE, options)!;
    expect(out).toContain('packages.add(new PicoCorePackage(PicoXRPlatform.PICO_SWAN));');
    expect(out).toContain('import expo.modules.pico.PicoCorePackage;');
    expect(out).toContain('import expo.modules.pico.PicoXRPlatform;');
  });

  it('returns null when Java anchor is missing', () => {
    const broken = `package com.example.app;\npublic class MainApplication {}\n`;
    const options = resolveOptions({ xrMode: 'pico-os5' });
    expect(injectIntoJavaMainApplication(broken, options)).toBeNull();
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

    expect(out).toContain('add(PicoCorePackage(PicoXRPlatform.PICO_OS5))');
    expect(out).not.toContain('dangerouslyForceOverride');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
