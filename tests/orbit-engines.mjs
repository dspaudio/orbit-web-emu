// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod = new WebAssembly.Module(fs.readFileSync('dist/orbit.wasm'));
const e = new WebAssembly.Instance(mod, {}).exports;
e.emu_init(); e.emu_start();
function pump(n) {
  let peak=0;
  for(let i=0;i<n;i++) {
    e.emu_render(128);
    for(const s of new Float32Array(e.memory.buffer,e.emu_audio_ptr(),256)) {
      assert(Number.isFinite(s)); peak=Math.max(peak,Math.abs(s));
    }
    if(i%6===0)e.emu_frame();
  }
  return peak;
}
function btn(id) {e.emu_input(0,1<<id);pump(12);e.emu_input(0,0);pump(12);}
// Default track 0 is ORBIT ROUND, bank item 10. Go to first new sound.
e.emu_enc(6,-10);pump(30);
const peaks=[];
for(let p=0;p<12;p++) {
  if(p){e.emu_enc(6,1);pump(30);}
  e.emu_input(1<<7,0);peaks.push(pump(180));e.emu_input(0,0);pump(400);
  assert(peaks[p]>0.001,`ORBIT preset ${p} generates audio`);
}
btn(8); // HOME
// ORBIT 0.8.1 has no built-in demo: record a real free take through panel inputs.
btn(13); // REC
e.emu_input(1<<7,0);pump(200);
e.emu_input(0,0);pump(150);
e.emu_input(1<<11,0);pump(200);
e.emu_input(0,0);pump(150);
btn(13); // close the free take and begin loop playback
const peak=pump(4200);assert(peak>0.01,'recorded sequencer loop has non-silent audio');
btn(12);
console.log(JSON.stringify({result:'PASS',newPresetPeaks:peaks,recordedLoopPeak:peak}));
