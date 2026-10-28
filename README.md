# ORBIT web emulator

Run **ORBIT 0.8.1** in the browser using the actual C firmware compiled to
WebAssembly inside an AudioWorklet.

**Try it online:** https://dspaudio.github.io/orbit-web-emu/

ORBIT 0.8.1 is the only available firmware. There is no firmware selector;
old URL parameters and saved firmware preferences cannot select SLOOP,
Felucca or an older ORBIT version. Existing ORBIT browser storage retains
its namespace.

## Firmware

`ORBIT_REVISION` pins the [ORBIT 0.8.1 source](https://github.com/dspaudio/orbit/tree/514eb60ee5cbd697a11954b9cc333291c0b7f719).
The compiled module contains the real sequencer, synthesis engines,
effects, storage readers and 240-by-240 display renderer. `build-info.json`
records the source revision used for the build.

This update includes SAMPLE retrigger fades, drum voice allocation,
live-held POLY note protection, MIDI overflow recovery, clock averaging
and the 350 ms layer-page hold behavior. The browser MIDI entry now uses
the firmware's queue parser. Hardware-only USB rescue and IRQ behavior
are not emulated.

The default engine registry has 17 engines and 189 factory sounds.
ORP8 projects and OPB3 USER banks use the firmware's compatibility readers.
The optional SLICE engine is not enabled. There is no built-in demo-song
loader: start with an empty project or continue your browser autosave.

## Run locally

The `docs/` directory is the deployed application:

```sh
python3 -m http.server 8787 --directory docs
```

Open http://localhost:8787 and press POWER ON. AudioWorklet requires HTTPS
or localhost; opening the HTML file directly is insufficient.

## Rebuild

Requirements: clang and lld with wasm32 support, Python 3, numpy and
Pillow. Emscripten and the FM-1 vendor SDK are not required.

Use a separate source checkout at the pinned revision:

```sh
git clone https://github.com/dspaudio/orbit ../orbit
git -C ../orbit checkout "$(cat ORBIT_REVISION)"
python3 -m pip install -r ../orbit/requirements.txt
ORBIT=../orbit CLANG=clang ./build.sh
node tests/orbit-wasm.mjs
node tests/orbit-worklet.mjs
node tests/orbit-engines.mjs
node tests/orbit-lfo.mjs
node tests/orbit-2.4.mjs
node tests/orbit-refresh.mjs
node tests/orbit-only.mjs
cp dist/orbit.wasm dist/*.js dist/*.html dist/*.png dist/*.webmanifest dist/build-info.json docs/
```

The build rejects a source checkout whose commit differs from
`ORBIT_REVISION`. Only `orbit.wasm` is deployed; upstream comparison
binaries are not part of this application.

## Controls

- **HOME:** Event Tape; press again for Visualizer.
- **EDIT / ENV / FX / LFO:** synth modules and parameter pages.
- **Track 4 + EDIT:** drum controls. **GLO on Tape:** Mixer.
- **Tape:** KNOB1 sets the head, KNOB2/3 select the region and KNOB4 chooses
  COPY or LIFT. Hold SEL and press OCT- to capture; SEL + OCT+ drops.
- **REC:** arm recording. Play notes, then press REC on the next downbeat
  to close an empty project's free take. **PLAY:** start or stop playback.
- **Layer buttons:** hold for 0.35 seconds, or use a layer control while
  holding to show the layer immediately.
- **LFO:** SOURCE, SYNC and DEST are three separate pages.
- **Computer keys:** Z/X = OCT-/OCT+, 1-0 = FX/SEL/ENV/LFO/EDIT/GLO/HOME/SAVE/ARP/SEQ,
  Space = PLAY, R = REC, arrows = SELECT/ALGORITHM.
- Click or touch the keybed to play. Drag or scroll knobs to change values.

See the [firmware user guide](https://github.com/dspaudio/orbit/blob/v0.8.1/GUIDE.md)
for the full workflow.

## Storage and limitations

Projects, settings and USER presets persist in this browser's IndexedDB
through the firmware's flash-storage implementation. Updating the page
does not intentionally clear the existing ORBIT flash image. Browser
storage is local to the browser/profile and site origin.

The battery icon uses a simulated ADC reading, not the computer's battery.
USB audio, USB editor/SysEx communication, user sample upload/CHOP,
Bluetooth and firmware installation are not implemented by this browser
HAL. Avoid the hardware-calibration screen, which waits for a physical key
matrix. Event Tape edits sequencer events, not recorded PCM audio.

The tests exercise self-contained Wasm boot, finite non-silent PCM,
panel input, recording and playback, flash save/reboot, LFO modulation,
FM6, UI modules, stereo scope taps and the simulated battery. They do not
prove FM-1 hardware timing, stack usage or power-loss recovery.

## Validation, October 28, 2026

- Built with clang/LLD 23.1.3 from the pinned ORBIT 0.8.1 revision.
  The Wasm module is 1,169,639 bytes with no external imports.
- All six firmware/worklet regression programs passed. The former demo
  test now records a real free take, and LFO testing follows SOURCE,
  SYNC and DEST through the actual panel inputs.
- The ORBIT-only frontend regression passed 16 URL/preference
  combinations, power gating and persistent ORBIT flash read/write.
- Local browser checks at 1440px and 390px rendered the real firmware.
  A legacy `?fw=sloop` URL and a saved Felucca preference still loaded
  only ORBIT 0.8.1 without clearing the preference or ORBIT storage.
- Real AudioWorklet output was finite stereo PCM at 44.1 kHz, with a
  measured note peak of 0.461761. The compact layout had no horizontal
  document overflow.

Module SHA-256:

```text
c39e6d378a10b4f4db4996d7f38bd29221a5d1c547c9da2b7ff2a25a3de7a7e3
```

## Origin and licensing

This emulator is forked from
[sabliran/sloop-web-emu](https://github.com/sabliran/sloop-web-emu) at
`bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d`; its history and notices are
retained. The original README is preserved in
[README-UPSTREAM.md](README-UPSTREAM.md).

ORBIT derives from SLOOP/Felucca. Software is GPL-3.0-only; existing
firmware asset notices and rights remain in the
[source repository](https://github.com/dspaudio/orbit/blob/v0.8.1/LICENSING.md).
