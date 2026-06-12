package com.posapp.app.plugins;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(name = "MlKitScanner")
public class MlKitScanner extends Plugin {

    public static final String ACTION_BARCODE = "com.posapp.app.MLKIT_BARCODE_DETECTED";
    public static final String ACTION_STOP = "com.posapp.app.MLKIT_STOP";

    private BroadcastReceiver receiver = null;

    @Override
    public void load() {
        // register a receiver to forward native scan results to JS listeners
        if (receiver == null) {
            IntentFilter filter = new IntentFilter();
            filter.addAction(ACTION_BARCODE);
            receiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    if (intent == null) return;
                    if (ACTION_BARCODE.equals(intent.getAction())) {
                        String code = intent.getStringExtra("code");
                        if (code == null) return;
                        JSObject data = new JSObject();
                        data.put("code", code);
                        notifyListeners("mlkitBarcodeDetected", data);
                    }
                }
            };
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                getContext().registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
            } else {
                getContext().registerReceiver(receiver, filter);
            }
        }
    }

    @Override
    public void handleOnDestroy() {
        try {
            if (receiver != null) {
                getContext().unregisterReceiver(receiver);
                receiver = null;
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        try {
            Context ctx = getContext();
            Intent intent = new Intent(ctx, MlKitScanActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to start ML Kit scanner: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        try {
            // send broadcast to tell the activity to stop (if running)
            Intent i = new Intent(ACTION_STOP);
            getContext().sendBroadcast(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop ML Kit scanner: " + e.getMessage());
        }
    }
}
