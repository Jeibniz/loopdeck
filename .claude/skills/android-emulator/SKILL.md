---
name: android-emulator
description: Use when an Android app must run on an emulator or device — to build it, boot the emulator, see the UI (screenshot or UI tree), tap/type, read logcat, or feed data the emulator can't produce (Bluetooth, sensors, GPS, camera). Covers headless, agent-driven work and the adb/uiautomator, mobile-mcp, and Maestro options.
allowed-tools: Bash, Read
---

Drive an Android app on an emulator (or device) end to end: build → boot → install → **see** →
**interact** → read logs. Key trap: emulators have **no real Bluetooth and only limited
sensor/GPS/camera** — a hardware-dependent app shows an empty "waiting" screen until you feed it data.

## First: prefer this project's own tooling
If the repo has `scripts/` helpers (`env.sh`, `emu.sh`, `app.sh`, `ui.sh`, `inject.sh`),
`docs/agent-emulator-guide.md`, or a CLAUDE.md "Stack & commands" block, **use those** — they encode
the project's AVD name, applicationId, and data scenarios. This skill is the fallback and the method
behind them.

## Setup (once per shell)
- Toolchain on PATH: `source scripts/env.sh` if it exists, else set `JAVA_HOME` (on macOS, Android
  Studio's bundled JBR: `/Applications/Android Studio.app/Contents/jbr/Contents/Home`) + `ANDROID_HOME`
  (`$HOME/Library/Android/sdk`) and add `$ANDROID_HOME/{platform-tools,emulator,cmdline-tools/latest/bin}` to PATH.
- Build: `./gradlew :app:assembleDebug`.

## Emulator
- `emulator -list-avds`. If none, create one (pick the newest arm64 image on Apple Silicon):
  `sdkmanager "system-images;android-36;google_apis;arm64-v8a"` then
  `avdmanager create avd -n dev -k "system-images;android-36;google_apis;arm64-v8a" -d pixel_7`.
- Boot headless + wait: `emulator -avd <name> -no-window -no-snapshot -gpu swiftshader_indirect &`
  then `adb wait-for-device` and poll `adb shell getprop sys.boot_completed` until it prints `1`.
- Install + launch: `./gradlew :app:installDebug` then `adb shell am start -n <pkg>/<activity>`.

## See (cheap first — watch token cost)
**Read the screen as a filtered tree, never the raw XML** (a full dump is ~3k+ tokens). Filter so only
labels + stable ids + tap bounds reach you (~200–400 tokens):
```
adb exec-out uiautomator dump /dev/tty | tr '>' '\n' | grep -oE '(text|resource-id|content-desc|bounds)="[^"]+"'
```
Screenshot **only when you need pixels**: `adb exec-out screencap -p > shot.png` then Read it (~1.5k image tokens).

## Interact
- Tap: find the target's `bounds` in the uiautomator dump, tap the center → `adb shell input tap <cx> <cy>`.
- Text / keys: `adb shell input text 'hello%sworld'` · `adb shell input keyevent KEYCODE_ENTER`.
- Match by **stable id**, not coordinates. In Compose, add `Modifier.semantics { testTagsAsResourceId = true }`
  once at the root + `Modifier.testTag("...")` on elements so `resource-id`s show up in the dump.

## Feed data the emulator can't produce
- **Custom streams (BLE, a device protocol):** a debug `BroadcastReceiver` in `src/debug/` that a fake
  data source listens to; drive it with `adb shell am broadcast -n <pkg>/.<Receiver> --es key val`.
- **Built-ins:** `adb emu geo fix <lon> <lat>` (GPS); the emulator's `sensor set` console for sensors.
Keep all fake-data code in `src/debug/` (its own manifest) so it never ships in release — verify with
`assembleRelease` + grep the release manifest.

## Richer / repeatable options
- **mobile-mcp** (`@mobilenext/mobile-mcp`, via `.mcp.json`) — structured element list + tap/screenshot
  as native Claude tools; pass `device` per call (concurrency-safe). Best for interactive sessions.
  Loads on Claude Code restart.
- **Maestro** (`curl -Ls https://get.maestro.mobile.dev | bash`) — deterministic YAML flows matching by
  `id:`/text. Best for repeatable regression + CI.

## Real device / real hardware
For final validation, ask the human to plug in a phone (USB debugging on) and pair/power any real
peripheral. `adb devices` → target it with `ANDROID_SERIAL`. All the above commands honor it.

## Common mistakes
- Screenshotting every step (token-heavy) instead of reading the UI tree.
- Expecting a hardware-dependent app to show data on an emulator — it won't; inject.
- `am start --es ...` not applying when the activity is already running → `force-stop` first, or handle `onNewIntent`.
- Tapping raw coordinates that drift across layouts → match by `resource-id`/text.
- `emu kill` returns before the device is gone → wait until `adb devices` is empty before re-booting.
- Off-screen elements aren't in the dump → scroll them into view (or lay controls out to fit).
