# Chronicles of Elderon — Android app

A thin native shell around the game. The game itself is the same code that runs
in a browser: `app/build.gradle` copies `index.html`, `css/`, `js/` and `icons/`
from the repository root into the APK's assets at build time, so the app can
never drift from the web build.

## Building

The Android SDK was not reachable from the environment this project was
developed in, so **this project has never been compiled**. Everything here has
been checked as far as it can be without the SDK: the XML is well formed, the
Java parses without syntax errors, the Gradle scripts are balanced, and the
asset copy gathers the right sixteen files. Expect to fix a small thing or two
on the first real build.

With Android Studio installed, or a command-line SDK with platform 34 and
build-tools:

```bash
cd android
./gradlew assembleDebug          # app/build/outputs/apk/debug/app-debug.apk
./gradlew installDebug           # build and install onto a connected device
```

`assembleRelease` also works and is signed with the debug key so the APK
installs; point `signingConfig` at a real keystore before publishing anywhere.

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
  even if something tried to.
- **Immersive fullscreen**, re-applied whenever the window regains focus.
- **Back button** calls the game's own `handleBack()`. It closes the help
  overlay, cancels a selection in battle, and walks the screens back to the
  title. Only when the game says it has nowhere left to go does the app close.
- **Rotation** is handled by the activity rather than by recreating it, so a
  battle in progress survives turning the phone.
- **Pause** stops the render loop and the music sequencer via `pauseTimers()`.
- **The offline service worker still works.** The page is served over https, so
  it registers the same worker it would in a browser. A WebView routes requests
  made by a service worker through a separate client, so that client is wired to
  the same asset loader; without it the assets would stop resolving the moment
  the worker took control, which is the second launch.
- **The screen is kept awake** while the app is in front.

## Icons

`node tools/make-icons.js` regenerates every icon in this project and in
`icons/` from the game's own sprite templates and palettes. It writes the
legacy square icons, the round variants and the adaptive-icon foreground layer
at all five densities. Run it after changing the art.

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
