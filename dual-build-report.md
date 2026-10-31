# ORBIT 0.10 dual-build verification

Verified on October 31, 2026. Firmware source:
`055a44d8e771940aedbabf0c64a061fc7caf173c`.

Only 0.10.0 and 0.10.B are selectable. The existing browser save keys
remain `image-orbit` and `image-orbit-0.9.B`; the latter is a storage key,
not an available older firmware version.

## Build provenance

The first build used the finalized firmware working tree:

```sh
GIT_MASTER=1 PYTHONDONTWRITEBYTECODE=1 \
ORBIT=/Users/wknam/workspace/orbit ORBIT_LOCAL_DEVELOPMENT=1 \
PYTHON=/Users/wknam/.jieli/orbit-venv/bin/python \
CLANG=/opt/homebrew/opt/llvm/bin/clang sh build.sh
```

After the firmware commit arrived, this check exited 0 with no diff:

```sh
GIT_MASTER=1 git -C /Users/wknam/workspace/orbit diff --exit-code \
  055a44d8e771940aedbabf0c64a061fc7caf173c -- firmware tools assets
```

Untracked development evidence remained in the source repository. Rather
than remove it or override the release guard, the release build used a
clean local clone of the same commit:

```sh
GIT_MASTER=1 git clone --no-hardlinks --single-branch --branch main \
  /Users/wknam/workspace/orbit /tmp/orbit-010-emu-source-055a44d8
GIT_MASTER=1 git -C /tmp/orbit-010-emu-source-055a44d8 rev-parse HEAD
GIT_MASTER=1 PYTHONDONTWRITEBYTECODE=1 \
ORBIT=/tmp/orbit-010-emu-source-055a44d8 ORBIT_LOCAL_DEVELOPMENT=0 \
PYTHON=/Users/wknam/.jieli/orbit-venv/bin/python \
CLANG=/opt/homebrew/opt/llvm/bin/clang sh build.sh
```

Both build commands exited 0 with clang 23.1.3. The existing build script
and browser HAL needed no changes. The normal generator reported 258014
bytes of sample ADPCM; the BLE generator reported 86144 bytes and 45
stand-in zones without data. Final output:

```text
-rwxr-xr-x  900K dist/orbit-ble.wasm
-rwxr-xr-x  1.1M dist/orbit.wasm
```

Release metadata has the source and published revision above,
`dirty: false`, and `local_development: false`. Both release modules are
byte-identical to the tested working-tree build:

| Module | Bytes | SHA-256 |
| --- | ---: | --- |
| `orbit.wasm` | 1152123 | `118aa962b3936d20e63b8c9f75b45ffc801f66c2dbd26b55934d452d7c498784` |
| `orbit-ble.wasm` | 921509 | `4933f6e3c063dbef24c1f7a60dbc5b70e2226695edf463b6e910290b06872851` |

## Regression tests

```sh
for test in orbit-variants orbit-wasm orbit-worklet orbit-engines orbit-lfo \
  orbit-2.4 orbit-refresh orbit-only orbit-delay; do
  node "tests/$test.mjs" || exit
done
node tests/orbit-wasm.mjs dist/orbit-ble.wasm
node --check web/emu.js
node --check tests/orbit-only.mjs
node --check tests/orbit-variants.mjs
GIT_MASTER=1 git diff --check
```

All ten test invocations and the syntax/whitespace checks passed. Output
summaries:

```text
orbit-variants: PASS; 17 engines, 10 distinct melodic variants
PERC: 86144 bytes, byte-identical between builds
PERC SHA-256: 512efc96f699f74db33d4198b7463e8d264eda811773234d131543f9c09e1b87
orbit-wasm: PASS; audioPeak 0.54913330078125, flashBytes 458752, imports 0
ORBIT AudioWorklet quick-tap / preset input: PASS
orbit-engines: PASS; recordedLoopPeak 0.54913330078125
orbit-lfo: PASS; all twelve panel modulation comparisons differ
orbit-2.4: PASS; eight FM6 sounds, stylePersistence true
orbit-refresh: PASS; modules 4, mixerPages 3, homeStaysOnTape true
ORBIT variants frontend: PASS (44 URL/preference combinations, power gate, isolated saves, keyboard selection)
orbit-delay: PASS; monoSide 0, pingSide 2210.44
BLE orbit-wasm: PASS; moduleBytes 921509, flashWrites 17, imports 0
```

The old 0.9.0/0.9.B URLs and unknown version values now fall back to
0.10.0. Regression checks preserve both existing save images and reject
extra selector options.

## Headless browser checks

Served the repository with:

```sh
python3 -u -m http.server 8789 --bind 127.0.0.1
```

Bun's headless WebKit loaded `/dist/?version=0.10.0` and
`/dist/?version=0.10.B` at 1440 x 1000 and 390 x 844. Each of the four
cases passed:

- The selector contained exactly `0.10.0` and `0.10.B`, and the selected
  value and page title agreed.
- POWER ON initialized the real AudioWorklet at 44100 Hz. A subscribed
  firmware frame after the start message contained 57600 pixels.
- An audio-process listener captured finite, nonzero real output after a
  panel note: peak `0.461395263671875`. No page errors were recorded.
- Screenshots showed the real display and controls. There was no
  horizontal overflow; mobile content width was exactly 390 pixels.
  The device starts at 63.919px below the 64px selector strip, the same
  subpixel transform rounding as the previous deployment.
- The new drum, controller, clock and Bluetooth help cards were visually
  checked on desktop. Mobile retains the existing compact panel layout.

Dispatching the Z + X keyboard chord through the frontend displayed
`CONTROLLER CH 1` in the real firmware display. The test subscribed to
worklet frame messages before dispatching input; no fixed sleep was used.

## Limits

This verifies browser sound builds, not FM-1 hardware. No Bluetooth,
radio recovery, USB MIDI clock output, hardware timing or radio-load
measurements were performed. Browser MIDI remains input-only and drops
real-time clock messages.

TypeScript and HTML language-server diagnostics were unavailable because
`typescript-language-server` and `biome` were not installed. The existing
dependency-free project was kept intact; syntax checks, regression tests
and the real browser checks above were run instead.

The deployed application is copied from `dist/` to `docs/`. Pages serves
`main:/docs` at <https://dspaudio.github.io/orbit-web-emu/>. The deployment
handoff records the Pages run and live HTML/Wasm verification separately.
