/* SPDX-License-Identifier: GPL-3.0-only
 * SLOOP web emulator: main thread — faceplate, input, screen, LEDs.
 * The firmware itself runs in worklet.js (wasm inside the AudioWorklet). */
'use strict';

/* ---- panel mapping (firmware/src/panel.c PANEL_DEFAULT) ----
 * label order: FX SCL ENV LFO EDIT GLO HOME SAVE ARP SEQ PLAY REC OCT- OCT+ */
const BTN = { 'OCT-': 0, 'OCT+': 1, FX: 2, SCL: 3, ENV: 4, LFO: 5, EDIT: 6, GLO: 7,
              HOME: 8, SAVE: 9, ARP: 10, SEQ: 11, PLAY: 12, REC: 13 };

/* key matrix map (firmware/hal/fm1_input.h): ids 0..13 buttons, 14..40 note keys */
const KEYMAP = [
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
    [ 5, 11,  4, 10,  3,  9,  2,  8, -1, -1, -1],
    [34, 35, 36, 37, 38, 40, 39, 13,  7,  6, 12],
    [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
    [ 0,  1, 15, 14, 17, 16, 19, 18, 20, 21, 22],
    [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];

const NNOTES = 27;                       // note ids 0..26 = F3..G5 chromatic
const isBlack = n => [1, 3, 6, 8, 10].includes((53 + n) % 12);  // F3 = MIDI 53
const NOTE_NAMES = ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'];

let node = null, ctx = null;
let notesMask = 0, buttonsMask = 0;

function sendInput() { if (node) node.port.postMessage({ t: 'input', notes: notesMask, buttons: buttonsMask }); }
function noteDown(n) { notesMask |= 1 << n; sendInput(); }
function noteUp(n) { notesMask &= ~(1 << n); sendInput(); }
function btnDown(b) { buttonsMask |= 1 << b; sendInput(); }
function btnUp(b) { buttonsMask &= ~(1 << b); sendInput(); }
function enc(e, steps) { if (node && steps) node.port.postMessage({ t: 'enc', e, steps }); }

/* ---------------------------------------------------------- faceplate --- */
const btnEls = {}, noteEls = [];

function buildButtons() {
    const grid = document.getElementById('btns');
    const rows = [['FX', 'SCL', 'ENV', 'LFO', 'EDIT', 'GLO', 'HOME'],
                  ['SAVE', 'ARP', 'SEQ', 'OCT-', 'OCT+', 'PLAY', 'REC']];
    const keyhint = { FX: '1', SCL: '2', ENV: '3', LFO: '4', EDIT: '5', GLO: '6', HOME: '7',
                      SAVE: '8', ARP: '9', SEQ: '0', 'OCT-': 'Z', 'OCT+': 'X', PLAY: '␣', REC: 'R' };
    for (const row of rows)
        for (const name of row) {
            const el = document.createElement('div');
            el.className = 'btn' + (name === 'PLAY' || name === 'REC' ? ' transport' : '');
            el.innerHTML = name + '<kbd>' + keyhint[name] + '</kbd>';
            const id = BTN[name];
            el.addEventListener('pointerdown', ev => { ev.preventDefault(); try { el.setPointerCapture(ev.pointerId); } catch (e) {} el.classList.add('down'); btnDown(id); });
            const up = () => { el.classList.remove('down'); btnUp(id); };
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
            grid.appendChild(el);
            btnEls[id] = el;
        }
}

function buildKeyboard() {
    const kbd = document.getElementById('kbd');
    const W = 58;                         // white key pitch (56px key + 2 gap)
    let wx = 0, wi = 0;
    for (let n = 0; n < NNOTES; n++) {
        const el = document.createElement('div');
        if (isBlack(n)) {
            el.className = 'bkey';
            el.style.left = (wx - 18) + 'px';
        } else {
            el.className = 'wkey';
            el.style.left = wx + 'px';
            el.innerHTML = '<i>' + NOTE_NAMES[wi++] + '</i>';
            wx += W;
        }
        el.addEventListener('pointerdown', ev => { ev.preventDefault(); try { el.setPointerCapture(ev.pointerId); } catch (e) {} el.classList.add('down'); noteDown(n); });
        const up = () => { el.classList.remove('down'); noteUp(n); };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        kbd.appendChild(el);
        noteEls[n] = el;
    }
    kbd.style.width = wx + 'px';
    document.getElementById('device').style.width = 'fit-content';
}

function buildEncoders() {
    document.querySelectorAll('.enc').forEach(el => {
        const e = +el.dataset.enc, cap = el.querySelector('.cap');
        let rot = 0, dragY = null, acc = 0;
        const turn = s => { rot += s * 18; cap.style.setProperty('--rot', rot + 'deg'); enc(e, s); };
        cap.addEventListener('wheel', ev => { ev.preventDefault(); turn(ev.deltaY < 0 ? 1 : -1); }, { passive: false });
        cap.addEventListener('pointerdown', ev => { ev.preventDefault(); dragY = ev.clientY; acc = 0; try { cap.setPointerCapture(ev.pointerId); } catch (e) {} });
        cap.addEventListener('pointermove', ev => {
            if (dragY === null) return;
            acc += dragY - ev.clientY; dragY = ev.clientY;
            const s = Math.trunc(acc / 10);
            if (s) { acc -= s * 10; turn(s); }
        });
        const up = () => { dragY = null; };
        cap.addEventListener('pointerup', up);
        cap.addEventListener('pointercancel', up);
    });
}

/* --------------------------------------------------- computer keyboard --- */
/* middle row = white keys from C4 (note id 7), top row = black keys */
const KEYNOTES = { a: 7, s: 9, d: 11, f: 12, g: 14, h: 16, j: 18, k: 19, l: 21, ';': 23, "'": 24,
                   w: 8, e: 10, t: 13, y: 15, u: 17, o: 20, p: 22, ']': 25 };
const KEYBTNS = { 1: 'FX', 2: 'SCL', 3: 'ENV', 4: 'LFO', 5: 'EDIT', 6: 'GLO', 7: 'HOME',
                  8: 'SAVE', 9: 'ARP', 0: 'SEQ', z: 'OCT-', x: 'OCT+', ' ': 'PLAY', r: 'REC' };
const KEYENC = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowRight: [1, 1], ArrowLeft: [1, -1],
                 ']': null, '[': [6, -1] };   // ']' is a note key; PRESETS + via '\'
KEYENC['\\'] = [6, 1];

const heldKeys = new Set();
window.addEventListener('keydown', ev => {
    if (ev.repeat) { if (ev.key in KEYENC && KEYENC[ev.key]) { enc(...KEYENC[ev.key]); } ev.preventDefault(); return; }
    const k = ev.key.toLowerCase();
    if (k in KEYNOTES) { heldKeys.add(k); noteDown(KEYNOTES[k]); ev.preventDefault(); }
    else if (k in KEYBTNS) { heldKeys.add(k); btnDown(BTN[KEYBTNS[k]]); btnEls[BTN[KEYBTNS[k]]]?.classList.add('down'); ev.preventDefault(); }
    else if (ev.key in KEYENC && KEYENC[ev.key]) { enc(...KEYENC[ev.key]); ev.preventDefault(); }
});
window.addEventListener('keyup', ev => {
    const k = ev.key.toLowerCase();
    if (k in KEYNOTES && heldKeys.delete(k)) noteUp(KEYNOTES[k]);
    else if (k in KEYBTNS && heldKeys.delete(k)) { btnUp(BTN[KEYBTNS[k]]); btnEls[BTN[KEYBTNS[k]]]?.classList.remove('down'); }
});
window.addEventListener('blur', () => { heldKeys.clear(); notesMask = 0; buttonsMask = 0; sendInput(); });

/* ------------------------------------------------------------- screen --- */
const canvas = document.getElementById('screen');
const c2d = canvas.getContext('2d');
const img = c2d.createImageData(240, 240);

function drawFB(fb) {
    const d = img.data;
    for (let k = 0; k < 240 * 240; k++) {
        const v = fb[k];
        d[4 * k] = (v >> 11 & 31) * 255 / 31 | 0;
        d[4 * k + 1] = (v >> 5 & 63) * 255 / 63 | 0;
        d[4 * k + 2] = (v & 31) * 255 / 31 | 0;
        d[4 * k + 3] = 255;
    }
    c2d.putImageData(img, 0, 0);
}

/* ---------------------------------------------------------------- LEDs --- */
function applyLeds(leds, dims) {
    const lit = new Set(), glow = new Set();
    for (let p = 0; p < 11; p++)
        for (let r = 1; r < 5; r++) {
            const id = KEYMAP[r][p];
            if (id < 0) continue;
            if (leds[p] >> r & 1) lit.add(id);
            else if (dims[p] >> r & 1) glow.add(id);
        }
    for (let b = 0; b < 14; b++) {
        const el = btnEls[b];
        if (!el) continue;
        el.classList.toggle('lit', lit.has(b));
        el.classList.toggle('glow', !lit.has(b) && glow.has(b));
    }
    for (let n = 0; n < NNOTES; n++) {
        const id = 14 + n, el = noteEls[n];
        el.classList.toggle('lit', lit.has(id));
        el.classList.toggle('glow', !lit.has(id) && glow.has(id));
    }
}

/* ------------------------------------------------------------ power on --- */
async function powerOn() {
    document.getElementById('power').remove();
    ctx = new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' });
    await ctx.audioWorklet.addModule('worklet.js');
    const wasmBytes = await (await fetch('sloop.wasm')).arrayBuffer();
    node = new AudioWorkletNode(ctx, 'sloop', {
        outputChannelCount: [2],
        processorOptions: { wasmBytes },
    });
    node.port.onmessage = ev => {
        const m = ev.data;
        if (m.t === 'frame') { drawFB(m.fb); applyLeds(m.leds, m.dims); }
        else if (m.t === 'leds') applyLeds(m.leds, m.dims);
    };
    node.connect(ctx.destination);
    await ctx.resume();
    node.port.postMessage({ t: 'adc', ch: 4, v: +document.getElementById('vol').value });
    setTimeout(() => node.port.postMessage({ t: 'start' }), 900);   // splash dwell, as fm1_main
    initMidi();
}
document.getElementById('power').addEventListener('click', powerOn, { once: true });

document.getElementById('vol').addEventListener('input', ev => {
    if (node) node.port.postMessage({ t: 'adc', ch: 4, v: +ev.target.value });
});

/* --------------------------------------------------------------- MIDI --- */
function initMidi() {
    if (!navigator.requestMIDIAccess) return;
    navigator.requestMIDIAccess({ sysex: false }).then(acc => {
        const hook = () => acc.inputs.forEach(inp => {
            inp.onmidimessage = ev => {
                const d = ev.data;
                if (!d || !d.length || d[0] >= 0xF0) return;
                const pkt = (d[0] >> 4) | (d[0] << 8) | ((d[1] || 0) << 16) | ((d[2] || 0) << 24);
                node.port.postMessage({ t: 'midi', p: pkt >>> 0 });
            };
        });
        hook();
        acc.onstatechange = hook;
    }).catch(() => {});
}

buildButtons();
buildKeyboard();
buildEncoders();
