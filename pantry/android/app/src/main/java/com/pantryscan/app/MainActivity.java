package com.pantryscan.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.webkit.ServiceWorkerClientCompat;
import androidx.webkit.ServiceWorkerControllerCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewFeature;

import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Hosts Pantry Scan in a WebView.
 *
 * <p>The web app and the vendored recogniser are bundled in the APK's assets
 * and served through {@link WebViewAssetLoader} on an https origin. That is
 * what makes the page a secure context, which the camera API requires, and
 * what gives localStorage a durable origin for the pantry.
 *
 * <p>The native side does three things the page cannot do alone: passes the
 * camera through to {@code getUserMedia}, answers {@code <input type=file>}
 * with the system camera or gallery, and writes the exported pantry file
 * where the user chooses. There is no network permission; the recogniser and
 * its language model ship in the APK, so photos cannot leave the phone.
 */
public class MainActivity extends AppCompatActivity {

    /** Any host works; this is the one Google's loader documents. */
    private static final String DOMAIN = "appassets.androidplatform.net";

    private WebView web;

    /** The page's pending camera request while the OS permission dialog is up. */
    private PermissionRequest pendingCamera;

    /** The page's pending file chooser while the picker or camera app is up. */
    private ValueCallback<Uri[]> pendingChooser;
    private Uri pendingCaptureUri;

    /** JSON waiting to be written once the user has picked where. */
    private String pendingExport;

