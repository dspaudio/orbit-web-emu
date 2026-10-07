#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Compile ORBIT using the upstream browser HAL; retain baseline comparisons.
set -eu
cd "$(dirname "$0")"
ORBIT=${ORBIT:-../orbit}
CLANG=${CLANG:-clang}
if [ ! -f "$ORBIT/firmware/src/orbit_modes.c" ]; then
    echo 'Set ORBIT to a checkout of https://github.com/dspaudio/orbit' >&2
    exit 1
fi
mkdir -p "$ORBIT/build/gen" dist
for g in font icons tables samples drumkits logo; do
    name="felucca_$g.h"
    [ "$g" != logo ] || name=sloop_logo.h
    (cd "$ORBIT" && python3 "tools/gen_$g.py" "build/gen/$name")
done
"$CLANG" --target=wasm32 -O2 -fno-builtin -ffreestanding -nostdlib \
    -Wall -Wno-unused-function -Wno-unused-variable \
    -I "$ORBIT/build/gen" -I "$ORBIT/firmware/src" \
    -Wl,--no-entry -Wl,--export-memory -Wl,-z,stack-size=1048576 \
    -Wl,--global-base=1048576 -o dist/orbit.wasm src/sloop_wasm.c
cp web/index.html web/emu.js web/worklet.js web/manifest.webmanifest \
   web/icon-192.png web/icon-512.png web/apple-touch-icon.png dist/
# Original compiled baselines are retained from the upstream fork.
cp docs/sloop.wasm docs/felucca.wasm dist/
python3 - "$ORBIT" <<'PY'
import json,pathlib,subprocess,sys
p=pathlib.Path(sys.argv[1])
revision=subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
json.dump({'firmware':'ORBIT 0.2.1','source':'https://github.com/dspaudio/orbit','source_checkout_commit':revision,'published_source_commit':pathlib.Path('ORBIT_REVISION').read_text().strip()},open('dist/build-info.json','w'),indent=2)
PY
ls -lh dist/orbit.wasm
