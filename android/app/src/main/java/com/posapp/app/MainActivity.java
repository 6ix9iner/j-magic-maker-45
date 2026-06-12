package com.posapp.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.posapp.app.plugins.MlKitScanner;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MlKitScanner.class);
        super.onCreate(savedInstanceState);
    }
}
