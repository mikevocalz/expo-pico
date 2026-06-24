package expo.modules.pico

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.net.Uri

/**
 * App-context singleton populated at process start.
 *
 * Sibling Bridge.kt files don't get a Context handed to them — they invoke
 * SDK calls from background threads where there's no plumbing to thread
 * one through. We grab the application Context once during process init
 * via the [PicoAppContextInitProvider] ContentProvider (which the Android
 * runtime constructs before `Application.onCreate`) and stash it here.
 *
 * Usage:
 *   PicoAppContext.get().let { ctx -> SomeSdk.init(ctx, ...) }
 */
object PicoAppContext {
    @Volatile private var appContext: Context? = null

    fun attach(ctx: Context) {
        if (appContext == null) {
            appContext = ctx.applicationContext
        }
    }

    fun get(): Context? = appContext

    /** Crash-safe accessor — returns the app context or throws with a clear message. */
    fun require(): Context = appContext
        ?: error("PicoAppContext not initialized. Ensure expo-pico-core's manifest provider is registered.")
}

/**
 * ContentProvider whose only job is to capture the application Context at
 * process start (before any user code runs). The Android framework
 * constructs all `<provider>` entries in the merged manifest BEFORE
 * `Application.onCreate`, so this is the earliest possible hook.
 *
 * Registered in the expo-pico-core AAR's AndroidManifest.xml with a
 * unique authority so it composes with any consumer's own ContentProvider
 * setup.
 */
class PicoAppContextInitProvider : ContentProvider() {
    override fun onCreate(): Boolean {
        context?.let { PicoAppContext.attach(it) }
        return true
    }
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor? = null
    override fun getType(uri: Uri): String? = null
    override fun insert(uri: Uri, values: ContentValues?): Uri? = null
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int = 0
}
