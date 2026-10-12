package expo.modules.spatialauth

import android.os.Build
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import horizon.platform.users.Users
import horizon.core.android.driver.coroutines.HorizonServiceConnection
import kotlinx.coroutines.sync.Mutex

/**
 * Expo Modules v2 native boundary. No Nitro/JSI dependency and no raw web UI.
 * Meta platform classes are compileOnly here and shipped only by the quest flavor.
 */
class ExpoSpatialAuthModule : Module() {
    private val metaConnectionMutex = Mutex()
    @Volatile private var metaConnected = false

    private suspend fun ensureMetaConnected() {
        if (!isMeta()) error("Meta Horizon OS identity is unavailable on this device")
        val appId = BuildConfig.META_HORIZON_APP_ID
        if (appId.isBlank()) error("Meta Horizon App ID is missing; configure expo-horizon-core")
        val context = appContext.reactContext?.applicationContext
            ?: error("React context is unavailable")
        metaConnectionMutex.lock()
        try {
            if (!metaConnected) {
                HorizonServiceConnection.connect(appId, context)
                metaConnected = true
            }
        } finally {
            metaConnectionMutex.unlock()
        }
    }
    private fun isMeta(): Boolean {
        val maker = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        return (maker.contains("oculus") || maker.contains("meta") ||
                brand.contains("oculus") || brand.contains("meta")) &&
                runCatching { Class.forName("horizon.platform.users.Users") }.isSuccess
    }

    override fun definition() = ModuleDefinition {
        Name("ExpoSpatialAuth")

        Function("getPlatform") {
            when {
                isMeta() -> "meta-horizon"
                Build.MANUFACTURER.equals("Pico", ignoreCase = true) ||
                    Build.BRAND.equals("PICO", ignoreCase = true) -> "pico"
                else -> "android"
            }
        }

        AsyncFunction("getMetaUserProfile") {
            ensureMetaConnected()
            val user = Users().getLoggedInUser()
            if (user.id.isBlank()) error("No Meta Horizon account is signed in")
            mapOf(
                "userId" to user.id,
                "displayName" to user.displayName,
                "avatarUrl" to user.imageUrl
            )
        }

        AsyncFunction("getMetaUserProof") {
            ensureMetaConnected()
            // Fetch proof only when requested. A Meta proof nonce is one-use.
            val users = Users()
            val user = users.getLoggedInUser()
            if (user.id.isBlank()) error("No Meta Horizon account is signed in")
            val proof = users.getUserProof()
            if (proof.nonce.isBlank()) error("Meta returned an empty user proof")
            mapOf(
                "userId" to user.id,
                "nonce" to proof.nonce,
                "displayName" to user.displayName,
                "avatarUrl" to user.imageUrl
            )
        }

        AsyncFunction("getGoogleIdToken") { webClientId: String, nonce: String ->
            if (webClientId.isBlank() || nonce.isBlank()) {
                error("Google web client ID and server challenge nonce are required")
            }
            val activity = appContext.currentActivity
                ?: error("Google Credential Manager requires a foreground Activity")
            val option = GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(webClientId)
                .setNonce(nonce)
                .build()
            val request = GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build()
            val response = CredentialManager.create(activity).getCredential(
                context = activity,
                request = request
            )
            val custom = response.credential as? CustomCredential
                ?: error("Unsupported Credential Manager response")
            if (custom.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                error("Credential Manager returned a different credential type")
            }
            val credential = GoogleIdTokenCredential.createFrom(custom.data)
            mapOf("idToken" to credential.idToken)
        }
    }
}
