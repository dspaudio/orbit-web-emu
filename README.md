# ORBIT web emulator

Play and compare **ORBIT 0.9.0** and **ORBIT 0.9.B** using the actual C
firmware compiled to WebAssembly inside an AudioWorklet.

**[Open the emulator](https://dspaudio.github.io/orbit-web-emu/)**

## Compare the sound builds

Choose **Firmware sound**, then press **POWER ON**:

| Version | Module | Sound |
| --- | --- | --- |
| 0.9.0 | `orbit.wasm` | Original melodic samples and full-length delay |
| 0.9.B | `orbit-ble.wasm` | FM melodic replacements and shorter delay; original PERC drums |

Try SAMPLE presets **GRAND PNO**, **VIBES** and **UP BASS** in both versions.
Names and engine IDs are preserved. PIANO uses a 3-operator FM tine voice;
BASS, VIBES, HORNS, STRGS and FLUTE use 2-operator FM; SCRCH uses a
noise/triangle sweep. GRAIN uses the corresponding sources too.
See the [complete replacement list](https://github.com/dspaudio/orbit#sounds-replaced-in-the-bluetooth-build).

Switching version reloads the instrument and stops audio. The default build
keeps the existing ORBIT browser save; 0.9.B uses a separate save image.
Direct links use `?version=0.9.0` or `?version=0.9.B`. Older firmware names
and unknown versions cannot select SLOOP, Felucca or an old ORBIT module.

This is a **sound comparison**, not a Bluetooth emulator. The 0.9.B
firmware menu reports `FAILED: NO BROWSER RADIO` if Bluetooth is enabled.

## Firmware and controls

`ORBIT_REVISION` pins the source commit. `build-info.json` records the
actual compiled firmware version, source revision, dirty/development state,
module size and SHA-256 for each build.

Both run the real sequencer, synthesis engines, effects, storage readers and
240-by-240 display. There are 17 engines and 189 factory sounds, with ORP8
projects and OPB3 USER banks. Optional SLICE is disabled.

- HOME returns to Event Tape; the old visualizer is removed.
- EDIT / ENV / FX / LFO open sound modules; GLO on Tape opens Mixer.
- PRESETS selects a sound; ALGORITHM selects a track.
- REC arms recording; PLAY starts or stops the sequencer.
- Keyboard: Z/X for OCT-/OCT+, 1-0 for function buttons, Space for PLAY,
  R for REC, arrows for SELECT/ALGORITHM. Click/touch the keys or turn knobs.
- ENV + LFO held for two seconds toggles controller mode. Leave this mode
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
node tests/orbit-wasm.mjs dist/orbit-ble.wasm
python3 -m http.server 8787 --directory dist
```

The source checkout must be clean and match `ORBIT_REVISION`.
Explicit `ORBIT_LOCAL_DEVELOPMENT=1` allows local dirty builds and marks
their metadata accordingly; do not deploy those artifacts.
Generators use isolated directories, never the native firmware's `build/gen`.
The deployed application lives in `docs/`; copy the generated application
files and both Wasm modules there only after verification.

## Storage and limitations

IndexedDB database `sloop-emu`, store `flash`, keeps `image-orbit` for the
default build and `image-orbit-0.9.B` for the alternate build.
Existing default saves are not erased or migrated.
USB audio, USB editor/SysEx communication, user sample upload/CHOP,
Bluetooth and firmware installation are not implemented by the browser HAL.
The battery reading is simulated. Event Tape edits sequencer events, not PCM.
Avoid hardware calibration, which waits for a physical matrix.

Tests cover actual Wasm boot, PCM, panel input, persistence, matching preset
inventories, distinct melodic output and byte-identical PERC data.
They do not prove FM-1 timing, radio load, stack usage or power-loss recovery.

## Origin and licensing

Forked from [sabliran/sloop-web-emu](https://github.com/sabliran/sloop-web-emu)
at `bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d`; history and notices remain.
The original README is [README-UPSTREAM.md](README-UPSTREAM.md).
ORBIT derives from SLOOP/Felucca. Software is GPL-3.0-only; firmware asset
rights remain in the [source licensing record](https://github.com/dspaudio/orbit/blob/main/LICENSING.md).
