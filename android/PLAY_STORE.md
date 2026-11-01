# Publishing on Google Play

The steps that only a person with the developer account can take, in order.
Everything the console asks for that can be prepared ahead of time is in
`store/` and `store/LISTING.md`; this file is the path through the console.

There are two apps in this directory, and only one of them is the Play
edition. `app/` is the WebView shell: the whole game in the APK, no
permissions, the build the GitHub Releases carry for sideloading, under its
own package name `com.elderon.tactics`. `play/` is the Play edition: a
Trusted Web Activity under the listing's package name,
`com.taugustincst.elderon`, in which Chrome opens the game's site fullscreen
and Play Billing reaches the page through the Digital Goods API, which is
how `js/billing.js` sells the game. Everything below is about `play/`.

## 0. What Play requires, and where this project meets it

| Requirement | Where |
|---|---|
| The package name the listing was created under, `com.taugustincst.elderon`, on every upload; Play never lets it change | `play/build.gradle`: `applicationId` |
| Target Android 16 (API 36) for new apps and updates, since 31 Aug 2026 | `play/build.gradle` and `app/build.gradle`: `targetSdk 36`, `compileSdk 36` |
| Upload as an Android App Bundle, not an APK | `./gradlew :play:bundleRelease`, or the `-play.aab` on a GitHub Release (step 3) |
| The site vouches for the app: asset links naming the package and its signing key | `https://taugustincst.github.io/.well-known/assetlinks.json` (section 8) |
| An app that loads: every class the manifest names is in the bundle | `tools/check-apk.js`, run on every CI and release build (section 9) |
| Signed with an upload key, enrolled in Play App Signing | `keystore.properties`, step 2 |
| A privacy policy URL | `PRIVACY.md` / `privacy.html` at the repository root |
| Data safety declaration | no data collected: `store/LISTING.md` |
| Content rating questionnaire | answers in `store/LISTING.md` |
| Store listing graphics | `store/` |
| 16 KB page-size support on Android 15+ | no native code, nothing to do |
| Edge-to-edge on Android 15+ | `MainActivity` draws behind the bars and hands the cutout to the page |
| Predictive back | `enableOnBackInvokedCallback` in the manifest; the page decides what back means |

## 1. A developer account

https://play.google.com/console — a one-time registration fee, identity
verification, and for a personal account created after November 2023 a
closed-testing requirement before production: at least 12 testers opted in
for 14 continuous days. Plan for that fortnight.

## 2. An upload key

Generate one keystore, once, and keep it somewhere that survives losing the
laptop. Play App Signing holds the real app-signing key; this is only the
key you sign uploads with, and Play can reset it if it is lost, but that is a
support request, not a click.

```bash
keytool -genkeypair -v -keystore ~/elderon-upload.jks -alias upload \
        -keyalg RSA -keysize 2048 -validity 10000
```

Then create `android/keystore.properties` (ignored by git, never commit it):

