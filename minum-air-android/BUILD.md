# Minum Air for Android (Google Play)

A Trusted Web Activity wrapper made with Bubblewrap: the app opens https://minum-air.vercel.app
full screen. Most changes ship by deploying the website; rebuild this only to change the app's
icon, name, package or version, or to raise the Android target.

- Package: `com.meowie.minumair` (permanent once published)
- Target SDK 36 (Android 16), min SDK 24
- Signed with the upload key `upload.keystore` (alias `minumair`), kept outside this repo.
- The website must serve `/.well-known/assetlinks.json` with this key's SHA-256 fingerprint and,
  after the first upload, Google Play's app signing key fingerprint too (Play Console →
  Test and release → App integrity), or the app shows a browser bar.

## Build

```sh
echo "sdk.dir=/path/to/android-sdk" > local.properties
export MA_KEYSTORE=/path/to/upload.keystore MA_KEYPASS='…'
./gradlew bundleRelease          # app/build/outputs/bundle/release/app-release.aab
```

For each new upload raise `versionCode` (and `versionName`) in `app/build.gradle` and
`twa-manifest.json`.
