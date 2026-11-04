# ORBIT web emulator

Play **ORBIT 1.0.1B**, the FM-1 Bluetooth build, using the actual C firmware
compiled to WebAssembly inside an AudioWorklet.

**[Open the emulator](https://dspaudio.github.io/orbit-web-emu/)**

## The firmware

The emulator runs one module, `orbit-ble.wasm`: ORBIT 1.0.1B compiled with
`ORBIT_BLE=1` from the same sources as the `orbit-ble.fwsc` hardware image.
It has the Bluetooth build's sound: FM melodic replacements for the built-in
samples, the original PERC drums and a 0.37 s delay (PING: 0.19 s per side).
Names and engine IDs are preserved. PIANO uses a 3-operator FM tine voice;
BASS, VIBES, HORNS, STRGS and FLUTE use 2-operator FM; SCRCH uses a
noise/triangle sweep. GRAIN uses the corresponding sources too.
See the [complete replacement list](https://github.com/dspaudio/orbit#sounds-replaced-in-the-bluetooth-build).

There is no version selector. Older `?version=` links and stored firmware
preferences all open 1.0.1B; SLOOP, Felucca, the sample-based 1.0.0 and
earlier ORBIT modules are not published.

This is a **sound emulator**, not a Bluetooth emulator. Enabling Bluetooth in
the firmware menu reports `FAILED: NO BROWSER RADIO`.

## New in 1.0.1B

- **GLO > BT BUFFER:** on hardware, KNOB1 chooses 46, 58 or 70 ms of
  phone-audio prebuffer (default 58 ms; larger values add latency). It is a
  device setting, independent of projects. The browser shows and edits the
  page, but has no phone stream to buffer, and the device store that keeps
  the setting is written only by the hardware main loop.

The 1.0 features remain: chord voicings OPEN, OPEN7, ADD9 and 6TH with arp
continuity, controller-mode momentary/toggle switches with CC feedback, quiet
drum GRID editing, the OCT- + OCT+ controller shortcut and hardware MIDI clock
output over USB and Bluetooth MIDI. The browser accepts MIDI channel messages
but does not send MIDI output or follow external clock. Bluetooth MIDI and
A2DP are not emulated; the disconnected BT AUDIO page stays hidden.

## Firmware and controls

`ORBIT_REVISION` pins the clean release source commit. `build-info.json` records the
actual compiled firmware version, source revision, dirty/development state,
module size and SHA-256 of the build.

The published module is built from the clean ORBIT 1.0.1B release commit
recorded in `ORBIT_REVISION`. The published `build-info.json` reports
`dirty: false` and `local_development: false`.

It runs the real sequencer, synthesis engines, effects, storage readers and
240-by-240 display. There are 17 engines and 189 factory sounds, with ORP8
projects and OPB3 USER banks. Optional SLICE is disabled.

- HOME returns to Event Tape; the old visualizer is removed.
- EDIT / ENV / FX / LFO open sound modules; GLO on Tape opens Mixer.
- PRESETS selects a sound; ALGORITHM selects a track.
- REC arms recording; PLAY starts or stops the sequencer.
- Keyboard: Z/X for OCT-/OCT+, 1-0 for function buttons, Space for PLAY,
  R for REC, arrows for SELECT/ALGORITHM. Click/touch the keys or turn knobs.
- Tap OCT- + OCT+ together to toggle controller mode. Leave this mode
  to hear internal notes; browser hardware MIDI output is not emulated.

See the [firmware guide](https://github.com/dspaudio/orbit/blob/main/GUIDE.md).

## Build and run

Requirements: clang/lld with wasm32 support, Python 3, numpy and Pillow.
No Emscripten or FM-1 vendor SDK is needed.

```sh
ORBIT=../orbit PYTHON=python3 CLANG=clang sh build.sh
for test in orbit-variants orbit-wasm orbit-worklet orbit-engines orbit-lfo \
  orbit-2.4 orbit-refresh orbit-only orbit-delay; do
  node "tests/$test.mjs"
done
python3 -m http.server 8787 --directory dist
```

The source checkout must be clean and match `ORBIT_REVISION`.
Explicit `ORBIT_LOCAL_DEVELOPMENT=1` allows local dirty builds and marks
their metadata accordingly; do not deploy those artifacts. To test work in progress:

```sh
ORBIT=../orbit ORBIT_LOCAL_DEVELOPMENT=1 PYTHON=dist/.venv/bin/python \
  CLANG=/opt/homebrew/opt/llvm/bin/clang sh build.sh
```

Generators use isolated directories, never the native firmware's `build/gen`.
The deployed application lives in `docs/`; copy the generated application
files and the Wasm module there only after verification.

## Storage and limitations

IndexedDB database `sloop-emu`, store `flash`, keeps the Bluetooth build's
image under the existing `image-orbit-0.9.B` key, so 0.9.B and 1.0.B browser
saves carry over to 1.0.1B, which changes no storage format. The sample
builds' `image-orbit` key is neither read, erased nor migrated.
USB audio, USB editor/SysEx communication, user sample upload/CHOP,
Bluetooth and firmware installation are not implemented by the browser HAL.
The battery reading is simulated. Event Tape edits sequencer events, not PCM.
Avoid hardware calibration, which waits for a physical matrix.

Tests cover actual Wasm boot, PCM, panel input, persistence, the preset
inventory, audible melodic presets, real PERC data, the honest Bluetooth
menu and the BT BUFFER setting. They do not prove FM-1 timing, radio load,
stack usage or power-loss recovery.

## Origin and licensing

Forked from [sabliran/sloop-web-emu](https://github.com/sabliran/sloop-web-emu)
at `bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d`; history and notices remain.
The original README is [README-UPSTREAM.md](README-UPSTREAM.md).
ORBIT derives from SLOOP/Felucca. Software is GPL-3.0-only; firmware asset
rights remain in the [source licensing record](https://github.com/dspaudio/orbit/blob/main/LICENSING.md).
