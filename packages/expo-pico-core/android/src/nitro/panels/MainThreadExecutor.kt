package expo.modules.pico

import android.os.Handler
import android.os.Looper
import java.util.concurrent.Executor

/** Runs work on the main thread, the owner of every panel activity. */
internal object MainThreadExecutor : Executor {
  private val handler = Handler(Looper.getMainLooper())

  override fun execute(command: Runnable) {
    if (Looper.myLooper() == Looper.getMainLooper()) {
      command.run()
      return
    }
    handler.post(command)
  }
}
