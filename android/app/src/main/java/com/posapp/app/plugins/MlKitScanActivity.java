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
import android.util.Size;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraInfo;
import androidx.camera.core.ExperimentalGetImage;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.FocusMeteringAction;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.core.ZoomState;
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
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.posapp.app.R;

/**
 * Native ML Kit barcode scanner. This is the ONLY scanner used on Android/iOS -
 * there is no runtime switching to Dynamsoft on native platforms (that stays
 * web-only). Tuned for speed on a wide range of devices, including phones with
 * mediocre cameras:
 *
 *  - Barcode formats restricted to the actual retail/inventory set (faster
 *    detection than scanning for every format ML Kit supports).
 *  - STRATEGY_KEEP_ONLY_LATEST so the analyzer always processes the freshest
 *    frame and never falls behind on a slow device.
 *  - Higher analysis resolution to give the decoder more to work with on
 *    small/blurry/partially-damaged codes, offset by the "latest frame only"
 *    strategy so it never queues up work.
 *  - Torch toggle and pinch-to-zoom for low-light / small or distant codes.
 *  - Tap-to-focus, since continuous AF alone can be sluggish on cheap camera
 *    modules.
 *  - OCR fallback: if no barcode is found for a couple of seconds, ML Kit Text
 *    Recognition starts reading the printed digits under the barcode (which
 *    survive scuffs/tears that break the scannable pattern itself) and any
 *    8/12/13/14-digit run is validated against the real EAN/UPC check-digit
 *    algorithm before being accepted - so a misread OCR guess can't slip
 *    through as a real barcode.
 */
@ExperimentalGetImage
public class MlKitScanActivity extends AppCompatActivity {

    private static final String TAG = "MlKitScanActivity";
    private static final int CAMERA_PERMISSION_REQUEST = 1992;

    // How long to wait with no successful barcode read before we start
    // spending cycles on OCR as well.
    private static final long OCR_FALLBACK_DELAY_MS = 2500;
    // Don't run OCR on every single frame - it's heavier than barcode
    // decoding, so rate-limit it, especially on weaker CPUs.
    private static final long OCR_MIN_INTERVAL_MS = 350;

    private static final Pattern DIGIT_RUN_PATTERN = Pattern.compile("\\d{8}|\\d{12,14}");

    private PreviewView previewView;
    private ImageButton btnTorch;
    private TextView scannerStatus;

    private ListenableFuture<ProcessCameraProvider> cameraProviderFuture;
    private ExecutorService analysisExecutor;
    private BarcodeScanner barcodeScanner;
    private TextRecognizer textRecognizer;
    private Camera camera;
    private ScaleGestureDetector scaleGestureDetector;
    private GestureDetector tapGestureDetector;
    private boolean torchOn = false;

    private final long startTimeMs = System.currentTimeMillis();
    private volatile long lastOcrRunMs = 0L;
    private volatile boolean resultDelivered = false;

    @SuppressLint("UnprotectedBroadcastReceiver")
    private BroadcastReceiver stopReceiver;

