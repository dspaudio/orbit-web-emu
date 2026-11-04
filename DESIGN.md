# ORBIT Web Emulator

## 1. Identity
The frontend offers ORBIT 1.0.1B (`orbit-ble.wasm`), the Bluetooth build, as its only firmware. Keep the FM-1 faceplate and real C display. There is no version selector: `?version=` and legacy firmware preferences are ignored, and nothing selects SLOOP/Felucca, the sample-based 1.0.0 or older ORBIT versions.

## 2. Color
The K1-K4 pointers use `#287cff`, `#1ecc70`, `#ffffff` and `#ff621a`. The firmware C palette controls the display's PASTEL, NEON and monochrome settings.

## 3. Type
Keep the existing monospace UI. Only the `Orbit` wordmark uses system sans-serif at weight 100, distinct from the version and physical key labels. UI and public documentation remain English.

## 4. Layout
Layout: one document scroller, the title above the existing 963 x 588 panel; retain `fitDevice` responsive behavior, which fills the compact viewport now that no selector strip is reserved. The 240 x 240 display is the actual WebAssembly framebuffer. Do not move individual physical controls or redesign the shell.

## 5. Controls
The primary action is POWER ON. Priorities are the real display, playable panel controls, then the manual. Reuse `.cap`, `.btn`, the keybed and POWER; encoder, tap, hold and pressed states must retain their real worklet inputs.

HOME returns to Event Tape; the visualizer is removed. EDIT / ENV / FX / LFO open sound pages; GLO on Tape opens Mixer. Tape capture/drop uses SEL + OCT-/OCT+; plain OCT controls retain octave and drum behavior. On track 4, EDIT/SEQ opens DRUMS with GRID/KIT. MACROS and PERFORM belong to the synth EDIT family. The manual follows the pinned source's `GUIDE.md` and `README.md`. There is no built-in demo menu; an earlier autosave may still contain patterns.

## 6. Motion and Power
Keep knob rotation and LCD updates. The AudioContext, firmware load and sound start behind POWER ON, through the existing AudioWorklet and splash timing.

## 7. Surface and Persistence
Keep the existing shell, knob and bezel materials and depth. Preserve IndexedDB database `sloop-emu`, store `flash` and the Bluetooth build's save key `image-orbit-0.9.B`, which 0.9.B, 1.0.B and 1.0.1B share; the sample builds' `image-orbit` key is left untouched. POWER ON remains required. Retain the internal `sloop` worklet processor name. Use asset cache key `1.0.1B`.

## 8. Verification and Limits
The focused frontend test exercises legacy URL/stored choices (all opening the one build), the POWER gate, the single cache key and ORBIT flash read/write without building Wasm. It is not browser QA. The lead owns Wasm integration and browser checks at 390px touch and 1440px desktop, including boot, display, panel input, audio and persistence. The existing dark-only shell and physical-panel accessibility constraints remain outside this update's redesign scope. Browser verification does not establish FM-1 hardware behavior or timing.
