package expo.modules.pico.spatial;

import android.app.Activity;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.pico.spatial.core.container.SpatialContainerManager;

/**
 * Java on purpose. SpatialContainerManager's statics are public on the JVM
 * (@JvmStatic), but R8 left Kotlin metadata on the class that marks it
 * internal, so Kotlin refuses to call it. Java reads only the bytecode.
 *
 * Callers must check SpatialContainerBridge.status first and catch Throwable:
 * on PICO OS 5 these calls fail with NoClassDefFoundError.
 */
final class SpatialContainerCalls {
  private SpatialContainerCalls() {}

  static void openWindowContainer(
      @NonNull Context context,
      @NonNull String name,
      @NonNull Class<? extends Activity> target,
      @Nullable String tag) {
    SpatialContainerManager.openWindowContainer(context, name, target, tag, null);
  }

  static void closeWindowContainer(@NonNull String name, @Nullable String tag) {
    SpatialContainerManager.closeWindowContainer(name, tag);
  }
}
