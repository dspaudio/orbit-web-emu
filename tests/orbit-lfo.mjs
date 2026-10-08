// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod=new WebAssembly.Module(fs.readFileSync('dist/orbit.wasm'));
function render(bank,destination) {
  const e=new WebAssembly.Instance(mod,{}).exports;
  e.emu_init();e.emu_start();
  function pump(n,pcm) {
    for(let k=0;k<n;k++) {
      e.emu_render(128);
      if(pcm)for(const v of new Float32Array(e.memory.buffer,e.emu_audio_ptr(),256)) {
        assert(Number.isFinite(v));pcm.push(v);
      }
      if(k%6===0)e.emu_frame();
    }
  }
  function btn(id){e.emu_input(0,1<<id);pump(12);e.emu_input(0,0);pump(12);}
  e.emu_enc(6,bank-10);pump(24);
  btn(5);btn(5); // physical LFO twice: source -> destinations
  for(let i=0;i<4;i++){e.emu_enc(2+i,destination===i?40:0);pump(12);}
  e.emu_input(1<<7,0);
  const pcm=[];pump(700,pcm);return pcm;
}
const results=[];
for(const [name,bank] of [['SWARM',0],['PULSE',4],['FM4',8]]) {
  const dry=render(bank,-1);
  for(let d=0;d<4;d++) {
    const wet=render(bank,d);let sum=0;
    for(let i=20000;i<dry.length;i++){const delta=wet[i]-dry[i];sum+=delta*delta;}
    const rms=Math.sqrt(sum/(dry.length-20000));assert(rms>0.0001,`${name} destination ${d} changes real wasm PCM`);
    results.push({engine:name,destination:['PIT','FLT','SHP','AMP'][d],differenceRms:rms});
  }
}
console.log(JSON.stringify({result:'PASS',actualPanelLfoDestinations:results}));
