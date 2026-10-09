// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
const mod = new WebAssembly.Module(fs.readFileSync('dist/orbit.wasm'));
function boot(flash) {
  const e = new WebAssembly.Instance(mod, {}).exports;
  if (flash) new Uint8Array(e.memory.buffer, e.emu_flash_ptr(), e.emu_flash_size()).set(flash);
  e.emu_init(); e.emu_start(); e.emu_frame();
  const frame = () => Buffer.from(new Uint8Array(e.memory.buffer, e.emu_fb_ptr(), 115200));
  function pump(n) {
    let peak = 0;
    for (let i = 0; i < n; i++) {
      e.emu_render(128);
      for (const s of new Float32Array(e.memory.buffer, e.emu_audio_ptr(), 256)) {
        assert(Number.isFinite(s), '유한한 PCM'); peak = Math.max(peak, Math.abs(s));
      }
      if (i % 6 === 0) e.emu_frame();
    }
    return peak;
  }
  function button(id, blocks = 12) { e.emu_input(0, 1 << id); pump(blocks); e.emu_input(0, 0); pump(12); }
  function enc(id, steps) { e.emu_enc(id, steps); pump(12); }
  return {e, frame, pump, button, enc};
}
// 실제 PRESETS 조작으로 FM6의 공장 프리셋 8개를 각각 선택한다.
const peaks = [];
for (const bank of [28, 39, 45, 56, 74, 75, 76, 85]) {
  const t = boot(); t.enc(6, bank - 10);
  t.e.emu_input(1 << 7, 0); const peak = t.pump(400);
  assert(peak > 0.001, `FM6 프리셋 ${bank} 발음`); peaks.push(peak);
}
const t = boot(); t.button(8, 420);
const original = t.frame();
t.enc(2, -1); const mono = t.frame();
assert(!mono.equals(original), 'STYLE 조작이 화면 색상을 변경');
t.button(0); t.pump(1200);
const flash = new Uint8Array(t.e.memory.buffer, t.e.emu_flash_ptr(), t.e.emu_flash_size()).slice();
assert(t.e.emu_flash_gen() > 0, '설정이 플래시에 기록');
const restored = boot(flash); restored.button(8, 420);
assert(restored.frame().equals(mono), '재부팅 후 MONO 메뉴 화면 복원');
restored.button(0); restored.button(8);
const visualizer = restored.frame(); restored.enc(0, 1);
assert(!restored.frame().equals(visualizer), 'SELECT가 Visualizer 종류 변경');
console.log(JSON.stringify({result: 'PASS', fm6Peaks: peaks, stylePersistence: true, visualizerSelection: true}));
