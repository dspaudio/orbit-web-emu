# SLOOP web emulator

A browser emulator of the [SLOOP](https://github.com/isod89/sloop-fm1) groovebox
firmware for the M-VAVE FM-1 — in the spirit of groove-os.com/emu, but running
SLOOP. The **unmodified firmware sources** (GPL-3.0, by Leo Kuroshita /
Hügelton Instruments, SLOOP by isod89) are compiled to WebAssembly with a
browser HAL in place of the FM-1 hardware. No synth re-implementation: the
sound, sequencer, screens, layers and LEDs are the firmware's own code.

## How it works

```
src/sloop_wasm.c        the web "felucca.c": a browser HAL (time, input, ADC,
                        an ST7789 panel model, audio stubs) + the firmware
                        sources included in the same order as on hardware
web/worklet.js          the wasm runs INSIDE an AudioWorklet: process() pulls
                        mix_block() for glitch-free audio; a UI frame runs
                        every ~17 ms and posts framebuffer + LED state out
web/emu.js              faceplate: screen canvas, knobs, buttons, keybed,
                        computer-keyboard + MIDI input, LED glow
web/index.html          the device skin
```

- The LCD is emulated at the panel-protocol level (CASET/RASET/RAMWR), so the
  firmware's own `lcd.c`/`gfx.c` draw every pixel.
- Input goes straight into the debounced `fm1_in` state the firmware reads;
  encoder detents arrive as steps.
- 44.1 kHz fixed-point DSP, as on the device. No floats anywhere.
- Like the hardware with no flash: nothing is kept over a reload
  (`FELUCCA_FLASH 0`; persistence via IndexedDB is a natural next step).

## Build

Needs system `clang` + `lld` (wasm32 target — no emscripten), `python3`
(+ numpy) for the firmware's generated tables, and the SLOOP sources:

```sh
git clone https://github.com/isod89/sloop-fm1 ~/Projects/sloop-fm1
cd ~/Projects/sloop-fm1 && mkdir -p build/gen
for g in font icons tables samples drumkits logo; do
    python3 tools/gen_$g.py build/gen/$( [ $g = logo ] && echo sloop_logo.h || echo felucca_$g.h ); done

cd ~/Projects/sloop-web-emu
./build.sh                  # SLOOP=/path/to/sloop-fm1 to override
cd dist && python3 -m http.server 8787
# open http://localhost:8787
```

## Controls

- middle keyboard row = white keys from C4, top row = black keys
- `Z`/`X` OCT−/OCT+, `1`–`0` = FX SCL ENV LFO EDIT GLO HOME SAVE ARP SEQ,
  `Space` PLAY, `R` REC, `↑↓` SELECT, `←→` ALGORITHM, `[` `\` PRESETS
- knobs: mouse drag or scroll; buttons/keys: click or touch (multi-touch ok)
- a connected MIDI keyboard plays in (channels as on hardware: 1–3 synths,
  10 drums)

## Known gaps / next steps

- No persistence yet: wire the firmware's flash API (`FELUCCA_FLASH 1` +
  `storage.c`) to a RAM image synced to IndexedDB → projects, autosave and
  user presets survive reloads, and the web-editor backup format works.
- The HARDWARE CALIBRATION screen (hold OCT− + OCT+ at power-on) busy-waits
  on the key matrix and would stall the audio thread — don't enter it.
- Audio capture/USB-audio, the SysEx web editor, and sample upload (CHOP) are
  stubbed out.
- Faceplate is an approximation; measurements from the real device would make
  a nicer skin.

## License

GPL-3.0-only, as the firmware it embeds.
