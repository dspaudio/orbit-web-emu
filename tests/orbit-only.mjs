// SPDX-License-Identifier: GPL-3.0-only
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../web/emu.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

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

for (const stored of ['sloop', 'felucca', 'orbit', null]) {
    for (const search of ['', '?fw=sloop', '?fw=felucca', '?fw=orbit']) {
        // Given a legacy URL/preference and distinct saved flash images.
        const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => [m[1], new Element()]));
        const flash = new Map(['orbit', 'sloop', 'felucca'].map((fw, i) => ['image-' + fw, Uint8Array.of(i + 1).buffer]));
        flash.set('image', Uint8Array.of(4).buffer);
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
            location: { search, href: 'https://example.test/' + search },
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

        // Then only ORBIT boots, using the existing ORBIT flash and cache keys.
        assert.equal(requests[0].split('?')[0], 'orbit.wasm', `stored=${stored}, URL=${search}`);
        assert.deepEqual(requests, ['orbit.wasm?v=0.8.2-5824b5b']);
        assert.deepEqual(modules, ['worklet.js?v=0.8.2-5824b5b']);
        assert.equal(processor.options.processorOptions.wasmBytes, wasmBytes);
        assert.equal(processor.options.processorOptions.flashImage, originalFlash.get('image-orbit'));
        assert.deepEqual(reads, ['image-orbit']);
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

        // Then persistence changes only the ORBIT image, without resetting preferences.
        assert.deepEqual(writes, ['image-orbit']);
        assert.equal(flash.get('image-orbit'), updated);
        for (const key of ['image-sloop', 'image-felucca', 'image'])
            assert.equal(flash.get(key), originalFlash.get(key));
        assert.equal(storage.get('orbit-emu-fw') ?? null, stored);
    }
}
console.log('ORBIT-only frontend: PASS (16 URL/preference combinations, power gate, flash read/write)');
