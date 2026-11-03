# ORBIT web emulator

Play and compare **ORBIT 1.0.0** and **ORBIT 1.0.B** using the actual C
firmware compiled to WebAssembly inside an AudioWorklet.

**[Open the emulator](https://dspaudio.github.io/orbit-web-emu/)**

## Compare the sound builds

Choose **Firmware sound**, then press **POWER ON**:

| Version | Module | Sound |
| --- | --- | --- |
| 1.0.0 | `orbit.wasm` | Original melodic samples and full-length delay |
| 1.0.B | `orbit-ble.wasm` | FM melodic replacements and 0.37 s delay; original PERC drums |

Try SAMPLE presets **GRAND PNO**, **VIBES** and **UP BASS** in both versions.
Names and engine IDs are preserved. PIANO uses a 3-operator FM tine voice;
BASS, VIBES, HORNS, STRGS and FLUTE use 2-operator FM; SCRCH uses a
noise/triangle sweep. GRAIN uses the corresponding sources too.
See the [complete replacement list](https://github.com/dspaudio/orbit#sounds-replaced-in-the-bluetooth-build).

Switching version reloads the instrument and stops audio. The default build
keeps the existing ORBIT browser save; 1.0.B keeps the separate save image
used by 0.9.B.
Direct links use `?version=1.0.0` or `?version=1.0.B`. Older firmware names
and unknown versions cannot select SLOOP, Felucca or an old ORBIT module.

This is a **sound comparison**, not a Bluetooth emulator. The 1.0.B
firmware menu reports `FAILED: NO BROWSER RADIO` if Bluetooth is enabled.

## New in 1.0

- **Chord voicings:** OPEN (1, 5, 10), OPEN7 (1, 5, 7, 10), ADD9 and 6TH.
  Changing chords within one arp step continues the arpeggio's pattern.
- **Controller switches and feedback:** in controller mode, EDIT + FX / SEL /
  ENV / LFO switches each button between momentary and toggle. Incoming CCs
  on the controller channel update knob values and toggle indicators.
- **Hardware phone audio:** 1.0.B receives A2DP audio, with a separate level
  on GLO > BT AUDIO when a phone is connected. Its delay is now 0.37 s
  (PING: 0.19 s per side). Bluetooth MIDI and A2DP are not emulated; the
  browser's disconnected BT AUDIO page stays hidden.

Quiet drum GRID editing, the OCT- + OCT+ controller shortcut and hardware
MIDI clock output remain. The browser accepts MIDI channel messages but
does not send MIDI output or follow external clock.

## Firmware and controls

`ORBIT_REVISION` pins the clean release source commit. `build-info.json` records the
actual compiled firmware version, source revision, dirty/development state,
module size and SHA-256 for each build.

The 1.0 modules are built from the clean ORBIT 1.0.0 / 1.0.B release commit
recorded in `ORBIT_REVISION`. The published `build-info.json` reports
`dirty: false` and `local_development: false`.

Both run the real sequencer, synthesis engines, effects, storage readers and
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
node tests/orbit-wasm.mjs dist/orbit-ble.wasm
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
files and both Wasm modules there only after verification.

## Storage and limitations

IndexedDB database `sloop-emu`, store `flash`, keeps `image-orbit` for the
default build and the existing `image-orbit-0.9.B` key for 1.0.B.
Neither build's existing saves are erased or migrated.
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
