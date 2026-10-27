package com.margelo.nitro.expopico.picocore

import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import expo.modules.pico.declaresPicoPanelActivity

/** `PicoWindows`: panel availability and the [HybridPicoPanelHost] factory. */
class HybridPicoWindows : HybridPicoWindowsSpec() {
  // The manifest cannot change while the app runs, so this is read once.
  override val isPanelAvailable: Boolean by lazy {
    NitroModules.applicationContext?.declaresPicoPanelActivity() ?: false
  }

  override fun createPanelHost(): Promise<HybridPicoPanelHostSpec> {
    if (!isPanelAvailable) {
      return Promise.rejected(
        Error(
          "This APK declares no expo.modules.pico.PicoPanelActivity: it is not a PICO build, or " +
            "the @expo-pico/core plugin option windows.panelActivity is false. Render the content " +
            "in the main window instead.",
        ),
      )
    }
    return Promise.resolved(HybridPicoPanelHost())
  }

  companion object : HybridPicoWindowsSpec.Companion {
    override fun constructor(): HybridPicoWindows = HybridPicoWindows()
  }
}
