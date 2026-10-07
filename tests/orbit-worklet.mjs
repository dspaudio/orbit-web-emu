// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let Processor;
class Port { postMessage() {} }
class AudioWorkletProcessor { constructor() { this.port = new Port(); } }
vm.runInNewContext(fs.readFileSync('web/worklet.js', 'utf8'), {
  AudioWorkletProcessor, WebAssembly, Float32Array, Uint8Array, Uint16Array,
  registerProcessor: (name, implementation) => { Processor = implementation; },
});
const p = new Processor({processorOptions:{wasmBytes:fs.readFileSync('dist/orbit.wasm')}});
const send = data => p.port.onmessage({data});
const screen = () => Buffer.from(new Uint8Array(p.e.memory.buffer,p.e.emu_fb_ptr(),240*240*2));
const pump = n => { for(let i=0;i<n;i++) { const out=[[new Float32Array(128),new Float32Array(128)]]; assert(p.process([],out)); for(const ch of out[0]) assert(ch.every(Number.isFinite)); } };
send({t:'start'}); pump(18); const home=screen();
send({t:'input',notes:0,buttons:1<<9});
send({t:'input',notes:0,buttons:0});
assert.equal(p.buttonQueue.length,2,'press and release remain distinct');
pump(24);
assert.equal(p.inputButtons,0); assert.equal(p.buttonQueue.length,0);
assert(!screen().equals(home),'a short SAVE tap opens the preset browser');
const browser=screen(); send({t:'enc',e:6,steps:1}); pump(12);
assert(!screen().equals(browser),'PRESETS detent updates the browser');
send({t:'input',notes:1<<7,buttons:0}); pump(12);
send({t:'input',notes:0,buttons:0}); pump(12);
console.log('ORBIT AudioWorklet quick-tap / preset input: PASS');
