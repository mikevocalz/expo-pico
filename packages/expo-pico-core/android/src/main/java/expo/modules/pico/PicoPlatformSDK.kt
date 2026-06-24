package expo.modules.pico

import android.content.Context
import expo.modules.pico.BuildConfig
import java.lang.reflect.Method
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Reflection-based facade over the PICO Platform Service SDK.
 *
 * The SDK AAR is auth-gated by PICO — it's distributed through the
 * PICO Developer Console (https://developer.picoxr.com/resources/) and is
 * not available on public Maven. Consumers drop the AAR into
 * `android/app/libs/` and the (`@expo-pico/core` plugin's `withPicoGradle`
 * adds `implementation fileTree(dir: 'libs', include: ['*.aar'])` to the
 * pico flavor automatically).
 *
 * Because the AAR isn't a build-time dependency, sibling packages cannot
 * reference its classes directly. This object resolves them via
 * `Class.forName` and invokes methods reflectively. When the SDK is absent
 * (no AAR dropped, mobile flavor, etc.) every entry point returns false /
 * null / an honest `SDK_UNAVAILABLE` error — never throws.
 *
 * App ID / app key come from `BuildConfig.PICO_APP_ID` / `PICO_APP_KEY`,
 * which `withPicoGradle` populates from `app.config.ts`'s `picoAppId` and
 * `platformService.picoAppKey` options. Mirrors `expo-horizon-core`'s
 * `horizonAppId` pattern.
 *
 * Class names probed are the canonical ones PICO documents for the
 * Platform Service SDK 3.x line. If your SDK version uses different
 * package names, add candidates to [USER_SERVICE_CLASSES] /
 * [PLATFORM_SDK_CLASSES] and the probe is forward-compatible.
 */
object PicoPlatformSDK {

    private val PLATFORM_SDK_CLASSES = arrayOf(
        // Decompiled from platform-service-base-1.0.0.aar:
        //   `com.pico.pps.sdk.base.PPSSdkCore` — Kotlin object (INSTANCE field).
        //   `init(IPPSSdkContext)` — NOT `init(Context, String)`.
        // The SDK auto-bootstraps via `LoaderProxyProvider` (a ContentProvider
        // declared in the AAR manifest, auto-merged into the consumer app).
        // We do NOT need to call `init` ourselves — the per-service clients
        // (PicoSignInClient.getSignInClient(ctx) etc.) self-initialize.
        "com.pico.pps.sdk.base.PPSSdkCore",
        // Legacy / alternate layouts kept as forward-compat probes.
        "com.pico.pps.sdk.core.PPSSdkCore",
        "com.pico.pps.core.PPSSdkCore",
        "com.pico.platform.PlatformServiceSDK",
        "com.pvr.platform.sdk.PlatformSDK",
    )

    private val USER_SERVICE_CLASSES = arrayOf(
        "com.pico.platform.UserService",
        "com.pvr.platform.sdk.account.AccountAPI",
    )

    private val initialized = AtomicBoolean(false)
    @Volatile private var initFailureReason: String? = null

    /**
     * Initialize the PICO Platform SDK using app id / key from BuildConfig.
     *
     * Idempotent — repeat calls return the cached state. Returns true when
     * the SDK is on the classpath AND the credentials are non-empty AND the
     * SDK's own init returned without throwing. Returns false in every
     * other case; consult [getInitFailureReason] for the human-readable
     * cause.
     */
    fun init(context: Context): Boolean {
        if (initialized.get()) return initFailureReason == null
        synchronized(this) {
            if (initialized.get()) return initFailureReason == null
            try {
                val appId = BuildConfig.PICO_APP_ID
                if (appId.isBlank()) {
                    initFailureReason = "PICO_APP_ID not set in app.config.ts"
                    initialized.set(true)
                    return false
                }
                val sdkClass = PicoPlatformSdkDetector.findAvailable(*PLATFORM_SDK_CLASSES)
                if (sdkClass == null) {
                    initFailureReason =
                        "PICO Platform SDK classes not on classpath. " +
                            "Ensure `com.pico.pps:platform-service-*:1.0.0` resolved (withPicoGradle emits these)."
                    initialized.set(true)
                    return false
                }
                // PPS 1.0.x bootstraps itself via LoaderProxyProvider —
                // no explicit init call needed. Mark ready.
                initialized.set(true)
                return true
            } catch (t: Throwable) {
                initFailureReason = "PICO SDK init crashed: ${t.javaClass.simpleName}: ${t.message}"
                initialized.set(true)
                return false
            }
        }
    }

    /** True iff the SDK is on classpath AND initialized successfully. */
    fun isReady(): Boolean = initialized.get() && initFailureReason == null

    fun getInitFailureReason(): String? = initFailureReason

    /**
     * Request the current device-signed-in user's profile.
     *
     * `getCurrentUser(callback)` is the canonical Platform SDK 3.x entry —
     * the OS already holds the identity, the SDK just relays it. No login
     * UI; no async credential exchange visible to the app. If the SDK isn't
     * ready, `onError("SDK_UNAVAILABLE", reason)` fires immediately.
     *
     * @param context Application or Activity context.
     * @param onSuccess Callback with `userId`, `displayName`, `avatarUrl`.
     *                  Values may be null when the device user hasn't
     *                  signed in or has restricted profile sharing.
     * @param onError   Callback with (code, message). `SDK_UNAVAILABLE`
     *                  when the AAR is missing or init failed.
     */
    fun getCurrentUser(
        context: Context,
        onSuccess: (userId: String?, displayName: String?, avatarUrl: String?) -> Unit,
        onError: (code: String, message: String) -> Unit,
    ) {
        if (!init(context)) {
            onError("SDK_UNAVAILABLE", initFailureReason ?: "PICO SDK not initialized")
            return
        }

        val userServiceClassName = PicoPlatformSdkDetector.findAvailable(*USER_SERVICE_CLASSES)
        if (userServiceClassName == null) {
            onError(
                "SDK_UNAVAILABLE",
                "PICO Platform SDK is present but UserService class is missing"
            )
            return
        }

        try {
            val cls = Class.forName(userServiceClassName)
            invokeGetCurrentUser(cls, onSuccess, onError)
        } catch (t: Throwable) {
            onError(
                "USER_SERVICE_ERROR",
                "PICO UserService call failed: ${t.javaClass.simpleName}: ${t.message}"
            )
        }
    }

    // ─── reflection helpers ──────────────────────────────────────────

    private fun invokeGetCurrentUser(
        userServiceClass: Class<*>,
        onSuccess: (userId: String?, displayName: String?, avatarUrl: String?) -> Unit,
        onError: (code: String, message: String) -> Unit,
    ) {
        // PICO Platform SDK 3.x exposes a `getCurrentUser(Callback<User>)`
        // method that fires `onSuccess(User)` on a background thread with
        // the device-signed-in user. We resolve the callback type
        // reflectively and synthesize a Proxy that maps result -> our
        // lambda.
        val callbackInterface = resolveCallbackInterface(userServiceClass)
        if (callbackInterface == null) {
            onError("SDK_SCHEMA", "Could not resolve PICO callback interface")
            return
        }

        val proxy = java.lang.reflect.Proxy.newProxyInstance(
            userServiceClass.classLoader,
            arrayOf(callbackInterface)
        ) { _, m, args ->
            try {
                when (m.name) {
                    "onSuccess", "onComplete" -> {
                        val user = args?.firstOrNull()
                        val (uid, name, avatar) = readUserFields(user)
                        onSuccess(uid, name, avatar)
                    }
                    "onError", "onFailure" -> {
                        val msg = args?.joinToString { it?.toString() ?: "null" } ?: "unknown"
                        onError("USER_SERVICE_ERROR", msg)
                    }
                    "equals" -> return@newProxyInstance (m.parameterTypes[0] == Any::class.java && args?.get(0) === this)
                    "hashCode" -> return@newProxyInstance System.identityHashCode(this)
                    "toString" -> return@newProxyInstance "PicoPlatformSDK.callbackProxy"
                }
            } catch (t: Throwable) {
                onError("USER_SERVICE_PARSE", "${t.javaClass.simpleName}: ${t.message}")
            }
            null
        }

        val instance = readSingletonInstance(userServiceClass)
        val target = instance ?: userServiceClass

        // Candidate method names: SDK 3.x `getCurrentUser`, 2.x `getMe`.
        val candidates = arrayOf("getCurrentUser", "getMe", "getUserInfo", "getCurrent")
        for (name in candidates) {
            try {
                val method: Method = if (instance != null) {
                    userServiceClass.getMethod(name, callbackInterface)
                } else {
                    userServiceClass.getDeclaredMethod(name, callbackInterface).also {
                        it.isAccessible = true
                    }
                }
                method.invoke(target, proxy)
                return
            } catch (_: Throwable) {
                continue
            }
        }
        onError("SDK_SCHEMA", "PICO UserService has no getCurrentUser-shaped method")
    }

    private fun readSingletonInstance(cls: Class<*>): Any? {
        // Common Kotlin singleton: `INSTANCE` field. Or `getInstance()` method.
        try {
            val f = cls.getDeclaredField("INSTANCE")
            f.isAccessible = true
            f.get(null)?.let { return it }
        } catch (_: Throwable) {
        }
        try {
            val m = cls.getMethod("getInstance")
            m.invoke(null)?.let { return it }
        } catch (_: Throwable) {
        }
        return null
    }

    private fun resolveCallbackInterface(userServiceClass: Class<*>): Class<*>? {
        // Look for any single-arg method matching `get*` and return its
        // first param type — that's the callback type.
        for (m in userServiceClass.methods) {
            if (m.parameterTypes.size == 1 &&
                (m.name.startsWith("getCurrent") || m.name == "getMe")
            ) {
                return m.parameterTypes[0]
            }
        }
        // Fall back to common PICO callback names.
        for (name in arrayOf(
            "com.pico.platform.Callback",
            "com.pico.platform.PlatformCallback",
            "com.pvr.platform.sdk.PlatformCallback",
        )) {
            try {
                return Class.forName(name)
            } catch (_: Throwable) {
            }
        }
        return null
    }

    private fun readUserFields(user: Any?): Triple<String?, String?, String?> {
        if (user == null) return Triple(null, null, null)
        val uid = readStringMember(user, "userId", "id", "uid")
        val name = readStringMember(user, "displayName", "name", "nickname", "userName")
        val avatar = readStringMember(user, "avatarUrl", "avatar", "avatarUri", "headImage")
        return Triple(uid, name, avatar)
    }

    private fun readStringMember(obj: Any, vararg candidates: String): String? {
        val cls = obj.javaClass
        for (name in candidates) {
            // try getter first
            try {
                val getter = cls.getMethod("get" + name.replaceFirstChar { it.uppercase() })
                val v = getter.invoke(obj)
                if (v is String) return v
            } catch (_: Throwable) {
            }
            // then direct field
            try {
                val f = cls.getDeclaredField(name)
                f.isAccessible = true
                val v = f.get(obj)
                if (v is String) return v
            } catch (_: Throwable) {
            }
        }
        return null
    }

    // ─── generic dispatch surface (used by every @expo-pico/* sibling) ──
    //
    // PICO Platform SDK methods follow a small number of shapes:
    //
    //  (a) Async-callback:  service.someMethod(arg1, ..., callback)
    //                        callback.onSuccess(result) | onError(...)
    //  (b) Sync getter:     service.someMethod(arg1, ...) -> Any?
    //  (c) Async-future:    service.someMethod(arg1, ...).onSuccess { ... }
    //
    // Bridges only know the (serviceClass, methodName, args, callback)
    // tuple — they don't import any PICO types directly. We resolve the
    // service class, method, and (if needed) callback interface here via
    // reflection, then invoke with a Proxy wired to the consumer's
    // onSuccess / onError lambdas.

    /**
     * Generic async-callback dispatch.
     *
     * @param context           Android context used for [init].
     * @param serviceCandidates Fully-qualified class names of the PICO SDK
     *                          service. The first one resolvable on the
     *                          classpath wins. Pass legacy + modern names
     *                          so we transparently match any AAR variant
     *                          the consumer drops in.
     * @param methodCandidates  Method names to try, in priority order
     *                          (e.g. SDK 3.x vs 2.x renamings). The first
     *                          method matching `args` + a trailing
     *                          callback wins.
     * @param args              Positional args before the synthesized
     *                          callback. May be empty.
     * @param mapResult         Maps the SDK's result object into a
     *                          consumer-friendly value (e.g. a `Map`).
     *                          Called inside the proxy on the SDK's
     *                          callback thread.
     * @param onSuccess         Receives the mapped result.
     * @param onError           Receives (code, message). Codes:
     *                          - `SDK_UNAVAILABLE` — AAR not present / init failed.
     *                          - `METHOD_NOT_FOUND` — service has no matching method.
     *                          - `INVOKE_FAILED`   — call threw / SDK reported failure.
     */
    fun <T> callAsync(
        context: Context,
        serviceCandidates: Array<String>,
        methodCandidates: Array<String>,
        args: Array<Any?>,
        mapResult: (Any?) -> T,
        onSuccess: (T) -> Unit,
        onError: (code: String, message: String) -> Unit,
    ) {
        if (!init(context)) {
            onError("SDK_UNAVAILABLE", initFailureReason ?: "PICO SDK not initialized")
            return
        }
        val serviceClassName = PicoPlatformSdkDetector.findAvailable(*serviceCandidates)
        if (serviceClassName == null) {
            onError(
                "SDK_UNAVAILABLE",
                "PICO Platform SDK service not on classpath. Candidates: ${serviceCandidates.joinToString()}"
            )
            return
        }

        try {
            val serviceClass = Class.forName(serviceClassName)
            val callbackInterface = resolveCallbackInterface(serviceClass)
                ?: run {
                    onError("SDK_SCHEMA", "Could not resolve PICO callback interface for $serviceClassName")
                    return
                }

            val proxy = java.lang.reflect.Proxy.newProxyInstance(
                serviceClass.classLoader,
                arrayOf(callbackInterface),
            ) { _, m, callbackArgs ->
                try {
                    when (m.name) {
                        "onSuccess", "onComplete" -> {
                            val raw = callbackArgs?.firstOrNull()
                            onSuccess(mapResult(raw))
                        }
                        "onError", "onFailure" -> {
                            val msg = callbackArgs?.joinToString { it?.toString() ?: "null" } ?: "unknown"
                            onError("INVOKE_FAILED", msg)
                        }
                        "equals"   -> return@newProxyInstance (m.parameterTypes[0] == Any::class.java && callbackArgs?.get(0) === this)
                        "hashCode" -> return@newProxyInstance System.identityHashCode(this)
                        "toString" -> return@newProxyInstance "PicoPlatformSDK.callAsync.proxy[$serviceClassName]"
                    }
                } catch (t: Throwable) {
                    onError("CALLBACK_PARSE", "${t.javaClass.simpleName}: ${t.message}")
                }
                null
            }

            val instance = readSingletonInstance(serviceClass)
            val target = instance ?: serviceClass

            // Build the full arg array: [args..., callback]
            val fullArgs = Array<Any?>(args.size + 1) { i -> if (i < args.size) args[i] else proxy }
            val method = findMethod(serviceClass, methodCandidates, fullArgs, callbackInterface)
                ?: run {
                    onError(
                        "METHOD_NOT_FOUND",
                        "No method on $serviceClassName matching [${methodCandidates.joinToString()}] with arity ${fullArgs.size}"
                    )
                    return
                }
            method.invoke(target, *fullArgs)
        } catch (t: Throwable) {
            onError("INVOKE_FAILED", "${t.javaClass.simpleName}: ${t.message}")
        }
    }

    /**
     * Generic sync-method dispatch. Returns the SDK's raw result mapped
     * through `mapResult`, or invokes `onError` and returns null.
     */
    fun <T> callSync(
        context: Context,
        serviceCandidates: Array<String>,
        methodCandidates: Array<String>,
        args: Array<Any?>,
        mapResult: (Any?) -> T,
        onError: (code: String, message: String) -> Unit,
    ): T? {
        if (!init(context)) {
            onError("SDK_UNAVAILABLE", initFailureReason ?: "PICO SDK not initialized")
            return null
        }
        val serviceClassName = PicoPlatformSdkDetector.findAvailable(*serviceCandidates)
        if (serviceClassName == null) {
            onError("SDK_UNAVAILABLE", "PICO service not on classpath. Tried ${serviceCandidates.joinToString()}")
            return null
        }
        return try {
            val cls = Class.forName(serviceClassName)
            val instance = readSingletonInstance(cls)
            val target = instance ?: cls
            val method = findMethod(cls, methodCandidates, args, null)
                ?: return run {
                    onError("METHOD_NOT_FOUND", "No matching method on $serviceClassName")
                    null
                }
            mapResult(method.invoke(target, *args))
        } catch (t: Throwable) {
            onError("INVOKE_FAILED", "${t.javaClass.simpleName}: ${t.message}")
            null
        }
    }

    private fun findMethod(
        serviceClass: Class<*>,
        nameCandidates: Array<String>,
        argValues: Array<Any?>,
        callbackInterface: Class<*>?,
    ): Method? {
        // Match by name, arity, and (loosely) parameter compatibility.
        // PICO SDK overloads sometimes accept Number-boxed primitives;
        // we trust the JVM's auto-unboxing.
        for (name in nameCandidates) {
            for (m in serviceClass.methods) {
                if (m.name != name) continue
                if (m.parameterTypes.size != argValues.size) continue
                var ok = true
                for ((i, p) in m.parameterTypes.withIndex()) {
                    val v = argValues[i]
                    if (v == null) continue // nullable
                    if (!isAssignableLoose(p, v.javaClass)) {
                        if (callbackInterface != null && i == argValues.size - 1 && p == callbackInterface) continue
                        ok = false
                        break
                    }
                }
                if (ok) return m.also { it.isAccessible = true }
            }
        }
        return null
    }

    private fun isAssignableLoose(target: Class<*>, source: Class<*>): Boolean {
        if (target.isAssignableFrom(source)) return true
        // primitive auto-unboxing
        val unboxed = mapOf(
            Integer::class.java to Integer.TYPE,
            java.lang.Long::class.java to java.lang.Long.TYPE,
            java.lang.Boolean::class.java to java.lang.Boolean.TYPE,
            java.lang.Float::class.java to java.lang.Float.TYPE,
            java.lang.Double::class.java to java.lang.Double.TYPE,
            java.lang.Short::class.java to java.lang.Short.TYPE,
            java.lang.Byte::class.java to java.lang.Byte.TYPE,
            java.lang.Character::class.java to Character.TYPE,
        )
        return unboxed[source] == target
    }

    /**
     * Object → Map view for arbitrary PICO result types.
     *
     * Bridges receive PICO result objects whose schema isn't known at
     * compile time. This walks public getters and string fields, copying
     * what it finds into a plain Map. Consumers can build typed wrappers
     * on the JS side. Returns null for null input.
     */
    fun objectToMap(obj: Any?): Map<String, Any?>? = objectToMapImpl(obj, java.util.IdentityHashMap(), 0)

    // ponytail: cycle-safe + depth-bounded. PICO SDK result objects can hold
    // back-references (request ↔ response, parent pointers); a naive
    // recursive walk stack-overflows.
    private fun objectToMapImpl(obj: Any?, seen: java.util.IdentityHashMap<Any, Boolean>, depth: Int): Map<String, Any?>? {
        if (obj == null || depth > 8) return null
        if (seen.put(obj, true) != null) return null
        val out = LinkedHashMap<String, Any?>()
        for (m in obj.javaClass.methods) {
            if (m.parameterCount != 0) continue
            val name = m.name
            val key = when {
                name.startsWith("get") && name.length > 3 -> name[3].lowercaseChar() + name.substring(4)
                name.startsWith("is") && name.length > 2 -> name[2].lowercaseChar() + name.substring(3)
                else -> continue
            }
            if (key == "class") continue
            try { out[key] = simplifyImpl(m.invoke(obj), seen, depth + 1) } catch (_: Throwable) {}
        }
        for (f in obj.javaClass.fields) {
            if (out.containsKey(f.name)) continue
            try { out[f.name] = simplifyImpl(f.get(obj), seen, depth + 1) } catch (_: Throwable) {}
        }
        return out
    }

    private fun simplifyImpl(v: Any?, seen: java.util.IdentityHashMap<Any, Boolean>, depth: Int): Any? = when (v) {
        null, is String, is Number, is Boolean -> v
        is Map<*, *> -> v
        is Collection<*> -> v.map { simplifyImpl(it, seen, depth + 1) }
        is Array<*> -> v.map { simplifyImpl(it, seen, depth + 1) }
        else -> objectToMapImpl(v, seen, depth + 1) ?: v.toString()
    }

    /**
     * Coerce an arbitrary PICO SDK list response to `List<Map>`. Handles:
     *   - raw `List<*>` (already a list of items)
     *   - `MatrixResult` whose payload IS a list
     *   - Wrapper objects with `list` / `items` / `data` / `result` /
     *     `products` / `purchases` / `achievements` / `entries` /
     *     `friends` / `members` fields
     *   - Single object (returned as 1-element list)
     */
    @Suppress("UNCHECKED_CAST")
    fun coerceToList(raw: Any?): List<Map<String, Any?>> {
        if (raw == null) return emptyList()
        fun convertItem(item: Any?): Map<String, Any?>? = when (item) {
            null -> null
            is Map<*, *> -> item as Map<String, Any?>
            else -> objectToMap(item)
        }
        if (raw is List<*>) return raw.mapNotNull(::convertItem)
        val asMap = if (raw is Map<*, *>) raw as Map<String, Any?> else objectToMap(raw)
        val candidates = listOf(
            "list", "items", "data", "result", "results",
            "products", "purchases", "achievements", "entries", "leaderboards",
            "friends", "members", "subscriptions", "keys",
        )
        for (key in candidates) {
            val v = asMap?.get(key)
            if (v is List<*>) return v.mapNotNull(::convertItem)
        }
        return if (asMap != null) listOf(asMap) else emptyList()
    }

    // ─── Tasks-style dispatch (PICO Platform Service SDK 3.x) ───────────
    //
    // PICO's PPS SDK uses a Google-Play-Tasks-style API:
    //
    //   PicoSignInClient.getSignInClient(context)
    //       .getUserInfo()
    //       .addOnSuccessListener { result: MatrixResult<...> -> ... }
    //       .addOnFailureListener { e: Exception -> ... }
    //
    // The service object is reached via a static factory (`getSignInClient`)
    // rather than the `INSTANCE` / `getInstance()` singletons callAsync
    // handles, and the result is a future not a callback. callTask handles
    // both differences.
    //
    // Identified by inspecting com.pico.pps.sdk.auth.PicoSignInClient on
    // the auth-gated PICO docs (https://developer.picoxr.com/reference/
    // platform_service/latest/account-api/) — `MatrixResult`,
    // `addOnSuccessListener(...)`, `addOnFailureListener(...)`,
    // `getUserInfo()`, `getAccessToken()`, etc.

    /**
     * Tasks-style dispatch. Resolves the service via a static factory call
     * (`PicoSignInClient.getSignInClient(context)`), invokes the method,
     * attaches success+failure listeners to the returned MatrixResult,
     * maps the success value, and reports back through the lambdas.
     *
     * @param clientCandidates     Top-level client classes to probe.
     *                              First match wins.
     * @param factoryNameCandidates Names of the static factory method.
     *                              We try each in order — most PICO PPS
     *                              clients expose `getSignInClient`,
     *                              `getClient`, `get<Foo>Client`. Pass
     *                              `null` to use [readSingletonInstance]
     *                              instead of a factory.
     * @param methodCandidates     Method names to try.
     * @param args                 Positional args (no trailing callback).
     * @param mapResult            Maps the unwrapped result value into a
     *                              consumer-friendly value.
     */
    fun <T> callTask(
        context: Context,
        clientCandidates: Array<String>,
        factoryNameCandidates: Array<String>?,
        methodCandidates: Array<String>,
        args: Array<Any?>,
        mapResult: (Any?) -> T,
        onSuccess: (T) -> Unit,
        onError: (code: String, message: String) -> Unit,
    ) {
        if (!init(context)) {
            onError("SDK_UNAVAILABLE", initFailureReason ?: "PICO SDK not initialized")
            return
        }
        val clientClassName = PicoPlatformSdkDetector.findAvailable(*clientCandidates)
            ?: return run {
                onError(
                    "SDK_UNAVAILABLE",
                    "PICO Platform SDK client not on classpath. Candidates: ${clientCandidates.joinToString()}"
                )
            }

        try {
            val clientClass = Class.forName(clientClassName)

            // Resolve the service instance.
            val service: Any = if (factoryNameCandidates != null) {
                var resolved: Any? = null
                for (name in factoryNameCandidates) {
                    try {
                        val f = clientClass.getDeclaredMethod(name, Context::class.java).also { it.isAccessible = true }
                        resolved = f.invoke(null, context)
                        if (resolved != null) break
                    } catch (_: Throwable) { continue }
                }
                resolved ?: return run {
                    onError(
                        "METHOD_NOT_FOUND",
                        "Could not resolve factory method on $clientClassName (tried ${factoryNameCandidates.joinToString()})"
                    )
                }
            } else {
                readSingletonInstance(clientClass) ?: clientClass
            }

            val serviceClass = service.javaClass
            // Find the actual method on the service.
            val method = findMethod(serviceClass, methodCandidates, args, callbackInterface = null)
                ?: return run {
                    onError(
                        "METHOD_NOT_FOUND",
                        "No method on $serviceClass matching [${methodCandidates.joinToString()}] with arity ${args.size}"
                    )
                }
            val taskResult = method.invoke(service, *args)
                ?: return run { onError("INVOKE_FAILED", "Method returned null") }

            // Attach addOnSuccessListener / addOnFailureListener via reflection.
            attachTaskListeners(taskResult, mapResult, onSuccess, onError)
        } catch (t: Throwable) {
            onError("INVOKE_FAILED", "${t.javaClass.simpleName}: ${t.message}")
        }
    }

    private fun <T> attachTaskListeners(
        task: Any,
        mapResult: (Any?) -> T,
        onSuccess: (T) -> Unit,
        onError: (code: String, message: String) -> Unit,
    ) {
        val taskClass = task.javaClass

        val successListenerType = findListenerType(taskClass, arrayOf("addOnSuccessListener", "addOnCompleteListener"))
        val failureListenerType = findListenerType(taskClass, arrayOf("addOnFailureListener"))
        if (successListenerType == null) {
            onError("SDK_SCHEMA", "Could not resolve success listener type on ${taskClass.name}")
            return
        }

        val successProxy = java.lang.reflect.Proxy.newProxyInstance(
            taskClass.classLoader,
            arrayOf(successListenerType),
        ) { _, m, args ->
            try {
                if (m.name in arrayOf("onSuccess", "onComplete")) {
                    val raw = args?.firstOrNull()
                    // MatrixResult often wraps the actual payload in `.getResult()`.
                    val unwrapped = unwrapMatrixResult(raw)
                    onSuccess(mapResult(unwrapped))
                }
            } catch (t: Throwable) {
                onError("CALLBACK_PARSE", "${t.javaClass.simpleName}: ${t.message}")
            }
            null
        }
        taskClass.getMethod(
            successListenerType.let {
                taskClass.methods.first { m -> m.parameterTypes.size == 1 && m.parameterTypes[0] == it }
                    .name
            },
            successListenerType
        ).invoke(task, successProxy)

        if (failureListenerType != null) {
            val failureProxy = java.lang.reflect.Proxy.newProxyInstance(
                taskClass.classLoader,
                arrayOf(failureListenerType),
            ) { _, m, args ->
                try {
                    if (m.name in arrayOf("onFailure", "onError")) {
                        val e = args?.firstOrNull()
                        onError("INVOKE_FAILED", e?.toString() ?: "unknown")
                    }
                } catch (_: Throwable) {}
                null
            }
            try {
                taskClass.getMethod("addOnFailureListener", failureListenerType).invoke(task, failureProxy)
            } catch (_: Throwable) {}
        }
    }

    private fun findListenerType(taskClass: Class<*>, methodNames: Array<String>): Class<*>? {
        for (m in taskClass.methods) {
            if (m.name in methodNames && m.parameterTypes.size == 1 && m.parameterTypes[0].isInterface) {
                return m.parameterTypes[0]
            }
        }
        return null
    }

    /**
     * Unwrap a `MatrixResult<T>` to T by calling `.getResult()` or `.getData()`
     * via reflection. Returns the raw object if no unwrap method is found.
     */
    private fun unwrapMatrixResult(matrixResult: Any?): Any? {
        if (matrixResult == null) return null
        // `getData` is the actual MatrixResult unwrap method (decompiled
        // from `com.pico.pps.sdk.base.MatrixResult` — `private T data;`).
        for (name in arrayOf("getData", "getResult", "getResponse", "getValue")) {
            try {
                val m = matrixResult.javaClass.getMethod(name)
                return m.invoke(matrixResult)
            } catch (_: Throwable) {}
        }
        return matrixResult
    }
}
