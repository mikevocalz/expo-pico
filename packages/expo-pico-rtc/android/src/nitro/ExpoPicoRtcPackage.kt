package com.margelo.nitro.expopico.rtc

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Autolinking entry point for @expo-pico/rtc.
 *
 * React Native autolinking (see react-native.config.js) puts this package in
 * the app's PackageList, which is what makes Gradle include and compile the
 * module at all. Constructing it loads libExpoPicoRtc.so, whose JNI_OnLoad
 * registers the HybridObjects that `new PicoRtc()` resolves in JS. There are
 * no React Native modules or views.
 */
class ExpoPicoRtcPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    emptyList()

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()

  companion object {
    init {
      ExpoPicoRtcOnLoad.initializeNative()
    }
  }
}
