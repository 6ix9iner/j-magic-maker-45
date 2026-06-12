package com.posapp.app.plugins;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.camera.core.ExperimentalGetImage;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
// Barcode class may be provided under the 'common' package in some ML Kit versions
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.common.InputImage;

import java.util.List;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import com.posapp.app.R;

@ExperimentalGetImage
public class MlKitScanActivity extends AppCompatActivity {

    private static final String TAG = "MlKitScanActivity";
    private static final int CAMERA_PERMISSION_REQUEST = 1992;

    private PreviewView previewView;
    // import app resources explicitly (activity is in com.posapp.app.plugins package)
    // So reference R from the app package
    // (this import helps Android Studio resolve layout/resource IDs)
    
    private ListenableFuture<ProcessCameraProvider> cameraProviderFuture;
    private ExecutorService analysisExecutor;
    @SuppressLint("UnprotectedBroadcastReceiver")
    private BroadcastReceiver stopReceiver;

    @SuppressLint({"UnprotectedBroadcastReceiver"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mlkit_scan);
        previewView = findViewById(R.id.previewView);
        findViewById(R.id.btnCancel).setOnClickListener(v -> finish());

        analysisExecutor = Executors.newSingleThreadExecutor();

        // listen for stop requests
        stopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (MlKitScanner.ACTION_STOP.equals(intent.getAction())) {
                    finish();
                }
            }
        };
        // Try to register with explicit RECEIVER_NOT_EXPORTED flag when available (API 33+).
        // Use reflection so this still compiles against older SDKs where that overload
        // is not present on the compile-time android.jar.
        IntentFilter stopFilter = new IntentFilter(MlKitScanner.ACTION_STOP);
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            registerReceiver(stopReceiver, stopFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(stopReceiver, stopFilter);
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        } else {
            startCamera();
        }
    }

    private void startCamera() {
        cameraProviderFuture = ProcessCameraProvider.getInstance(this);
        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();
                bindCameraUseCases(cameraProvider);
            } catch (ExecutionException | InterruptedException e) {
                Log.e(TAG, "Camera provider failure", e);
                Toast.makeText(this, "Failed to start camera", Toast.LENGTH_SHORT).show();
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindCameraUseCases(@NonNull ProcessCameraProvider cameraProvider) {
        cameraProvider.unbindAll();

        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        ImageAnalysis analysis = new ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build();

        // configure barcode scanner options if you'd like to restrict formats
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(
                        Barcode.FORMAT_ALL_FORMATS
                )
                .build();

        final BarcodeScanner scanner = BarcodeScanning.getClient(options);

        analysis.setAnalyzer(analysisExecutor, imageProxy -> {
            processImageProxy(scanner, imageProxy);
        });

        CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

        cameraProvider.bindToLifecycle(this, cameraSelector, preview, analysis);
    }

    private void processImageProxy(BarcodeScanner scanner, ImageProxy imageProxy) {
        try {
            if (imageProxy == null || imageProxy.getImage() == null) {
                if (imageProxy != null) imageProxy.close();
                return;
            }

            InputImage image = InputImage.fromMediaImage(imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());

            scanner.process(image)
                    .addOnSuccessListener(barcodes -> {
                        if (barcodes != null && !barcodes.isEmpty()) {
                            for (Barcode barcode : barcodes) {
                                String raw = barcode.getRawValue();
                                if (raw != null && !raw.isEmpty()) {
                                    Intent i = new Intent(MlKitScanner.ACTION_BARCODE);
                                    i.putExtra("code", raw);
                                    // restrict the broadcast to this app to avoid unprotected broadcast issues
                                    i.setPackage(getPackageName());
                                    sendBroadcast(i);
                                    // once we detected a barcode, finish
                                    runOnUiThread(this::finish);
                                    break;
                                }
                            }
                        }
                    })
                    .addOnFailureListener(e -> {
                        Log.e(TAG, "Barcode processing failed", e);
                    })
                    .addOnCompleteListener(task -> {
                        imageProxy.close();
                    });

        } catch (Exception e) {
            Log.e(TAG, "processImageProxy error", e);
            imageProxy.close();
        }
    }

    @Override
    protected void onDestroy() {
        try {
            if (stopReceiver != null) {
                unregisterReceiver(stopReceiver);
            }
        } catch (Exception ignored) {}
        if (analysisExecutor != null) {
            analysisExecutor.shutdown();
            analysisExecutor = null;
        }
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "Camera permission is required to scan barcodes", Toast.LENGTH_LONG).show();
                finish();
            }
        }
    }
}
