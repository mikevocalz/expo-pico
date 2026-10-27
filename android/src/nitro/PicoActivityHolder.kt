package expo.modules.pico

import android.app.Activity
import com.facebook.react.bridge.ReactApplicationContext
import java.lang.ref.WeakReference

/**
 * Weak handle on the React context, so core can reach the current Activity.
 *
 * Nitro hands HybridObjects an application Context only, and an application
 * Context cannot finish an Activity. `PicoCorePackage.createNativeModules` is
 * given a `ReactApplicationContext`, which tracks the resumed Activity, so it
 * stashes it here on the way past.
 *
 * Weak because this is a process-lifetime singleton and holding a React context
 * strongly would pin it — and the Activity behind it — past teardown.
 */
object PicoActivityHolder {
    private var ref: WeakReference<ReactApplicationContext>? = null

    fun attach(context: ReactApplicationContext) {
        ref = WeakReference(context)
    }

    fun currentActivity(): Activity? = ref?.get()?.currentActivity
}
