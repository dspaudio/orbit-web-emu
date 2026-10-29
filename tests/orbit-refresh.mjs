// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod = new WebAssembly.Module(fs.readFileSync('dist/orbit.wasm'));
function boot() {
  const e = new WebAssembly.Instance(mod, {}).exports;
  const frame = () => new Uint16Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240).slice();
  e.emu_init();
  assert(frame().some(v => v !== 0), '실제 부트 화면');
  e.emu_start(); e.emu_frame();
  function pump(n) {
    for (let i = 0; i < n; i++) {
      e.emu_render(128);
      if (i % 6 === 0) e.emu_frame();
    }
  }
  function button(id) { e.emu_input(0, 1 << id); pump(12); e.emu_input(0, 0); pump(12); }
  function enc(id, steps) { e.emu_enc(id, steps); pump(12); }
  return {e, frame, pump, button, enc};
}
function stripWhite(fb, cell) {
  let n = 0;
  for (let y = 20; y < 36; y++) for (let x = 8 + cell * 58; x < 64 + cell * 58; x++) n += fb[y * 240 + x] === 0xffff;
  return n;
}
const t = boot();
for (const [button, cell] of [[6, 0], [4, 1], [2, 2]]) {
  t.button(button);
  const fb = t.frame();
  assert(stripWhite(fb, cell) > 0, '활성 sound 모듈 표시');
  for (let other = 0; other < 4; other++) if (other !== cell) assert.equal(stripWhite(fb, other), 0, '비활성 모듈 표시');
}
t.button(5); t.button(5); t.enc(5, 30); t.button(5);
assert(stripWhite(t.frame(), 3) > 0, 'depth가 있는 LFO SOURCE의 T4 표시');
t.button(8); t.button(7);
const levels = t.frame();
t.enc(2, -20);
const edited = t.frame();
let changed = 0;
for (let y = 40; y < 150; y++) for (let x = 0; x < 60; x++) changed += levels[y * 240 + x] !== edited[y * 240 + x];
assert(changed > 0, 'KNOB1이 첫 트랙의 실제 fader를 변경');
for (let y = 40; y < 150; y++) for (let x = 60; x < 240; x++) assert.equal(levels[y * 240 + x], edited[y * 240 + x], '다른 세 fader는 유지');
t.enc(0, 1);
const pans = t.frame();
t.enc(3, 20);
assert.notDeepEqual(t.frame(), pans, 'PAN 페이지 KNOB2가 실제 pan 마커를 변경');
t.enc(0, 1);
const track = t.frame();
assert.notDeepEqual(track, pans, '기존 TRACK 페이지에 접근');
t.enc(0, -9);
assert.notDeepEqual(t.frame(), track, 'LEVEL 페이지로 복귀');

// ORBIT 0.8.2: the visualizer is gone; HOME on Tape stays on Tape, and MASTER 0 still silences the real output.
const s = boot();
s.button(2);
for (let enc = 2; enc < 6; enc++) s.enc(enc, -127);
s.button(8); s.button(7); s.enc(0, 1); s.enc(2, 127);
s.button(8);
const tape = s.frame(); s.button(8);
assert.deepEqual(s.frame(), tape, 'HOME on Tape stays on Tape (no visualizer)');
s.e.emu_adc_set(4, 0); s.e.emu_input(1 << 7, 0); s.pump(240);
const audio = new Float32Array(s.e.memory.buffer, s.e.emu_audio_ptr(), 256);
assert(audio.every(v => v === 0), 'MASTER 0의 실제 출력은 무음');
// ORBIT 상단 우측 배터리: Tape, sound, mixer 헤더의 실제 framebuffer 픽셀을 확인한다.
// 외곽선과 막대 슬롯은 팔레트와 무관하게 검은 배경이 아닌지로 판정한다.
function battery(fb, bars) {
  assert.notEqual(fb[4 * 240 + 217], 0, '상단 우측 배터리 외곽선');
  assert.notEqual(fb[8 * 240 + 235], 0, '상단 우측 배터리 외곽선');
  for (let k = 0; k < 3; k++) assert.equal(fb[6 * 240 + 219 + k * 5] !== 0, k < bars, '배터리 막대 수');
}
function settle(t, n) { for (let i = 0; i < n; i++) t.e.emu_frame(); }
for (const press of [null, 6, 7]) {
  const b = boot();
  if (press !== null) b.button(press);
  battery(b.frame(), 3);
  b.e.emu_adc_set(3, 0); settle(b, 300); battery(b.frame(), 0);
  b.e.emu_adc_set(3, 800); settle(b, 300); battery(b.frame(), 3);
}

console.log(JSON.stringify({result: 'PASS', modules: 4, mixerPages: 3, homeStaysOnTape: true, master0Silent: true, batteryPages: 3}));
