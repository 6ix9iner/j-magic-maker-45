package com.posapp.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.posapp.app.plugins.MlKitScanner;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MlKitScanner.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Once Capacitor's Bridge has forwarded this intent to the
        // appUrlOpen listener (e.g. the OAuth login-callback deep link),
        // replace it with a plain intent. Otherwise, because MainActivity
        // is launchMode="singleTask", Android keeps treating the OAuth
        // callback URI as this task's intent and redelivers the SAME
        // (already-consumed, single-use) code on every later resume -
        // silently re-failing sign-in and potentially popping stale error
        // toasts on completely unrelated future app opens.
        if (Intent.ACTION_VIEW.equals(intent.getAction()) && intent.getData() != null) {
            setIntent(new Intent(Intent.ACTION_MAIN));
        }
    }
}
