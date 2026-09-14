# Chronicles of Elderon — Android app

A thin native shell around the game. The game itself is the same code that runs
in a browser: `app/build.gradle` copies `index.html`, `css/`, `js/` and `icons/`
from the repository root into the APK's assets at build time, so the app can
never drift from the web build.

## Building

The Android SDK was not reachable from the environment this project was
developed in, so **this project has never been run through Gradle here**.
Everything has been checked as far as it can be without the SDK: the Java
compiles cleanly against the real Android 16 framework classes, the XML is
well formed, the Gradle scripts are balanced, and the asset copy gathers the
right files. Expect to fix a small thing or two on the first real build.

With Android Studio installed, or a command-line SDK with platform 36 and
build-tools, and a JDK 17 or newer:

```bash
cd android
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug           # build and install onto a connected device
./gradlew bundleRelease          # app/build/outputs/bundle/release/app-release.aab, for Play
```

Release builds are signed with the upload key named in `keystore.properties`
when that file exists, and with the debug key otherwise so they still
install. [PLAY_STORE.md](PLAY_STORE.md) walks through the key, the bundle and
the console, step by step.

If Gradle cannot find the SDK, set its location:

```bash
echo "sdk.dir=$HOME/Android/Sdk" > local.properties
```

## How it works

`MainActivity` hosts a single `WebView` and serves the bundled files through
`WebViewAssetLoader`, which puts them on an `https://appassets.androidplatform.net`
origin. That detail matters: loading from `file://` gives the page an opaque
origin where saved games in `localStorage` are not durable.

- **No permissions at all.** Without `INTERNET` the app cannot reach the network
  even if something tried to. That is also the whole of the Play data-safety
  declaration.
- **Immersive fullscreen**, re-applied whenever the window regains focus, and
  drawn edge to edge as Android 15 and later require. A WebView does not fill
  in the CSS safe-area insets by itself, so the activity hands the display
  cutout to the page as CSS variables the stylesheet falls back to.
- **Back button** calls the game's own `handleBack()`. It closes the help
  overlay, cancels a selection in battle, and walks the screens back to the
  title. Only when the game says it has nowhere left to go does the app close.
  Predictive back is enabled; the same callback drives it.
- **Rotation** is handled by the activity rather than by recreating it, so a
  battle in progress survives turning the phone.
- **Pause** stops the render loop and the music sequencer via `pauseTimers()`,
  and the page itself suspends its audio engine whenever it is hidden.
- **No service worker.** The files are already on the device, so `sw.js` is not
  bundled and the page skips registering it when it finds itself on the app's
  origin.
- **The screen is kept awake** while the app is in front.
- **Long presses** do nothing, rather than opening a text-selection toolbar.

## Icons

`node tools/make-icons.js` regenerates every icon in this project and in
`icons/` from the game's own sprite templates and palettes. It writes the
legacy square icons, the round variants, the adaptive-icon foreground layer
and the monochrome layer for themed icons, at all five densities. Run it after
changing the art.

## The alternative: install the web version

The game is also a progressive web app, which needs no toolchain at all. Serve
the repository root over HTTPS, open it in Chrome on the phone, and choose
"Install app" or "Add to Home Screen". It gets its own icon, launches
fullscreen and runs offline. For a device on the same network:

```bash
python3 -m http.server 8000     # then open http://<your-ip>:8000 on the phone
```

Installation prompts require HTTPS (or localhost); over plain HTTP the game
still runs, it just will not offer to install.
