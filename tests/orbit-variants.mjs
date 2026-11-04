// SPDX-License-Identifier: GPL-3.0-only
// The published module is the ORBIT 1.0.1B Bluetooth build (ORBIT_BLE=1): build-info.json describes
// exactly that module, the real wasm reports the version, keeps the engine and preset inventory, the
// 0.37 s delay and a real PERC payload, plays every engine and the FM-replaced melodic SAMPLE presets,
// keeps the Bluetooth menu honest without a browser radio, and edits the new GLO > BT BUFFER setting.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const info = JSON.parse(fs.readFileSync('dist/build-info.json', 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function boot(key, version) {
  const bytes = fs.readFileSync(`dist/${key}.wasm`);
  assert.equal(hash(bytes), info.variants[key].sha256);
  assert.equal(bytes.length, info.variants[key].bytes);
  assert.equal(info.variants[key].version, version);
  assert.equal(info.variants[key].radio_emulated, false);
  const mod = new WebAssembly.Module(bytes);
  assert.deepEqual(WebAssembly.Module.imports(mod), [], 'no hardware or external imports');
  const e = new WebAssembly.Instance(mod, {}).exports;
  const text = ptr => {
    const memory = new Uint8Array(e.memory.buffer);
    return new TextDecoder().decode(memory.subarray(ptr, memory.indexOf(0, ptr)));
  };
  e.emu_init();
  assert(new Uint16Array(e.memory.buffer, e.emu_fb_ptr(), 240 * 240).some(v => v !== 0));
  assert.equal(text(e.emu_version()), `ORBIT ${version}`);
  e.emu_start(); e.emu_frame();
  function pump(blocks, capture = false) {
    const pcm = [];
    for (let k = 0; k < blocks; k++) {
      e.emu_render(128);
      const block = new Float32Array(e.memory.buffer, e.emu_audio_ptr(), 256);
      assert(block.every(Number.isFinite), 'finite real firmware PCM');
      if (capture) pcm.push(...block);
      if (k % 6 === 0) e.emu_frame();
    }
    return new Float32Array(pcm);
  }
  function select(engine, preset) {
    for (let step = 0; step < 400; step++) {
      if (e.emu_selected_engine() === engine && e.emu_selected_preset() === preset) return;
      e.emu_enc(6, 1); pump(12);
    }
    assert.fail(`PRESETS cannot reach engine ${engine}, preset ${preset}`);
  }
  const inventory = Array.from({length: e.emu_engine_count()}, (_, id) => ({
    id, name: text(e.emu_engine_name(id)),
    presets: Array.from({length: e.emu_preset_count(id)}, (_, p) => text(e.emu_preset_name(id, p))),
  }));
  return {e, text, pump, select, inventory};
}

// Given the single published build and a fresh instance of its actual firmware.
assert.deepEqual(Object.keys(info.variants), ['orbit-ble'], 'only the Bluetooth build is published');
assert.equal(info.default_variant, 'orbit-ble');
assert.equal(info.firmware, 'ORBIT 1.0.1B');
assert.equal(info.variants['orbit-ble'].orbit_ble, true);
assert.equal(typeof info.dirty, 'boolean');
const ble = boot('orbit-ble', '1.0.1B');
assert.deepEqual(ble.inventory.map(engine => engine.name), [
  'ANALOG', 'DIGITAL', 'PHASE', 'LOFI', 'SAMPLE', 'VOICE', 'TRIO', 'WHEEL', 'GRAIN',
  'SWARM', 'PULSE', 'FM4', 'FM6', 'PHYS', 'NOISE', 'CLUSTER', 'CLOUD',
], 'engine IDs remain compatible');
assert.equal(ble.e.emu_delay_length(), 16384, 'the Bluetooth build keeps its 0.37 s delay');

// When the PERC source payload is read, it is still real ADPCM data.
const perc = t => Buffer.from(new Uint8Array(t.e.memory.buffer, t.e.emu_perc_ptr(), t.e.emu_perc_size()));
assert(perc(ble).length > 1000, 'PERC remains real ADPCM');

function play(t, engine, preset) {
  t.select(engine, preset);
  t.e.emu_input(1 << 7, 0);
  const pcm = t.pump(180, true);
  t.e.emu_input(0, 0); t.pump(500);
  assert(pcm.some(v => Math.abs(v) > 0.0001), `engine ${engine} preset ${preset} is audible`);
  return Buffer.from(pcm.buffer);
}

// When real panel keys play each engine, the build produces finite, nonzero audio.
const rendered = [];
for (const engine of ble.inventory) {
  if (!engine.presets.length) continue;
  rendered.push({engine: engine.name, sha256: hash(play(ble, engine.id, 0))});
}

// Then every FM-replaced melodic SAMPLE preset keeps its name and index and plays.
const sample = ble.inventory.find(engine => engine.name === 'SAMPLE');
assert(sample, 'SAMPLE engine remains available');
const melodic = ['GRAND PNO', 'UP BASS', 'VIBES', 'HORN STAB', 'STRING STB', 'LOFI FLUTE', 'SCRATCH',
  'DUSTY PNO', 'LOFI KEYS', 'DEEP BASS'];
for (const name of melodic) {
  const preset = sample.presets.indexOf(name);
  assert(preset >= 0, `${name} retains its preset`);
  play(ble, sample.id, preset);
}

// When the real Bluetooth menu is enabled, unavailable hardware never appears connected.
assert.equal(ble.text(ble.e.emu_radio_status()), 'OFF');
ble.e.emu_input(0, 1 << 8); ble.pump(900);
ble.e.emu_input(0, 0); ble.pump(12);
for (let section = 0; section < 3; section++) { ble.e.emu_enc(0, 1); ble.pump(12); }
ble.e.emu_enc(4, 1); ble.pump(12); // SYSTEM, third row: BLUETOOTH.
assert.equal(ble.text(ble.e.emu_radio_status()), 'FAILED: NO BROWSER RADIO');
ble.e.emu_enc(4, -1); ble.pump(12);
assert.equal(ble.text(ble.e.emu_radio_status()), 'OFF');

// Then (1.0.1B) GLO twice from Tape opens the global pages, and SELECT reaches BT BUFFER after GLOBAL, MASTER
// and SYSTEM, where KNOB1 steps the real device setting 58 -> 70 -> 46 ms.
const fresh = boot('orbit-ble', '1.0.1B');
assert.equal(fresh.text(fresh.e.emu_bt_buffer_ms()), '58', 'the default phone-audio prebuffer');
const button = id => { fresh.e.emu_input(0, 1 << id); fresh.pump(12); fresh.e.emu_input(0, 0); fresh.pump(12); };
button(7); button(7); // GLO: Mixer, then the global pages
for (let page = 0; page < 3; page++) { fresh.e.emu_enc(0, 1); fresh.pump(12); }
fresh.e.emu_enc(2, 1); fresh.pump(12);
assert.equal(fresh.text(fresh.e.emu_bt_buffer_ms()), '70');
fresh.e.emu_enc(2, -2); fresh.pump(12);
assert.equal(fresh.text(fresh.e.emu_bt_buffer_ms()), '46');
console.log(JSON.stringify({result: 'PASS', firmware: info.firmware, engines: rendered, melodicPresets: melodic.length,
  percBytes: perc(ble).length, percSha256: hash(perc(ble)), btBufferMs: fresh.text(fresh.e.emu_bt_buffer_ms()),
  dirty: info.dirty, localDevelopment: info.local_development}));
