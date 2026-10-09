# ORBIT web emulator

A fork of [sabliran/sloop-web-emu](https://github.com/sabliran/sloop-web-emu) that runs the actual [ORBIT FM-1 firmware](https://github.com/dspaudio/orbit) as WebAssembly inside an AudioWorklet.

**ORBIT 0.4.0 is the default firmware.** SLOOP and Felucca remain available as the original upstream comparison binaries. Use the firmware selector at the top left to switch. Each firmware has its own locally stored flash image.

**Try it online:** https://dspaudio.github.io/orbit-web-emu/

![Independent ORBIT engines](https://raw.githubusercontent.com/dspaudio/orbit/main/docs/orbit-engines-0.3.png)

## ORBIT 0.4.0

FM6, 12종 Visualizer 및 컬러 스타일을 지원합니다. HOME을 길게 눌러 SCREEN 메뉴를 열고 KNOB1 / STYLE로 ORBIT, PASTEL, NEON, MONO 또는 단색 테마를 선택합니다. OCT−로 닫으면 로컬 플래시에 저장됩니다. HOME에서 SAVE를 누르면 SONG이 열리며 EDIT 화면에서 SAVE를 누르면 PRESETS가 열립니다.

## Run the compiled emulator

The `docs/` directory contains the compiled module and static application. Serve it locally:

```sh
python3 -m http.server 8787 --directory docs
```

Open http://localhost:8787 and press POWER to start audio. AudioWorklet requires HTTPS or localhost; opening the HTML file directly is insufficient.

## Rebuild ORBIT

Requirements: clang + lld with wasm32 support, Python 3, numpy and Pillow. No Emscripten or FM-1 vendor SDK is needed for this browser build.

```sh
git clone https://github.com/dspaudio/orbit ../orbit
git -C ../orbit checkout "$(cat ORBIT_REVISION)"
python3 -m pip install -r ../orbit/requirements.txt
ORBIT=../orbit ./build.sh
node tests/orbit-wasm.mjs
node tests/orbit-worklet.mjs
node tests/orbit-engines.mjs
node tests/orbit-lfo.mjs
node tests/orbit-2.4.mjs
cp dist/*.wasm dist/*.js dist/*.html dist/*.png dist/*.webmanifest dist/build-info.json docs/
```

`ORBIT_REVISION` pins the published source revision. `build-info.json` records the checkout used for the build. The original comparison binaries are copied from the fork's `docs/` directory and are not rebuilt by this command.

## Independent engines and demo song

ORBIT 0.3.0 adds independently written SWARM, PULSE and FM4 engines with twelve original patches. Fresh/empty projects use the new engines; saved projects keep their stored engine IDs. The first twelve PRESETS entries are ORBIT sounds. The original upstream engines remain available for compatibility.

To load the editable **FIRST LIGHT** demo, stop playback, hold HOME, turn SELECT to SYSTEM, scroll PRESETS to DEMO SONG, then press OCT+ twice. The first press shows AGAIN; OCT− cancels. Press PLAY after loading. The demo replaces the current working project and is subject to normal autosave, so save work first. It does not write numbered saved project slots. The four-bar, 108 BPM loop combines FM4 bass, SWARM chord sustains, PULSE plucks and synthesised 808 drums.

[Listen to FIRST LIGHT](https://github.com/dspaudio/orbit/blob/main/docs/audio/orbit-first-light.mp3) · [Engine feasibility and limits](https://github.com/dspaudio/orbit/blob/main/docs/OP1-ENGINES.md)

These engines are original implementations of publicly documented synthesis families, not OP-1 algorithm ports or factory sounds. Shared envelopes, FX, voice scheduling, drums and sampler infrastructure remain derived from SLOOP/Felucca.

## LFO source and modulation depths (0.3.1)

Press LFO to open **LFO SOURCE 1/2**: RATE, WAVE, PHS and FADE define the modulation signal. Press LFO again for **LFO DEST 2/2**: PIT, FLT, SHP and AMP determine where it changes the sound and by how much. All four depths at zero means no audible modulation; SOURCE displays `NO DEPTH: PRESS LFO`.

For a clear test, set DEST KNOB4 / AMP to about 50%, hold a note, then adjust SOURCE RATE/WAVE. PHS sets a new phrase's starting phase; release all keys and retrigger. FADE gradually introduces modulation after retrigger. SHP controls SWARM harmonic balance, PULSE width and FM4 operator modulation depth. No destination is automatically enabled, so original patch defaults remain unchanged.

The new wasm regression test presses the actual LFO button twice, changes each physical destination knob and compares finite PCM for all three engines; all twelve engine/destination combinations change the output.

## Input corrections

HOME now briefly displays the engine and actual loaded preset when PRESETS is turned. The preset bank selects individual sounds; all 80 factory mappings resolve. Short button presses are queued across firmware UI frames, so fast SAVE/EDIT/SEQ taps are recognised. The AudioWorklet regression test checks a rapid SAVE press/release followed by a preset detent.

## ORBIT controls

- HOME: event Tape. KNOB1 sets the head; KNOB2/3 set the inclusive start/end; KNOB4 selects COPY or LIFT.
- OCT−: copy/lift the selection. OCT+: drop at the head, overwriting existing events. ALGORITHM selects the track.
- EDIT / ENV / GLO / SEQ: synth / envelope / mixer / step sequencer.
- Click the keybed to play. PLAY and REC use the existing transport and live recording.
- Computer keys: Z/X = OCT−/OCT+, 1–0 = FX/SCL/ENV/LFO/EDIT/GLO/HOME/SAVE/ARP/SEQ, Space = PLAY, R = REC, arrows = SELECT/ALGORITHM.
- Knobs accept mouse drag or scroll. MIDI keyboard input uses the upstream emulator's mapping.

## Validation and progress

- ORBIT 0.4.0: clang/LLD 23.1.3 빌드 및 Node 회귀 검사 5개 통과.
- 12종 프리셋과 FIRST LIGHT 메뉴/확인/PLAY 검증 통과. demo peak 0.780365.
- WebAssembly 크기 1,132,268바이트, 외부 import 0개. 실제 합성 PCM은 유한하고 음량 peak 0.575165.
- 플래시 458,752바이트, 저장 17회. 저장 이미지를 넣은 재부팅 검증 통과.
- SWARM/PULSE/FM4의 LFO 목적지 12개, FM6 프리셋 8개 발음, MONO 설정 재부팅 복원, Visualizer 선택 검증 통과.
- Published ORBIT 0.3.0 browser AudioWorklet boot and quick SAVE tap into the 80-sound PRESETS list: verified. Versioned asset URLs prevent stale JavaScript/DSP caches.

![Published ORBIT 0.3.0 preset list](docs/orbit-web-presets.jpg)

![Actual ORBIT WebAssembly HOME framebuffer](docs/orbit-wasm-home.png)

## Test scope and limitations

The WebAssembly smoke test checks boot and framebuffer rendering, panel and encoder input, sequencer and editor screens, non-silent finite PCM, isolated autosave writes and reboot with a restored flash image. These checks run the compiled ORBIT C engine; they do not establish real FM-1 boot safety, memory budget or IRQ timing.

Browser projects and settings save locally in IndexedDB. USB audio, SysEx/editor communication and user sample upload/CHOP are not implemented in the emulator HAL. Bluetooth pairing/audio is not implemented. Avoid the hardware calibration screen, which can stall the worklet. The divide-by-zero trap mitigation belongs to the hardware HAL and cannot be validated by this browser HAL.

ORBIT Tape stores note and drum events, rather than long recorded PCM audio. See the [firmware README](https://github.com/dspaudio/orbit) for source screenshots, progress and hardware build instructions.

## Origin and licensing

The emulator is forked from `sabliran/sloop-web-emu` at `bbfd8e5b3bfc452520f61afb0d94e2fdfe93fd9d`; its history and notices are retained. The original README is preserved in [README-UPSTREAM.md](README-UPSTREAM.md). ORBIT derives from SLOOP/Felucca. Software is GPL-3.0-only; firmware asset notices remain in the linked source repository.
