# Publishing on Google Play

The steps that only a person with the developer account can take, in order.
Everything the console asks for that can be prepared ahead of time is in
`store/` and `store/LISTING.md`; this file is the path through the console.

## 0. What Play requires, and where this project meets it

| Requirement | Where |
|---|---|
| Target Android 16 (API 36) for new apps and updates, since 31 Aug 2026 | `app/build.gradle`: `targetSdk 36`, `compileSdk 36` |
| Upload as an Android App Bundle, not an APK | `./gradlew bundleRelease` |
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

## 3. Build the bundle

Needs the Android SDK with platform 36 and a JDK 17 or newer (Android
Studio brings both). From this directory:

```bash
./gradlew bundleRelease -PversionCode=1 -PversionName=1.0
# app/build/outputs/bundle/release/app-release.aab
```

Every upload must carry a `versionCode` higher than the last one Play has
seen; pass the next number on the command line rather than editing the
build file. `versionName` is the text players see.

To try the release build on a phone before uploading it, build an APK the
same way: `./gradlew assembleRelease` and install
`app/build/outputs/apk/release/app-release.apk` with `adb install`.

**This build is verified, not just written.** CI's `android` job runs
`assembleDebug` on every push (see `.github/workflows/ci.yml`), on a
runner with the real SDK, so the project is known to build clean; only
`bundleRelease` and its signing key are still to be tried on a real
machine, since that needs the upload key from step 2. If Gradle
complains about a version, the two pinned ones are the AGP version in
`build.gradle` and the Gradle version in
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
   fullscreen, sound plays after the first tap, back button steps through
   menus and out of the app only from the title screen, a saved game
   survives closing and reopening the app, rotating the phone mid-battle
   keeps the battle.
2. **Closed testing** — the 12-tester, 14-day track for a personal account.
   Recruit testers, wait, then apply for production access from the
   Dashboard.
3. **Production** — promote the same bundle. Review takes from hours to a
   few days for a first release. The pre-launch report will run the app on
   a rack of real devices; a crash there is worth reading before publishing.

## 6. Updating

Change the game, run `node tools/make-store.js` if a screenshot went stale,
then `./gradlew bundleRelease -PversionCode=<next> -PversionName=<next>`
and upload to the production track with release notes. Nothing else changes
between releases.

## 7. Releases outside Play

`.github/workflows/release.yml` builds an APK on GitHub's runners and
attaches it, with the single-file web build, to a GitHub Release: run it
from the Actions tab with a version number, or push a tag like `v1.6.0`.
That APK is signed with the debug key, so it sideloads onto any phone but
is not what Play accepts; the Play bundle still comes from step 3, on a
machine that holds the upload key.
