package com.margelo.nitro.expopico.notifications

import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import com.pico.pps.sdk.base.MatrixResult
import com.pico.pps.sdk.base.OnCancelListener
import com.pico.pps.sdk.base.OnFailureListener
import com.pico.pps.sdk.base.OnSuccessListener
import com.pico.pps.sdk.base.Task

/**
 * Shared plumbing between this package's HybridObject and the PICO
 * Platform Service SDK.
 *
 * Every `@expo-pico` package carries its own copy rather than importing a
 * sibling: under Nitro each package is a standalone Gradle module with no
 * dependency on any other, so there is no shared module to put this in. It
 * is thirty lines, and the alternative is a cross-project Gradle dependency
 * whose project name depends on which autolinker ran.
 */
internal object PicoPps {
  /**
   * `true` when the PPS classes are actually on the runtime classpath.
   *
   * The Gradle dependency on `com.pico.pps:*` is `compileOnly` in this
   * module — the app supplies the runtime copy, exactly once, via the
   * `expo-pico-core` config plugin. On the `mobile` flavor, or in an app
   * whose plugin options set `xrMode: 'mobile'`, nothing supplies it and
   * touching a PPS type would throw `NoClassDefFoundError`. Every entry
   * point checks this first.
   */
  val sdkPresent: Boolean by lazy {
    try {
      Class.forName("com.pico.pps.sdk.push.PPSPushClient")
      true
    } catch (_: Throwable) {
      false
    }
  }

  /** The app's context, or `null` before Nitro has been installed. */
  fun context(): android.content.Context? = NitroModules.applicationContext

  /** Thrown when a call is made on a build that has no PPS runtime. */
  fun unavailable(what: String): Throwable =
    IllegalStateException(
      "SERVICE_UNAVAILABLE: $what requires the PICO Platform Service SDK, which is " +
        "not on the classpath. This is expected on the `mobile` flavor and on " +
        "non-PICO hardware."
    )
}

/**
 * Bridge one PPS `Task<T>` onto one Nitro `Promise<R>`.
 *
 * Three things this has to get right that a naive callback wrapper does
 * not:
 *
 * 1. `Task` has **three** terminal listeners. Cancel is distinct from
 *    failure, and a Promise left unsettled on cancel leaks the JS-side
 *    `await` forever, so cancel is mapped to a rejection of its own.
 * 2. Success does not mean success. `MatrixResult.isSuccess` is a separate
 *    flag, and `getData()` is null on a failed result, so a "successful"
 *    callback still has to be checked before the payload is read.
 * 3. `transform` runs inside the listener and can throw — a null field in
 *    a protobuf payload is common. That has to reject rather than escape
 *    into the SDK's callback dispatch.
 */
internal fun <T, R> Task<T>.bridge(
  label: String,
  transform: (T) -> R,
): Promise<R> {
  val promise = Promise<R>()
  // Anonymous objects rather than lambdas: OnSuccessListener and friends
  // are Kotlin interfaces declared in the SDK's own Task.kt, and Kotlin
  // does not SAM-convert Kotlin interfaces unless they are `fun interface`.
  // These are not.
  this.addOnSuccessListener(
    object : OnSuccessListener<T> {
      override fun onSuccess(result: MatrixResult<T>) {
        try {
          if (!result.isSuccess()) {
            promise.reject(picoError(label, result))
            return
          }
          val data = result.data
          if (data == null) {
            promise.reject(IllegalStateException("$label returned no data"))
            return
          }
          promise.resolve(transform(data))
        } catch (t: Throwable) {
          promise.reject(t)
        }
      }
    }
  )
  this.addOnFailureListener(
    object : OnFailureListener {
      override fun onFailure(e: Exception) {
        promise.reject(e)
      }
    }
  )
  this.addOnCancelListener(
    object : OnCancelListener {
      override fun onCancel() {
        promise.reject(PicoCancelledException(label))
      }
    }
  )
  return promise
}

/** Cancellation surfaced as its own error so JS can tell it from a failure. */
internal class PicoCancelledException(what: String) :
  RuntimeException("CANCELLED: $what was cancelled by the user or the system")

/** Turn the `ErrorInfo` on a failed `MatrixResult` into a readable error. */
internal fun <T> picoError(label: String, result: MatrixResult<T>): Throwable {
  val info = result.errorInfo
  val code = info?.errorCode
  val message = info?.errorMsg
  val logId = info?.logId
  val detail = buildString {
    append(label)
    append(" failed")
    if (code != null) append(" (code $code)")
    if (!message.isNullOrEmpty()) append(": ").append(message)
    if (!logId.isNullOrEmpty()) append(" [logId $logId]")
  }
  return result.exception ?: IllegalStateException(detail)
}
