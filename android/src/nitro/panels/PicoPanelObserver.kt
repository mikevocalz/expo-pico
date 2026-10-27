package expo.modules.pico

import com.margelo.nitro.expopico.picocore.PanelCloseReason

/** Receives panel lifecycle from [PicoPanelRegistry], on the main thread. */
internal interface PicoPanelObserver {
  fun onPanelOpened(name: String)

  fun onPanelClosed(name: String, reason: PanelCloseReason)
}
