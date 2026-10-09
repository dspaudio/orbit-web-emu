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
const frame=()=>Buffer.from(new Uint8Array(e.memory.buffer,e.emu_fb_ptr(),115200));
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
e.emu_input(0,1<<8);pump(420);e.emu_input(0,0);pump(12); // hold HOME, actual menu
const menu=frame();
for(let i=0;i<3;i++){e.emu_enc(0,1);pump(12);} // SYSTEM 메뉴
for(let i=0;i<2;i++){e.emu_enc(6,1);pump(12);} // DEMO SONG
btn(1); const armed=frame(); assert(!armed.equals(menu),'demo confirmation renders');
btn(1); const loaded=frame(); assert(!loaded.equals(armed),'demo loads and returns HOME');
btn(12); // PLAY
const peak=pump(4200);assert(peak>0.01,'demo sequencer has non-silent audio');
btn(12);
console.log(JSON.stringify({result:'PASS',newPresetPeaks:peaks,demoPeak:peak}));
