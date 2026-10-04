package expo.modules.pico

import android.content.Context
import io.github.expo.modules.v2.react.reactContextOrNull

/**
 * Application Context for the platform-service bridges, which run SDK calls
 * off the JS thread with no Context passed in.
 *
 * Reads the Expo Modules v2 runtime's React context instead of the old
 * ContentProvider hook, so there is no manifest entry to keep in sync with the
 * AAR. Returns null until React has started.
 */
object PicoAppContext {
    fun get(): Context? = PicoCoreV2.reactContextOrNull?.applicationContext
}
