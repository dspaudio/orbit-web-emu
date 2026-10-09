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

// MASTER가 0이어도 stereo visualizer는 실제 pre-master C tap을 사용한다.
const s = boot();
s.button(2);
for (let enc = 2; enc < 6; enc++) s.enc(enc, -127);
s.button(8); s.button(7); s.enc(0, 1); s.enc(2, 127);
s.button(8);
for (let style = 0; style < 3; style++) s.enc(0, 1);
s.e.emu_adc_set(4, 0); s.e.emu_input(1 << 7, 0); s.pump(240);
const audio = new Float32Array(s.e.memory.buffer, s.e.emu_audio_ptr(), 256);
assert(audio.every(v => v === 0), 'MASTER 0의 실제 출력은 무음');
const fb = s.frame();
const green = [[10, 66, 38], [20, 136, 76], [30, 204, 112]].map(([r, g, b]) => ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3));
const points = [];
for (let y = 30; y < 210; y++) for (let x = 30; x < 210; x++) if (green.includes(fb[y * 240 + x])) points.push([x, y]);
assert(points.length > 8, 'pre-master tap의 실제 lissajous 도해');
assert(points.filter(([x, y]) => x < 118 && y < 118).length > 5, '오른쪽 pan의 실제 tap은 lissajous 왼쪽 위 사분면에도 그려진다');
console.log(JSON.stringify({result: 'PASS', modules: 4, mixerPages: 3, stereoPreMasterTap: true}));
