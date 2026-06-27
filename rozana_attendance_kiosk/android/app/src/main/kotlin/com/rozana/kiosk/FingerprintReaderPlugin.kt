package com.rozana.kiosk

import android.util.Base64
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

/**
 * Native fingerprint reader stub.
 *
 * Reader model: <<<E.G. MANTRA MFS100 — REPLACE WITH ACTUAL MODEL>>>
 * Vendor SDK: <<<SDK NAME / PACKAGE — REPLACE>>>
 *
 * TODO(VENDOR_SDK): Add SDK .aar/.jar to android/app/libs/ and gradle dependency.
 * TODO(VENDOR_SDK): Import vendor classes and replace stub bodies below.
 */
class FingerprintReaderPlugin : FlutterPlugin, MethodChannel.MethodCallHandler {

    private lateinit var channel: MethodChannel

    override fun onAttachedToEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(binding.binaryMessenger, "com.rozana.kiosk/fingerprint")
        channel.setMethodCallHandler(this)
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "init" -> initReader(result)
            "capture" -> capture(result)
            "identify" -> identify(call, result)
            "dispose" -> dispose(result)
            else -> result.notImplemented()
        }
    }

    private fun initReader(result: MethodChannel.Result) {
        // TODO(VENDOR_SDK): Initialize USB/BT reader, open device handle.
        // Example: MantraMfs100.init(context)
        result.success(true)
    }

    private fun capture(result: MethodChannel.Result) {
        // TODO(VENDOR_SDK): Capture enrollment template from reader.
        // Return map: templateBase64, fingerIndex, deviceId
        val stubTemplate = Base64.encodeToString(byteArrayOf(0), Base64.NO_WRAP)
        result.success(
            mapOf(
                "templateBase64" to stubTemplate,
                "fingerIndex" to 0,
                "deviceId" to "native-stub",
            ),
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun identify(call: MethodCall, result: MethodChannel.Result) {
        // TODO(VENDOR_SDK): Run 1:N match against roster templates from call.argument("templates")
        // Return map: matched (bool), staffId, score, message
        val templates = call.argument<List<Map<String, Any>>>("templates")
        if (templates.isNullOrEmpty()) {
            result.success(mapOf("matched" to false, "message" to "Empty roster"))
            return
        }

        // Stub: no match until SDK integrated
        result.success(mapOf("matched" to false, "message" to "SDK not integrated"))
    }

    private fun dispose(result: MethodChannel.Result) {
        // TODO(VENDOR_SDK): Release reader resources
        result.success(null)
    }
}
