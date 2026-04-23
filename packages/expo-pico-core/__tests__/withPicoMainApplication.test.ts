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
  it('registers PicoCorePackage with PICO_OS6 for xrMode=pico-os6', () => {
    const options = resolveOptions({ xrMode: 'pico-os6' });
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options);
    expect(out).not.toBeNull();
    expect(out!).toContain('add(PicoCorePackage(PicoXRPlatform.PICO_OS6))');
    expect(out!).toContain('import expo.modules.pico.PicoCorePackage');
    expect(out!).toContain('import expo.modules.pico.PicoXRPlatform');
  });

  it('registers PicoCorePackage with PICO_SWAN for xrMode=pico-swan', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const out = injectIntoKotlinMainApplication(KT_TEMPLATE, options);
    expect(out!).toContain('add(PicoCorePackage(PicoXRPlatform.PICO_SWAN))');
  });

  it('does not duplicate the registration on repeat runs with the same xrMode', () => {
    const options = resolveOptions({ xrMode: 'pico-os6' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    const twice = injectIntoKotlinMainApplication(once, options)!;
    const count = (
      twice.match(/add\(PicoCorePackage\(PicoXRPlatform\.PICO_OS6\)\)/g) ?? []
    ).length;
    expect(count).toBe(1);
  });

  it('replaces registration when xrMode toggles from PICO_OS6 to PICO_SWAN', () => {
    const optionsA = resolveOptions({ xrMode: 'pico-os6' });
    const optionsB = resolveOptions({ xrMode: 'pico-swan' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, optionsA)!;
    const twice = injectIntoKotlinMainApplication(once, optionsB)!;
    expect(twice).toContain('PicoXRPlatform.PICO_SWAN');
    expect(twice).not.toContain('PicoXRPlatform.PICO_OS6');
  });

  it('returns null when no PackageList anchor is present', () => {
    const broken = `package com.example.app\n\nclass MainApplication\n`;
    const options = resolveOptions({ xrMode: 'pico-os6' });
    const out = injectIntoKotlinMainApplication(broken, options);
    expect(out).toBeNull();
  });

  it('idempotent import: does not duplicate the import on repeat runs', () => {
    const options = resolveOptions({ xrMode: 'pico-os6' });
    const once = injectIntoKotlinMainApplication(KT_TEMPLATE, options)!;
    const twice = injectIntoKotlinMainApplication(once, options)!;
    const count = (
      twice.match(/import expo\.modules\.pico\.PicoCorePackage/g) ?? []
    ).length;
    expect(count).toBe(1);
  });
});

describe('injectIntoJavaMainApplication', () => {
  it('registers PicoCorePackage in Java MainApplication', () => {
    const options = resolveOptions({ xrMode: 'pico-swan' });
    const out = injectIntoJavaMainApplication(JAVA_TEMPLATE, options)!;
    expect(out).toContain(
      'packages.add(new PicoCorePackage(PicoXRPlatform.PICO_SWAN));'
    );
    expect(out).toContain('import expo.modules.pico.PicoCorePackage;');
    expect(out).toContain('import expo.modules.pico.PicoXRPlatform;');
  });

  it('returns null when Java anchor is missing', () => {
    const broken = `package com.example.app;\npublic class MainApplication {}\n`;
    const options = resolveOptions({ xrMode: 'pico-os6' });
    expect(injectIntoJavaMainApplication(broken, options)).toBeNull();
  });
});
