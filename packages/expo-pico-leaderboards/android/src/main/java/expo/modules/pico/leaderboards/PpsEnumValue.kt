package expo.modules.pico.leaderboards

/** Outcome of mapping a JS option string to a PPS JNI enum int. */
internal sealed interface PpsEnumValue {
    data class Resolved(val value: Int) : PpsEnumValue
    data class Rejected(val code: String, val message: String) : PpsEnumValue
}
