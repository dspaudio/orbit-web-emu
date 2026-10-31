// SPDX-License-Identifier: GPL-3.0-only
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

// Given fresh instances of both actual firmware variants.
const normal = boot('orbit', '0.10.0');
const ble = boot('orbit-ble', '0.10.B');
assert.equal(info.default_variant, 'orbit');
assert.equal(info.variants.orbit.orbit_ble, false);
assert.equal(info.variants['orbit-ble'].orbit_ble, true);
assert.equal(typeof info.dirty, 'boolean');
assert.deepEqual(normal.inventory, ble.inventory, 'append-only engine IDs and every preset name/index survive');
assert.deepEqual(normal.inventory.map(engine => engine.name), [
  'ANALOG', 'DIGITAL', 'PHASE', 'LOFI', 'SAMPLE', 'VOICE', 'TRIO', 'WHEEL', 'GRAIN',
  'SWARM', 'PULSE', 'FM4', 'FM6', 'PHYS', 'NOISE', 'CLUSTER', 'CLOUD',
], 'default engine IDs remain compatible');
assert.equal(normal.e.emu_delay_length(), 65536);
assert.equal(ble.e.emu_delay_length(), 32768);

// When the PERC source payload is read, its bytes must agree despite changed offsets.
const perc = t => Buffer.from(new Uint8Array(t.e.memory.buffer, t.e.emu_perc_ptr(), t.e.emu_perc_size()));
assert(perc(normal).length > 1000, 'PERC remains real ADPCM');
assert.deepEqual(perc(normal), perc(ble), 'PERC source bytes are identical');

function play(t, engine, preset) {
  t.select(engine, preset);
  t.e.emu_input(1 << 7, 0);
  const pcm = t.pump(180, true);
  t.e.emu_input(0, 0); t.pump(500);
  assert(pcm.some(v => Math.abs(v) > 0.0001), `engine ${engine} preset ${preset} is audible`);
  return Buffer.from(pcm.buffer);
}

// When real panel keys play each engine, both builds produce finite, nonzero audio.
const rendered = [];
for (const engine of normal.inventory) {
  if (!engine.presets.length) continue;
  const a = play(normal, engine.id, 0);
  const b = play(ble, engine.id, 0);
  rendered.push({engine: engine.name, normal: hash(a), ble: hash(b)});
}

// Then every same-named melodic SAMPLE preset has a distinct real PCM render.
const sample = normal.inventory.find(engine => engine.name === 'SAMPLE');
assert(sample, 'SAMPLE engine remains available');
const melodic = ['GRAND PNO', 'UP BASS', 'VIBES', 'HORN STAB', 'STRING STB', 'LOFI FLUTE', 'SCRATCH',
  'DUSTY PNO', 'LOFI KEYS', 'DEEP BASS'];
for (const name of melodic) {
  const preset = sample.presets.indexOf(name);
  assert(preset >= 0, `${name} retains its preset`);
  assert.notDeepEqual(play(normal, sample.id, preset), play(ble, sample.id, preset),
    `${name} uses the variant's actual firmware sound`);
}

// When the real Bluetooth menu is enabled, unavailable hardware never appears connected.
assert.equal(normal.text(normal.e.emu_radio_status()), 'UNAVAILABLE');
assert.equal(ble.text(ble.e.emu_radio_status()), 'OFF');
ble.e.emu_input(0, 1 << 8); ble.pump(900);
ble.e.emu_input(0, 0); ble.pump(12);
for (let section = 0; section < 3; section++) { ble.e.emu_enc(0, 1); ble.pump(12); }
ble.e.emu_enc(4, 1); ble.pump(12); // SYSTEM, third row: BLUETOOTH.
assert.equal(ble.text(ble.e.emu_radio_status()), 'FAILED: NO BROWSER RADIO');
ble.e.emu_enc(4, -1); ble.pump(12);
assert.equal(ble.text(ble.e.emu_radio_status()), 'OFF');
console.log(JSON.stringify({result: 'PASS', engines: rendered, melodicVariants: melodic.length,
  percBytes: perc(normal).length, percSha256: hash(perc(normal)), dirty: info.dirty}));
