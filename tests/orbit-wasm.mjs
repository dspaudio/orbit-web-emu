// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
const path = process.argv[2] || 'dist/orbit.wasm';
const mod = new WebAssembly.Module(fs.readFileSync(path));
assert.equal(WebAssembly.Module.imports(mod).length, 0, 'module is self-contained');
function boot(flash) {
  const e = new WebAssembly.Instance(mod, {}).exports;
  if (flash) new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).set(flash);
  e.emu_init(); e.emu_start(); e.emu_frame();
  return e;
}
const e = boot();
const frame = () => Buffer.from(new Uint8Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240 * 2));
const home = frame();
assert(home.some(v => v !== 0), 'HOME renders');
function pump(blocks) {
  let peak = 0;
  for (let k = 0; k < blocks; k++) {
    e.emu_render(128);
    const a = new Float32Array(e.memory.buffer, e.emu_audio_ptr(), 256);
    for (const v of a) { assert(Number.isFinite(v), 'finite PCM'); peak = Math.max(peak, Math.abs(v)); }
    if (k % 6 === 0) e.emu_frame();
  }
  return peak;
}
function button(id) { e.emu_input(0, 1 << id); pump(12); e.emu_input(0, 0); pump(12); }
button(11); // SEQ
assert(!frame().equals(home), 'sequencer changes the actual framebuffer');
button(8); // HOME
for (const [enc, delta] of [[2, 2], [3, 1], [4, 3], [5, 1]]) { e.emu_enc(enc, delta); pump(12); }
button(0); button(1); // ORBIT COPY/LIFT/DROP panel paths
button(6); // EDIT
assert(!frame().equals(home), 'sound editor renders');
e.emu_input(1 << 7, 0);
const peak = pump(200);
assert(peak > 0.0001, 'real firmware generates non-silent audio');
e.emu_input(0, 0); pump(300);
// Isolate persistence from REC-arm state, which intentionally blocks autosave.
const persistent = boot();
persistent.emu_enc(0, 7); persistent.emu_frame();
for (let k = 0; k < 16000; k++) { persistent.emu_render(128); if (k % 6 === 0) persistent.emu_frame(); }
const flash = new Uint8Array(persistent.memory.buffer, persistent.emu_flash_ptr(), persistent.emu_flash_size()).slice();
assert(persistent.emu_flash_gen() > 0, 'firmware writes persistent storage');
const restored = boot(flash);
const loadedFlash = new Uint8Array(restored.memory.buffer, restored.emu_flash_ptr(), restored.emu_flash_size());
assert.deepEqual(loadedFlash, flash, 'boot preserves the stored flash image');
restored.emu_render(128); restored.emu_frame();
const fb = new Uint8Array(restored.memory.buffer, restored.emu_fb_ptr(), 240 * 240 * 2);
assert(fb.some(v => v !== 0), 'restored instance boots and renders');
fs.writeFileSync('dist/orbit-test-frame.rgb565', Buffer.from(fb));
console.log(JSON.stringify({result:'PASS', moduleBytes:fs.statSync(path).size, audioPeak:peak, flashBytes:flash.length, flashWrites:persistent.emu_flash_gen(), imports:0}));
