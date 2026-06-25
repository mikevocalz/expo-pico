package expo.modules.pico

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager

/**
 * high-sampling-rate sensor probe.
 *
 * Runtime check for whether the AOSP `android.permission.HIGH_SAMPLING_RATE_SENSORS`
 * permission is actually being honored on this device. Even when the permission
 * is declared at prebuild and granted, the underlying sensor implementation
 * may still cap below 200Hz on some hardware — this lets the diagnostics tab
 * report the actual maximum rate per sensor type.
 *
 * No PICO SDK reflection involved — this is pure AOSP `SensorManager`. Works
 * the same on PICO OS 6, Project Swan, and stock Android.
 */
internal object PicoSensorRuntime {

    /**
     * @return per-sensor maximum sampling rate report. Each entry:
     *   - `type`:     String ("accelerometer" | "gyroscope" | "magnetometer")
     *   - `vendor`:   String
     *   - `name`:     String
     *   - `maxHz`:    Float (computed from minDelay; 0 when unbounded)
     *   - `minDelayMicros`: Int — raw value reported by the sensor
     *
     * Empty list when SensorManager is unavailable. Order: accelerometer,
     * gyroscope, magnetometer.
     */
    fun getHighRateSensors(context: Context): List<Map<String, Any?>> {
        val sm = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
            ?: return emptyList()
        val types = listOf(
            "accelerometer" to Sensor.TYPE_ACCELEROMETER,
            "gyroscope" to Sensor.TYPE_GYROSCOPE,
            "magnetometer" to Sensor.TYPE_MAGNETIC_FIELD,
        )
        return types.mapNotNull { (label, type) ->
            val sensor = sm.getDefaultSensor(type) ?: return@mapNotNull null
            val minDelayMicros = sensor.minDelay
            val maxHz = if (minDelayMicros > 0) 1_000_000f / minDelayMicros.toFloat() else 0f
            mapOf(
                "type" to label,
                "vendor" to (sensor.vendor ?: ""),
                "name" to (sensor.name ?: ""),
                "maxHz" to maxHz,
                "minDelayMicros" to minDelayMicros,
            )
        }
    }
}