    @SuppressLint({"UnprotectedBroadcastReceiver", "ClickableViewAccessibility"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mlkit_scan);
        previewView = findViewById(R.id.previewView);
        btnTorch = findViewById(R.id.btnTorch);
        scannerStatus = findViewById(R.id.scannerStatus);
        findViewById(R.id.btnCancel).setOnClickListener(v -> finish());
        btnTorch.setOnClickListener(v -> toggleTorch());

        analysisExecutor = Executors.newSingleThreadExecutor();

        // Restrict to the barcode formats actually used for inventory/retail -
        // scanning for a narrower set is meaningfully faster than
        // FORMAT_ALL_FORMATS. Mirrors the format list used by the web
        // (Dynamsoft) scanner for consistency.
        BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                .setBarcodeFormats(
                        Barcode.FORMAT_EAN_13,
                        Barcode.FORMAT_EAN_8,
                        Barcode.FORMAT_UPC_A,
                        Barcode.FORMAT_UPC_E,
                        Barcode.FORMAT_CODE_128,
                        Barcode.FORMAT_CODE_39,
                        Barcode.FORMAT_CODE_93,
                        Barcode.FORMAT_CODABAR,
                        Barcode.FORMAT_ITF,
                        Barcode.FORMAT_DATA_MATRIX,
                        Barcode.FORMAT_QR_CODE,
                        Barcode.FORMAT_PDF417,
                        Barcode.FORMAT_AZTEC
                )
                .build();
        barcodeScanner = BarcodeScanning.getClient(options);
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

        setupGestures();

        // listen for stop requests
        stopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (MlKitScanner.ACTION_STOP.equals(intent.getAction())) {
                    finish();
                }
            }
        };
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

    // --- Gestures: pinch-to-zoom and tap-to-focus, both aimed at squeezing a
    // clean read out of a mediocre camera (get closer/zoom in, or force focus
    // where the code actually is instead of waiting on continuous AF). ---
    private void setupGestures() {
        scaleGestureDetector = new ScaleGestureDetector(this, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
            @Override
            public boolean onScale(@NonNull ScaleGestureDetector detector) {
                if (camera == null) return false;
                ZoomState zoomState = camera.getCameraInfo().getZoomState().getValue();
                if (zoomState == null) return false;
                float newZoom = zoomState.getZoomRatio() * detector.getScaleFactor();
                float clamped = Math.max(zoomState.getMinZoomRatio(), Math.min(zoomState.getMaxZoomRatio(), newZoom));
                camera.getCameraControl().setZoomRatio(clamped);
                return true;
            }
        });

        tapGestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onSingleTapUp(@NonNull MotionEvent e) {
                focusAt(e.getX(), e.getY());
                return true;
            }
        });

        previewView.setOnTouchListener((v, event) -> {
            scaleGestureDetector.onTouchEvent(event);
            tapGestureDetector.onTouchEvent(event);
            return true;
        });
    }

    private void focusAt(float x, float y) {
        if (camera == null) return;
        try {
            FocusMeteringAction action = new FocusMeteringAction.Builder(
                    previewView.getMeteringPointFactory().createPoint(x, y),
                    FocusMeteringAction.FLAG_AF | FocusMeteringAction.FLAG_AE
            ).disableAutoCancel().build();
            camera.getCameraControl().startFocusAndMetering(action);
        } catch (Exception e) {
            Log.w(TAG, "focusAt failed", e);
        }
    }

    private void toggleTorch() {
        if (camera == null) return;
        CameraInfo info = camera.getCameraInfo();
        if (!info.hasFlashUnit()) return;
        torchOn = !torchOn;
        camera.getCameraControl().enableTorch(torchOn);
        btnTorch.setAlpha(torchOn ? 1f : 0.6f);
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
                // Always process the newest frame only - never lets a slower
                // device fall behind and build up latency.
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                // Higher-than-minimum resolution gives the decoder more detail
                // to recover small, blurry or partially-damaged barcodes.
                // Safe to raise since KEEP_ONLY_LATEST means we never queue.
                .setTargetResolution(new Size(1920, 1080))
                .build();

        analysis.setAnalyzer(analysisExecutor, imageProxy -> processImageProxy(imageProxy));

        CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

        camera = cameraProvider.bindToLifecycle(this, cameraSelector, preview, analysis);

        if (camera.getCameraInfo().hasFlashUnit()) {
            btnTorch.setVisibility(android.view.View.VISIBLE);
            btnTorch.setAlpha(0.6f);
        }

        // Center-focus once on start so the very first frames aren't
        // hunting for focus on a cheap camera module.
        previewView.post(() -> focusAt(previewView.getWidth() / 2f, previewView.getHeight() / 2f));
    }

    private void processImageProxy(ImageProxy imageProxy) {
        if (resultDelivered) {
            imageProxy.close();
            return;
        }
        try {
            if (imageProxy.getImage() == null) {
                imageProxy.close();
                return;
            }

            InputImage image = InputImage.fromMediaImage(imageProxy.getImage(), imageProxy.getImageInfo().getRotationDegrees());
            boolean tryOcrThisFrame = shouldAttemptOcr();

            barcodeScanner.process(image)
                    .addOnSuccessListener(barcodes -> {
                        if (resultDelivered || barcodes == null || barcodes.isEmpty()) return;
                        for (Barcode barcode : barcodes) {
                            String raw = barcode.getRawValue();
                            if (raw != null && !raw.isEmpty()) {
                                String formatName = barcodeFormatName(barcode.getFormat());
                                deliverResult(raw, formatName);
                                break;
                            }
                        }
                    })
                    .addOnFailureListener(e -> Log.e(TAG, "Barcode processing failed", e))
                    .addOnCompleteListener(barcodeTask -> {
                        if (resultDelivered || !tryOcrThisFrame) {
                            imageProxy.close();
                            return;
                        }
                        // Barcode decode found nothing this frame - the code
                        // is likely damaged or the pattern didn't resolve.
                        // Try reading the printed digits underneath instead.
                        runOcrFallback(image, imageProxy);
                    });

        } catch (Exception e) {
            Log.e(TAG, "processImageProxy error", e);
            imageProxy.close();
        }
    }

    private boolean shouldAttemptOcr() {
        long now = System.currentTimeMillis();
        if (now - startTimeMs < OCR_FALLBACK_DELAY_MS) return false;
        if (now - lastOcrRunMs < OCR_MIN_INTERVAL_MS) return false;
        lastOcrRunMs = now;
        if (scannerStatus != null && scannerStatus.getVisibility() != android.view.View.VISIBLE) {
            runOnUiThread(() -> {
                scannerStatus.setText("Barcode unclear - reading printed numbers instead…");
                scannerStatus.setVisibility(android.view.View.VISIBLE);
            });
        }
        return true;
    }

    private void runOcrFallback(InputImage image, ImageProxy imageProxy) {
        textRecognizer.process(image)
                .addOnSuccessListener(text -> {
                    if (resultDelivered) return;
                    String code = extractValidatedCode(text);
                    if (code != null) {
                        deliverResult(code, "OCR (verified)");
                    }
                })
                .addOnFailureListener(e -> Log.w(TAG, "OCR fallback failed", e))
                .addOnCompleteListener(t -> imageProxy.close());
    }

    /**
     * Pulls every 8/12/13/14-digit run out of the recognized text and returns
     * the first one that passes the real EAN/UPC check-digit algorithm - so
     * a misread character can't produce a false positive.
     */
    private String extractValidatedCode(Text text) {
        for (Text.TextBlock block : text.getTextBlocks()) {
            Matcher m = DIGIT_RUN_PATTERN.matcher(block.getText().replaceAll("[^0-9]", " "));
            while (m.find()) {
                String candidate = m.group();
                if (isValidEanUpcChecksum(candidate)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    /** Standard mod-10 (Luhn-style) check digit used by EAN-8/13 and UPC-A/E. */
    private boolean isValidEanUpcChecksum(String digits) {
        int len = digits.length();
        if (len != 8 && len != 12 && len != 13 && len != 14) return false;
        int sum = 0;
        // Check digit is the last one; weight alternates 3/1 from the right,
        // excluding the check digit itself.
        for (int i = 0; i < len - 1; i++) {
            int digit = digits.charAt(len - 2 - i) - '0';
            sum += (i % 2 == 0) ? digit * 3 : digit;
        }
        int checkDigit = (10 - (sum % 10)) % 10;
        int actualCheckDigit = digits.charAt(len - 1) - '0';
        return checkDigit == actualCheckDigit;
    }

    private String barcodeFormatName(int format) {
        switch (format) {
            case Barcode.FORMAT_EAN_13: return "EAN_13";
            case Barcode.FORMAT_EAN_8: return "EAN_8";
            case Barcode.FORMAT_UPC_A: return "UPC_A";
            case Barcode.FORMAT_UPC_E: return "UPC_E";
            case Barcode.FORMAT_CODE_128: return "CODE_128";
            case Barcode.FORMAT_CODE_39: return "CODE_39";
            case Barcode.FORMAT_CODE_93: return "CODE_93";
            case Barcode.FORMAT_CODABAR: return "CODABAR";
            case Barcode.FORMAT_ITF: return "ITF";
            case Barcode.FORMAT_DATA_MATRIX: return "DATA_MATRIX";
            case Barcode.FORMAT_QR_CODE: return "QR_CODE";
            case Barcode.FORMAT_PDF417: return "PDF417";
            case Barcode.FORMAT_AZTEC: return "AZTEC";
            default: return "ML Kit";
        }
    }

    private void deliverResult(String code, String symbology) {
        if (resultDelivered) return;
        resultDelivered = true;
        Intent i = new Intent(MlKitScanner.ACTION_BARCODE);
        i.putExtra("code", code);
        i.putExtra("symbology", symbology);
        // restrict the broadcast to this app to avoid unprotected broadcast issues
        i.setPackage(getPackageName());
        sendBroadcast(i);
        runOnUiThread(this::finish);
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
        if (barcodeScanner != null) {
            barcodeScanner.close();
        }
        if (textRecognizer != null) {
            textRecognizer.close();
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
