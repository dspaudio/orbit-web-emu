// SPDX-License-Identifier: GPL-3.0-only
// ORBIT 0.8.2 delay TYPE through the real panel: FX > KNOB3 raises the track's delay send, SELECT walks to
// DLY 2, KNOB1 picks the TYPE. The same note is rendered under MONO and PING and the stereo side (L - R)
// of the real output compared: PING must put the echoes to the sides, MONO keeps them in the middle.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod = new WebAssembly.Module(fs.readFileSync('dist/orbit.wasm'));
function run(type) {
  const e = new WebAssembly.Instance(mod, {}).exports;
  const frame = () => new Uint16Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240).slice();
  e.emu_init(); e.emu_start(); e.emu_frame();
  const pump = (n, acc) => {
    for (let i = 0; i < n; i++) {
      e.emu_render(128);
      if (acc) {
        const a = new Float32Array(e.memory.buffer, e.emu_audio_ptr(), 256);
        for (let k = 0; k < 128; k++) { acc.side += Math.abs(a[2 * k] - a[2 * k + 1]); acc.all += Math.abs(a[2 * k]) + Math.abs(a[2 * k + 1]); }
      }
      if (i % 6 === 0) e.emu_frame();
    }
  };
  const button = id => { e.emu_input(0, 1 << id); pump(12); e.emu_input(0, 0); pump(12); };
  const enc = (id, steps) => { e.emu_enc(id, steps); pump(12); };
  button(2);                                   // FX: the track's sends
  enc(4, 127);                                 // KNOB3: DLY send all the way up
  for (let p = 0; p < 6; p++) enc(0, 1);       // SELECT: FILTER, SLICER, INSERT, INSERT 2, DLY, DLY 2
  const page = frame();
  enc(2, type);                                // KNOB1: TYPE (0 MONO, 2 PING)
  const shown = frame();
  const acc = { side: 0, all: 0 };
  e.emu_input(1 << 7, 0); pump(40, acc); e.emu_input(0, 0);   // a key held ~0.1 s, then the echoes
  pump(700, acc);
  return { page, shown, ...acc };
}
const mono = run(0), ping = run(2);
assert(mono.all > 1 && ping.all > 1, 'the note and its echoes sound');
assert.deepEqual(mono.page, ping.page, 'both reach the same DLY 2 page');
assert.notDeepEqual(ping.shown, ping.page, 'KNOB1 changes the TYPE shown on DLY 2');
assert(ping.side > 4 * mono.side + 1, `PING widens the real output (side ${ping.side.toFixed(1)} vs MONO ${mono.side.toFixed(1)})`);
console.log(JSON.stringify({ result: 'PASS', monoSide: +mono.side.toFixed(2), pingSide: +ping.side.toFixed(2) }));
