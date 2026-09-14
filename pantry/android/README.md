# Pantry Scan — Android app

A thin native shell around the web app one directory up. `app/build.gradle`
copies `index.html`, `css/`, `js/`, `icons/` and the vendored recogniser in
`vendor/` into the APK's assets at build time, so the app can never drift from
the web build and needs nothing from the network.

## Building

The Android SDK was not reachable from the environment this project was
written in, so **this project has never been compiled.** Everything here has
been checked as far as it can be without the SDK: the XML is well formed, the
Gradle scripts are balanced, the Java is reviewed against the AndroidX APIs
it uses, and the asset copy gathers the right files. Expect to fix a small
thing or two on the first real build.

With Android Studio, or a command-line SDK with platform 34 and build-tools:

```bash
cd pantry/android
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug           # build and install onto a connected device
```

`assembleRelease` is signed with the debug key so the APK installs; point
`signingConfig` at a real keystore before publishing anywhere.

If Gradle cannot find the SDK:

```bash
echo "sdk.dir=$HOME/Android/Sdk" > local.properties
```

The APK is about 12 MB, most of it the WebAssembly recogniser and the English
model.

## How it works

`MainActivity` hosts one `WebView` and serves the bundled files through
`WebViewAssetLoader` on an `https://appassets.androidplatform.net` origin. The
https origin is what makes the page a secure context, which the camera API
requires, and what gives `localStorage` a durable home for the pantry.

The native side adds the three things a page cannot do by itself:

- **Live camera.** When the page calls `getUserMedia`, the WebView raises
  `onPermissionRequest`. The activity asks for the Android `CAMERA` permission
  the first time, then grants video capture to the page. Refusing leaves
  "Choose photo" working.
- **Photo chooser.** `<input type="file" accept="image/*" capture>` raises
  `onShowFileChooser`. The activity offers the system camera app and the
  gallery together; a capture is written to the app's cache through a
  `FileProvider` and handed back as a `content://` URI.
- **Export.** A WebView has neither downloads nor the Web Share API, so the
  page calls `PantryAndroid.exportJson(json)` and the activity opens the
  system "save as" picker and writes the file where the user chooses. Import
  goes through the ordinary file chooser.

The back button calls the page's `handleBack()`: it closes an open recipe or
settings sheet, cancels a scan in progress, and returns to the Scan tab. Only
when the page says it has nowhere left to go does the app close.

The service worker the page registers in a browser also registers here, so a
`ServiceWorkerClientCompat` routes its requests through the same asset loader.
Without that the assets stop resolving on the second launch.

**Permissions:** `CAMERA` only. There is no `INTERNET` permission. The
recogniser runs in the WebView from bundled files, so a photo cannot leave
the phone even in principle.

## Icons

API 26 and later use the adaptive icon in `res/drawable` (vector, with a
monochrome layer for themed icons). API 24 and 25 fall back to the PNGs in
`res/mipmap-*`, drawn by `node tools/make-android-icons.js` from the same
design as the web icon.
