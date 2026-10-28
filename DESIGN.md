# ORBIT Web Emulator

## 1. Identity
The frontend targets only ORBIT 0.8.1 at source revision `514eb60ee5cbd697a11954b9cc333291c0b7f719`. Keep the FM-1 faceplate and real C display. Always load `orbit.wasm`; legacy URL parameters and stored firmware choices have no effect. SLOOP/Felucca remain source and licensing credits, not selectable firmware.

## 2. Color
The K1-K4 pointers use `#287cff`, `#1ecc70`, `#ffffff` and `#ff621a`. The firmware C palette controls the display's PASTEL, NEON and monochrome settings.

## 3. Type
Keep the existing monospace UI. Only the `Orbit` wordmark uses system sans-serif at weight 100, distinct from the version and physical key labels. UI and public documentation remain English.

## 4. Layout
Keep the existing 963 x 588 panel coordinates and `fitDevice` responsive behavior. The 240 x 240 display is the actual WebAssembly framebuffer. Remove the firmware switcher without moving the physical controls or redesigning the shell.

## 5. Controls
The primary action is POWER ON. Priorities are the real display, playable panel controls, then the manual. Reuse `.cap`, `.btn`, the keybed and POWER; encoder, tap, hold and pressed states must retain their real worklet inputs.

HOME alternates Event Tape and Visualizer. EDIT / ENV / FX / LFO open sound pages; GLO on Tape opens Mixer. Tape capture/drop uses SEL + OCT-/OCT+; plain OCT controls retain octave and drum behavior. On track 4, EDIT/SEQ opens DRUMS with GRID/KIT. MACROS and PERFORM belong to the synth EDIT family. The manual follows the source `GUIDE.md` and `README.md` at the revision above. There is no built-in demo menu; an earlier autosave may still contain patterns.

## 6. Motion and Power
Keep knob rotation and LCD updates. The AudioContext, firmware load and sound start behind POWER ON, through the existing AudioWorklet and splash timing.

## 7. Surface and Persistence
Keep the existing shell, knob and bezel materials and depth. Add no decorative controls. Preserve IndexedDB database `sloop-emu`, store `flash` and key `image-orbit`; do not rename, clear or migrate browser data. Retain the internal `sloop` worklet processor name for compatibility with `worklet.js`. Use asset cache key `0.8.1-514eb60`.

## 8. Verification and Limits
The focused frontend test exercises legacy URL/stored choices, the POWER gate and ORBIT flash read/write without building Wasm. It is not browser QA. The lead owns Wasm integration and browser checks at 390px touch and 1440px desktop, including boot, display, panel input, audio and persistence. The existing dark-only shell and physical-panel accessibility constraints remain outside this update's redesign scope. Browser verification does not establish FM-1 hardware behavior or timing.
