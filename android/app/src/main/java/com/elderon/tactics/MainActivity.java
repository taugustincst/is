package com.elderon.tactics;

import android.annotation.SuppressLint;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

/**
 * Hosts the game in a WebView.
 *
 * <p>The game's files are bundled in the APK's assets and served through
 * {@link WebViewAssetLoader}, which puts them on an https origin. That matters:
 * loading from {@code file://} gives the page an opaque origin, where saved
 * games in localStorage are not durable.
 *
 * <p>There is no network permission. Everything the game needs is in the APK.
 */
public class MainActivity extends AppCompatActivity {

    /** Any host works; this is the one Google's loader documents. */
    private static final String DOMAIN = "appassets.androidplatform.net";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Draw behind the system bars; the page keeps its own layout clear of
        // them through the CSS safe-area insets.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // saved games
        s.setMediaPlaybackRequiresUserGesture(false);  // the audio engine starts on a tap anyway
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);                    // system font scaling must not reflow the board
        s.setAllowFileAccess(false);           // nothing is loaded over file://
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);

        web.setBackgroundColor(0xFF0F1020);
        web.setHorizontalScrollBarEnabled(false);
        web.setVerticalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Remote debugging only for a debuggable build. Read from the package
        // flags rather than BuildConfig, which AGP 8 does not generate unless
        // the build feature is turned on.
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
                // The game never navigates away; refuse anything that tries.
                return !DOMAIN.equals(request.getUrl().getHost());
            }
        });

        web.loadUrl("https://" + DOMAIN + "/index.html");

        // Back steps through the game. The page decides; only when it says it
        // has nothing left to go back to does the app close.
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

    /** Hide the status and navigation bars, and keep them hidden after a swipe. */
    private void goImmersive() {
        WindowInsetsControllerCompat c =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
        web.pauseTimers();   // stop the render loop and the music sequencer
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.resumeTimers();
        web.onResume();
        goImmersive();
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
