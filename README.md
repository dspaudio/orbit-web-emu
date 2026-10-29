# ORBIT web emulator

Run **ORBIT 0.8.2** in the browser using the actual C firmware compiled to
WebAssembly inside an AudioWorklet.

**Try it online:** https://dspaudio.github.io/orbit-web-emu/

ORBIT 0.8.2 is the only available firmware. There is no firmware selector;
old URL parameters and saved firmware preferences cannot select SLOOP,
Felucca or an older ORBIT version. Existing ORBIT browser storage retains
its namespace.

## Firmware

`ORBIT_REVISION` pins the [ORBIT 0.8.2 source](https://github.com/dspaudio/orbit/tree/5824b5b8be65f2c54fcb1087ef869101708a90e3).
The compiled module contains the real sequencer, synthesis engines,
effects, storage readers and 240-by-240 display renderer. `build-info.json`
records the source revision used for the build.

This update adds the delay **TYPE** (FX > DLY 2: MONO, WIDE or PING) and
the 0.8.2 memory changes. The full-screen visualizer is gone: HOME on Tape
stays on Tape. Earlier 0.8.1 behavior (SAMPLE retrigger fades, drum voice
allocation, live-held POLY protection, MIDI overflow recovery, clock
averaging, 350 ms layer pages) is unchanged. The browser MIDI entry uses
the firmware's queue parser. Hardware-only USB rescue and IRQ behavior are
not emulated.

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
node tests/orbit-delay.mjs
cp dist/orbit.wasm dist/*.js dist/*.html dist/*.png dist/*.webmanifest dist/build-info.json docs/
```

The build rejects a source checkout whose commit differs from
`ORBIT_REVISION`. Only `orbit.wasm` is deployed; upstream comparison
binaries are not part of this application.

## Controls

- **HOME:** Event Tape (0.8.2 has no visualizer).
- **EDIT / ENV / FX / LFO:** synth modules and parameter pages. FX > DLY 2
  sets the delay TYPE.
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

See the [firmware user guide](https://github.com/dspaudio/orbit/blob/v0.8.2/GUIDE.md)
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
FM6, UI modules, the delay TYPE's stereo output and the simulated battery. They do not
prove FM-1 hardware timing, stack usage or power-loss recovery.

## Validation, October 29, 2026

- Built with clang/LLD 23.1.3 from the pinned ORBIT 0.8.2 revision.
  The Wasm module is 1,135,338 bytes with no external imports.
- All eight firmware/worklet/frontend regression programs passed,
  including the new `orbit-delay.mjs`: through the real panel (FX, KNOB3
  send, SELECT to DLY 2, KNOB1), PING spreads the same note's echoes to the
  sides of the real output while MONO keeps them centred. HOME on Tape
  stays on Tape.
- The ORBIT-only frontend regression passed 16 URL/preference
  combinations, power gating and persistent ORBIT flash read/write.
- Headless WebKit at 1440px powered on the page (AudioWorklet running),
  reached FX > DLY 2 and showed TYPE PING; at 390px the page fitted
  without horizontal overflow.

Module SHA-256:

```text
406d0bb82cfc44dc205f41574012109f34ad32b7f840da66a06e93f1f4e04ec4
```

## Origin and licensing

This emulator is forked from
[sabliran/sloop-web-emu](https://github.com/sabliran/sloop-web-emu) at
`bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d`; its history and notices are
retained. The original README is preserved in
[README-UPSTREAM.md](README-UPSTREAM.md).

ORBIT derives from SLOOP/Felucca. Software is GPL-3.0-only; existing
firmware asset notices and rights remain in the
[source repository](https://github.com/dspaudio/orbit/blob/v0.8.2/LICENSING.md).
