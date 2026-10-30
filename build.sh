#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Compile both ORBIT sound variants using the browser HAL, without a radio stack.
set -eu
cd "$(dirname "$0")"
ORBIT=${ORBIT:-../orbit}
CLANG=${CLANG:-clang}
PYTHON=${PYTHON:-python3}
ORBIT_LOCAL_DEVELOPMENT=${ORBIT_LOCAL_DEVELOPMENT:-0}
if [ ! -f "$ORBIT/firmware/src/orbit_modes.c" ]; then
    echo 'Set ORBIT to a checkout of https://github.com/dspaudio/orbit' >&2
    exit 1
fi
ORBIT=$(cd "$ORBIT" && pwd)
# Validate before generating or replacing any artifact. This opt-in is local only.
"$PYTHON" - "$ORBIT" "$ORBIT_LOCAL_DEVELOPMENT" <<'PY'
import json,pathlib,subprocess,sys
p=pathlib.Path(sys.argv[1])
revision=subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
published=pathlib.Path('ORBIT_REVISION').read_text().strip()
dirty=bool(subprocess.check_output(['git','-C',str(p),'status','--porcelain','--untracked-files=all'],text=True))
if sys.argv[2] not in ('0','1'):
    raise SystemExit('ORBIT_LOCAL_DEVELOPMENT must be 0 or 1')
if sys.argv[2] != '1' and (dirty or revision != published):
    raise SystemExit('Release build requires clean sources matching ORBIT_REVISION; use ORBIT_LOCAL_DEVELOPMENT=1 explicitly for local development')
PY
mkdir -p build dist
run=$(mktemp -d "$PWD/build/dual.XXXXXX")
trap 'rm -rf "$run"' EXIT HUP INT TERM
for variant in orbit orbit-ble; do
    ble=0
    [ "$variant" != orbit-ble ] || ble=1
    root="$run/$variant"
    mkdir -p "$root/build/gen"
    # Copies keep __file__-relative caches and generated WAVs out of native build/.
    cp -R "$ORBIT/tools" "$root/tools"
    ln -s "$ORBIT/assets" "$root/assets"
    for g in font icons tables samples drumkits fm6_patches op1_cluster logo; do
        name="felucca_$g.h"
        [ "$g" != logo ] || name=sloop_logo.h
        [ "$g" != fm6_patches ] || name=felucca_fm6.h
        ORBIT_BLE=$ble FELUCCA_SLICE=0 "$PYTHON" "$root/tools/gen_$g.py" "$root/build/gen/$name"
    done
    "$CLANG" --target=wasm32 -O2 -fno-builtin -ffreestanding -nostdlib \
        -Wall -Wno-unused-function -Wno-unused-variable \
        -DORBIT_BLE=$ble -DFELUCCA_SLICE=0 \
        -I "$root/build/gen" -I "$ORBIT/firmware/src" \
        -Wl,--no-entry -Wl,--export-memory -Wl,-z,stack-size=1048576 \
        -Wl,--global-base=1048576 -o "$run/$variant.wasm" src/sloop_wasm.c
    "$CLANG" --target=wasm32 -E -dM -DORBIT_BLE=$ble -DFELUCCA_SLICE=0 \
        -I "$root/build/gen" -I "$ORBIT/firmware/src" \
        src/sloop_wasm.c > "$run/$variant.macros"
done
"$PYTHON" - "$ORBIT" "$ORBIT_LOCAL_DEVELOPMENT" "$run" <<'PY'
import hashlib,json,pathlib,re,subprocess,sys
p=pathlib.Path(sys.argv[1])
revision=subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
published=pathlib.Path('ORBIT_REVISION').read_text().strip()
dirty=bool(subprocess.check_output(['git','-C',str(p),'status','--porcelain','--untracked-files=all'],text=True))
variants={}
for key,ble in [('orbit',False),('orbit-ble',True)]:
    data=(pathlib.Path(sys.argv[3])/(key+'.wasm')).read_bytes()
    macros=(pathlib.Path(sys.argv[3])/(key+'.macros')).read_text()
    firmware=json.loads(re.search(r'^#define FELUCCA_VERSION (".*?")',macros,re.M)[1])
    variants[key]={'firmware':firmware,'version':firmware.removeprefix('ORBIT '),'file':key+'.wasm',
                   'orbit_ble':ble,'radio_emulated':False,'sha256':hashlib.sha256(data).hexdigest(),
                   'bytes':len(data)}
info={'firmware':variants['orbit']['firmware'],'source':'https://github.com/dspaudio/orbit',
      'source_checkout_commit':revision,'published_source_commit':published,
      'dirty':dirty,'local_development':sys.argv[2]=='1','default_variant':'orbit','variants':variants}
(pathlib.Path(sys.argv[3])/'build-info.json').write_text(json.dumps(info,indent=2)+'\n')
PY
cp "$run/orbit.wasm" "$run/orbit-ble.wasm" "$run/build-info.json" dist/
cp web/index.html web/emu.js web/worklet.js web/manifest.webmanifest \
   web/icon-192.png web/icon-512.png web/apple-touch-icon.png dist/
ls -lh dist/orbit.wasm dist/orbit-ble.wasm