    private ActivityResultLauncher<String> cameraPermission;
    private ActivityResultLauncher<String> chooserPermission;
    private ActivityResultLauncher<Intent> chooser;
    private boolean pendingChooserWantsCapture;
    private CharSequence pendingChooserTitle;
    private ActivityResultLauncher<Intent> exporter;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        cameraPermission = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(), granted -> {
                    if (pendingCamera == null) return;
                    if (granted) {
                        pendingCamera.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    } else {
                        pendingCamera.deny();
                        Toast.makeText(this, R.string.camera_denied, Toast.LENGTH_LONG).show();
                    }
                    pendingCamera = null;
                });

        // The file chooser wants to offer the system camera, which the OS only
        // allows once the app holds CAMERA. Ask, then open the chooser either
        // way: refused just means the gallery is offered alone.
        chooserPermission = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> launchChooser(pendingChooserWantsCapture, pendingChooserTitle));

        chooser = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(), result -> {
                    if (pendingChooser == null) return;
                    Uri[] picked = null;
                    if (result.getResultCode() == RESULT_OK) {
                        Intent data = result.getData();
                        if (data != null && data.getData() != null) {
                            picked = new Uri[]{data.getData()};
                        } else if (pendingCaptureUri != null) {
                            // The camera app writes into the URI we gave it and
                            // returns no data of its own.
                            picked = new Uri[]{pendingCaptureUri};
                        }
                    }
                    pendingChooser.onReceiveValue(picked);
                    pendingChooser = null;
                    pendingCaptureUri = null;
                });

        exporter = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(), result -> {
                    String json = pendingExport;
                    pendingExport = null;
                    if (json == null || result.getResultCode() != RESULT_OK || result.getData() == null
                            || result.getData().getData() == null) return;
                    try (OutputStream out = getContentResolver().openOutputStream(result.getData().getData())) {
                        if (out == null) throw new IOException("no stream");
                        out.write(json.getBytes(StandardCharsets.UTF_8));
                        Toast.makeText(this, R.string.export_saved, Toast.LENGTH_SHORT).show();
                    } catch (IOException e) {
                        Toast.makeText(this, R.string.export_failed, Toast.LENGTH_SHORT).show();
                    }
                });

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);                 // the pantry
        s.setMediaPlaybackRequiresUserGesture(false); // the camera preview is a <video>
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowFileAccess(false);                  // nothing is loaded over file://
        s.setAllowContentAccess(true);                // photos arrive as content:// URIs
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.setBackgroundColor(ContextCompat.getColor(this, R.color.pantry_cream));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain(DOMAIN)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // The app never navigates away; refuse anything that tries.
                return !DOMAIN.equals(request.getUrl().getHost());
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            /** getUserMedia from the page: ask the OS, then answer the page. */
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                boolean wantsVideo = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsVideo = true;
                }
                if (!wantsVideo || !DOMAIN.equals(request.getOrigin().getHost())) {
                    request.deny();
                    return;
                }
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                } else {
                    pendingCamera = request;
                    cameraPermission.launch(Manifest.permission.CAMERA);
                }
            }

            /** {@code <input type=file accept=image/*>}: camera app or gallery. */
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = callback;
                pendingChooserWantsCapture = params.isCaptureEnabled();
                pendingChooserTitle = params.getTitle();
                boolean hasCamera = getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY);
                boolean allowed = ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED;
                if (hasCamera && !allowed) {
                    chooserPermission.launch(Manifest.permission.CAMERA);
                } else {
                    launchChooser(pendingChooserWantsCapture, pendingChooserTitle);
                }
                return true;
            }
        });

        // Lets the page hand the export to the native file picker, since a
        // WebView has neither downloads nor the Web Share API.
        web.addJavascriptInterface(new Bridge(), "PantryAndroid");

        // Requests made by the page's service worker go through a separate
        // client; without this the assets stop resolving on the second launch,
        // once the worker controls the page.
        if (WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_BASIC_USAGE)
                && WebViewFeature.isFeatureSupported(WebViewFeature.SERVICE_WORKER_SHOULD_INTERCEPT_REQUEST)) {
            ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(
                    new ServiceWorkerClientCompat() {
                        @Override
                        public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                            return loader.shouldInterceptRequest(request.getUrl());
                        }
                    });
        }

        web.loadUrl("https://" + DOMAIN + "/index.html");

        // Back closes an open dialog or returns to the Scan tab; only when the
        // page says it has nowhere left to go does the app close.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                web.evaluateJavascript(
                        "(function(){try{return !!window.handleBack&&window.handleBack()}catch(e){return false}})()",
                        value -> {
                            if (!"true".equals(value)) {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                            }
                        });
            }
        });
    }

    /** Open the gallery, with the system camera alongside where allowed. */
    private void launchChooser(boolean preferCapture, CharSequence title) {
        if (pendingChooser == null) return;
        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        pick.setType("image/*");

        Intent open = pick;
        Intent capture = captureIntent();
        if (capture != null) {
            Intent primary = preferCapture ? capture : pick;
            Intent secondary = preferCapture ? pick : capture;
            open = Intent.createChooser(primary, title);
            open.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{secondary});
        }
        try {
            chooser.launch(open);
        } catch (ActivityNotFoundException e) {
            pendingChooser.onReceiveValue(null);
            pendingChooser = null;
        }
    }

    /** An intent for the system camera app writing into our cache, or null. */
    private Intent captureIntent() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            // Declaring CAMERA in the manifest means the OS refuses to hand
            // an IMAGE_CAPTURE intent to an app that has not been granted it.
            return null;
        }
        try {
            File dir = new File(getCacheDir(), "captures");
            if (!dir.isDirectory() && !dir.mkdirs()) return null;
            File file = File.createTempFile("scan-", ".jpg", dir);
            pendingCaptureUri = FileProvider.getUriForFile(this, "com.pantryscan.app.files", file);
        } catch (IOException | IllegalArgumentException e) {
            return null;
        }
        Intent capture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        capture.putExtra(MediaStore.EXTRA_OUTPUT, pendingCaptureUri);
        capture.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return capture;
    }

    /** Methods the page may call as {@code PantryAndroid.*}. */
    private final class Bridge {
        @JavascriptInterface
        public void exportJson(String json) {
            pendingExport = json;
            Intent create = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            create.addCategory(Intent.CATEGORY_OPENABLE);
            create.setType("application/json");
            create.putExtra(Intent.EXTRA_TITLE, "pantry.json");
            runOnUiThread(() -> {
                try {
                    exporter.launch(create);
                } catch (ActivityNotFoundException e) {
                    pendingExport = null;
                    Toast.makeText(MainActivity.this, R.string.export_failed, Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
