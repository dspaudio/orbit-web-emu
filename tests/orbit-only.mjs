// SPDX-License-Identifier: GPL-3.0-only
// The frontend offers one firmware, ORBIT 1.0.1B (the Bluetooth build): there is no selector, every
// legacy URL or stored preference boots orbit-ble.wasm with the Bluetooth build's own save image under
// the page's single cache key, and the compact instrument fills the whole viewport. Runs against web/
// without building Wasm.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../web/emu.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');
assert.deepEqual([...html.matchAll(/<(select|option)\b/g)], [], 'No firmware selector: 1.0.1B is the only build');
const cacheKeys = new Set([...html.matchAll(/\?v=([^"']+)/g)].map(m => m[1]));
assert.equal(cacheKeys.size, 1, 'index.html uses one asset cache key');
const [cacheKey] = cacheKeys;

class Element {
    constructor() {
        this.style = { setProperty() {} };
        this.classList = { add() {}, remove() {}, toggle() {} };
        this.events = new Map();
        this.children = [];
    }
    addEventListener(type, handler) { this.events.set(type, handler); }
    appendChild(child) { this.children.push(child); }
    remove() { this.removed = true; }
    getContext() {
        return { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) };
    }
}

const flashKey = 'image-orbit-0.9.B';
const wasmFile = 'orbit-ble.wasm';
let combinations = 0;
for (const stored of ['sloop', 'felucca', 'orbit', null]) {
    for (const search of ['', '?fw=sloop', '?fw=felucca', '?fw=orbit',
        '?version=1.0.0', '?version=1.0.B', '?version=1.0.1B', '?version=0.8.2', '?fw=sloop&version=1.0.B',
        '?version=0.9.0', '?version=0.9.B', '?version=0.10.0', '?version=0.10.B', '?version=unknown']) {
        combinations++;
        // Given a legacy URL/preference and distinct saved flash images.
        const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => [m[1], new Element()]));
        const flash = new Map(['orbit', 'sloop', 'felucca'].map((fw, i) => ['image-' + fw, Uint8Array.of(i + 1).buffer]));
        flash.set('image', Uint8Array.of(4).buffer);
        flash.set('image-orbit-0.9.B', Uint8Array.of(5).buffer);
        const originalFlash = new Map(flash);
        const storage = new Map(stored === null ? [] : [['orbit-emu-fw', stored]]);
        const reads = [], writes = [], requests = [], modules = [], messages = [], timers = [];
        const wasmBytes = Uint8Array.of(0, 97, 115, 109).buffer;
        let processor, contexts = 0, resolveSave;
        const saved = new Promise(resolve => { resolveSave = resolve; });
        const window = new Element();
        Object.assign(window, {
            innerWidth: 1440, innerHeight: 1000, navigator: {},
            matchMedia: () => ({ matches: false }),
        });
        const document = Object.assign(new Element(), {
            body: new Element(), documentElement: new Element(),
            getElementById: id => elements.get(id) || null,
            createElement: () => new Element(),
            querySelector: selector => selector === '#power small' ? new Element() : null,
            querySelectorAll: () => [],
        });
        const indexedDB = {
            open(name, version) {
                assert.equal(name, 'sloop-emu');
                assert.equal(version, 1);
                const request = { result: {
                    transaction(store, mode) {
                        assert.equal(store, 'flash');
                        return { objectStore(name) {
                            assert.equal(name, 'flash');
                            return {
                                get(key) {
                                    reads.push(key);
                                    const result = { result: flash.get(key) };
                                    queueMicrotask(() => result.onsuccess());
                                    return result;
                                },
                                put(value, key) {
                                    assert.equal(mode, 'readwrite');
                                    writes.push(key);
                                    flash.set(key, value);
                                    resolveSave();
                                },
                            };
                        } };
                    },
                } };
                queueMicrotask(() => request.onsuccess());
                return request;
            },
        };
        class AudioContext {
            constructor() {
                contexts++;
                this.destination = {};
                this.audioWorklet = { addModule: async url => { modules.push(url); } };
            }
            async resume() {}
        }
        class AudioWorkletNode {
            constructor(ctx, name, options) {
                assert.equal(name, 'sloop');
                this.options = options;
                this.port = { postMessage: message => messages.push(message) };
                processor = this;
            }
            connect() {}
        }
        vm.runInNewContext(source, {
            document, window, navigator: window.navigator, indexedDB, AudioContext, AudioWorkletNode,
            location: { search, href: 'https://example.test/' + search, assign: () => assert.fail('no version navigation') },
            URLSearchParams,
            localStorage: {
                getItem: key => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
            },
            getComputedStyle: () => ({ getPropertyValue: () => '0' }),
            setTimeout: (callback, delay) => { timers.push({ callback, delay }); },
            fetch: async url => { requests.push(url); return { arrayBuffer: async () => wasmBytes }; },
        });
        assert.equal(contexts, 0, 'Audio must wait for POWER');
        assert.equal(requests.length, 0, 'Wasm must wait for POWER');
        assert.equal(reads.length, 0, 'Flash must wait for POWER');

        // When POWER starts the actual frontend boot path.
        await elements.get('power').events.get('click')();

        // Then only the Bluetooth build boots, with its existing save image and the page's cache key.
        assert.equal(requests[0], `${wasmFile}?v=${cacheKey}`, `stored=${stored}, URL=${search}`);
        assert.equal(modules[0], `worklet.js?v=${cacheKey}`);
        assert.equal(processor.options.processorOptions.wasmBytes, wasmBytes);
        assert.equal(processor.options.processorOptions.flashImage, originalFlash.get(flashKey));
        assert.deepEqual(reads, [flashKey]);
        assert.equal(contexts, 1);
        assert.equal(elements.get('power').removed, true);
        assert.equal(messages[0].t, 'adc');
        assert.equal(messages.some(message => message.t === 'start'), false);
        timers.find(timer => timer.delay === 900).callback();
        assert.equal(messages.at(-1).t, 'start');

        // When the worklet publishes a flash save.
        const updated = Uint8Array.of(8, 1).buffer;
        processor.port.onmessage({ data: { t: 'flash', data: updated } });
        await saved;

        // Then persistence changes only the Bluetooth build's image, without resetting preferences.
        assert.deepEqual(writes, [flashKey]);
        assert.equal(flash.get(flashKey), updated);
        for (const key of originalFlash.keys())
            if (key !== flashKey) assert.equal(flash.get(key), originalFlash.get(key));
        assert.equal(storage.get('orbit-emu-fw') ?? null, stored);
        // Given a compact viewport, the instrument fills it: no selector strip is reserved.
        window.innerWidth = 390;
        window.innerHeight = 844;
        window.events.get('resize')();
        assert.equal(parseFloat(elements.get('device').style.top), 422,
            'Compact instrument is centered in the full viewport');
    }
}
console.log(`ORBIT 1.0.1B frontend: PASS (${combinations} URL/preference combinations, one firmware, power gate, Bluetooth-build save, full compact viewport)`);