```properties
storeFile=/home/you/elderon-upload.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

`app/build.gradle` reads this file when it exists and signs release builds
with it. Without it, release builds are signed with the debug key so they
still install on your own device, but Play will refuse them.

**If the listing already exists, the upload key is whichever key signed its
first upload.** Play ties the listing to that key and refuses anything
else. If that first bundle came out of another tool, the key is in what
that tool gave you: PWABuilder, for one, puts `signing.keystore` next to a
`signing-key-info.txt` with the alias and both passwords in its download.
Use that keystore here; do not generate a second one. A lost upload key is
reset from the console (Setup → App signing → Request upload key reset),
which takes a support round-trip of a few days.

## 3. Build the bundle

Needs the Android SDK with platform 36 and a JDK 17 or newer (Android
Studio brings both). From this directory:

```bash
./gradlew :play:bundleRelease -PversionCode=11401 -PversionName=1.14.1
# play/build/outputs/bundle/release/play-release.aab
```

Every upload must carry a `versionCode` higher than the last one Play has
seen; pass the next number on the command line rather than editing the
build file. `versionName` is the text players see. The release workflow
derives the code from the version so it climbs with it and can be read off
a release: 1.14.1 is 11401. Keep to the same scheme by hand, and if the
console shows a higher code from an earlier upload, go above it.

**Or let GitHub build it.** `.github/workflows/release.yml` builds the
bundle on every release and attaches it as `chronicles-of-elderon-<version>.aab`
once the repository holds the upload key. In the repository's Settings →
Secrets and variables → Actions, add four secrets:

| Secret | Value |
|---|---|
| `ANDROID_UPLOAD_KEYSTORE` | the keystore file, base64: `base64 -w0 ~/elderon-upload.jks` |
| `ANDROID_UPLOAD_STORE_PASSWORD` | its password |
| `ANDROID_UPLOAD_KEY_ALIAS` | the key alias (`upload` above) |
| `ANDROID_UPLOAD_KEY_PASSWORD` | the key's password |

Then run the Release workflow from the Actions tab with the version (and a
`version_code` only if the console demands a higher one). The
`chronicles-of-elderon-<version>-play.aab` on the release is signed with
the upload key, carries the Play package name, and has been through the
launch check in section 9; download it and upload it in the console.
Without the secrets the workflow still builds the bundle, to prove it
builds, but leaves it off the release because a debug-signed bundle is
nothing Play would take.

To try the build on a phone before uploading it, build an APK the same
way: `./gradlew :play:assembleRelease` and install
`play/build/outputs/apk/release/play-release.apk` with `adb install`. A
build signed with a key the site's asset links do not name opens with
Chrome's URL bar showing; that is the one difference, and the Play-signed
build will not have it.

**This build is verified, not just written.** CI's `android` job runs
`assembleDebug bundleRelease` for both apps on every push (see
`.github/workflows/ci.yml`), on a runner with the real SDK, then checks
each APK the way a phone does at launch (section 9); only the upload key
is still to be tried, since that needs the secrets above or the file from
step 2. If Gradle complains about a version, the two pinned ones are the
AGP version in `build.gradle` and the Gradle version in
`gradle/wrapper/gradle-wrapper.properties`; raise them together.

## 4. Create the app in the console

Play Console → Create app → name `Chronicles of Elderon`, App, Free,
default language English. Then, in the left-hand menu:

1. **Set up your app** (the checklist under the Dashboard) — every item's
   answer is in `store/LISTING.md`: privacy policy URL, app access, ads,
   content rating, target audience, news, data safety, government, financial
   features, health. Category: Game → Strategy.
2. **Store listing** — paste the name, short and full descriptions from
   `store/LISTING.md`; upload `store/icon-512.png`, the feature graphic and
   the phone screenshots (two minimum, all seven is better). Tablet
   screenshots are optional; the two in `store/` fit both tablet slots.
3. **Play App Signing** — accept it when the first release asks; upload the
   bundle from step 3.

## 5. Testing, then production

1. **Internal testing** — upload the bundle, add your own account as a
   tester, install from the link Play gives you. Confirm: launches
   fullscreen with no URL bar (a bar means the asset links do not name
   the key Play signed it with: section 8), sound plays after the first
   tap, back button steps through menus and out of the app only from the
   title screen, a saved game survives closing and reopening the app,
   rotating the phone mid-battle keeps the battle, and the store answers
   (the title screen's unlock shows Play's price, not the fallback).
2. **Closed testing** — the 12-tester, 14-day track for a personal account.
   Recruit testers, wait, then apply for production access from the
   Dashboard.
3. **Production** — promote the same bundle. Review takes from hours to a
   few days for a first release. The pre-launch report will run the app on
   a rack of real devices; a crash there is worth reading before publishing.

## 6. Updating

Change the game, run `node tools/make-store.js` if a screenshot went stale,
then cut a release (step 3, either way) and upload the `.aab` to the
production track with the release notes from `store/LISTING.md`. Nothing
else changes between releases.

## 7. Releases outside Play

`.github/workflows/release.yml` builds an APK on GitHub's runners and
attaches it, with the single-file web build, to a GitHub Release: run it
from the Actions tab with a version number, or push a tag like `v1.8.1`.
That APK is signed with the debug key, so it sideloads onto any phone but
is not what Play accepts; the Play bundle still comes from step 3, on a
machine that holds the upload key.

## 8. The site and the app vouch for each other

A Trusted Web Activity is only trusted, and only fullscreen, when the
site and the app each name the other. The app's side is in
`play/build.gradle` (`assetStatements`, naming `https://taugustincst.github.io`)
and needs no attention. The site's side is
`https://taugustincst.github.io/.well-known/assetlinks.json`, served from
the `taugustincst.github.io` repository (GitHub Pages serves a project
site under a path, and `.well-known` has to be at the origin's root), and
it must list this package with the SHA-256 fingerprint of the key the
installed app is signed with. On Play that is the **app signing key**, not
the upload key: Play Console → Setup → App signing → "App signing key
certificate" → SHA-256. Listing the upload key's fingerprint beside it
lets a locally built release install fullscreen too. The file already
carries two fingerprints for this package; when a key changes, that file
is the one to update, and Chrome re-reads it on the next launch.

When the handshake fails, the game still opens and runs, but inside a
Chrome custom tab with its URL bar showing, and the Digital Goods API is
not offered to the page, so the store never answers and the title screen
shows the fallback price. That is the symptom to check the file for.

## 9. If Play says the app installs but does not load

Play once removed the app under the Broken Functionality policy with this
from its own test devices:

    java.lang.ClassNotFoundException: Didn't find class
    "com.taugustincst.elderon.Application" on path: DexPathList

That is a bundle whose manifest names an `Application` class that is not
in its dex, so the process dies before the launcher activity is created,
on every device, every time. The bundle was a Trusted Web Activity made by
a generator outside this project: Bubblewrap and PWABuilder write
`android:name="Application"` into the manifest and an `Application.java`
beside the activity, and that class did not make it into the build. The
`play/` module replaces that generated project. It is the same shape (the
same library, the same billing components, the same metadata) spelled out
in the repository, with no `Application` class to go missing, and every
build of it is checked. The way back onto Play:

1. **Build the bundle from this project** (step 3, either way). It carries
   the listing's package name, `com.taugustincst.elderon`, so Play takes
   it as an update to the same app, and it is signed with the listing's
   upload key (step 2, the note on an existing listing).
2. **Check it before uploading.** CI and the release workflow run
   `node tools/check-apk.js` on every APK they build: every class the
   manifest names must be defined in the dex, the launcher activity among
   them, and the package must be the listing's. A red Android job is a
   build that would not load; it never reaches a release. To run it on a
   bundle by hand, build the APK of the same build
   (`./gradlew :play:assembleRelease` with the same flags) and check that.
3. **Upload it as a new release** on the production track, with a
   `versionCode` above the removed one (the workflow's 11401 for 1.14.1 is
   above anything a generator numbered from 1; pass `version_code` if the
   console shows more), and submit it for review. The enforcement lifts
   when the update passes review; it is the fix Play's notice asks for,
   and no appeal is needed for that.
4. **Appeal only if the notice stays** after the update is approved, from
   the Policy status page's "Submit an appeal", saying the crash was a
   missing `Application` class in the previous bundle's dex, that the new
   version (name its versionCode) declares no such class and was verified
   to load, and asking for the listing to be reinstated. Appeals take five
   to eight days; the update is the faster path and is not blocked by one.

Players who sideloaded an `.apk` from a GitHub Release have the other app,
`com.elderon.tactics`, with the game inside it; the Play edition installs
beside it as a separate app with its own saved games.
