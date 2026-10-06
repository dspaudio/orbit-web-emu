#!/bin/sh
# Build the SLOOP web emulator: firmware sources -> wasm32 (system clang+lld),
# then copy the web shell into dist/.
set -e
cd "$(dirname "$0")"
SLOOP=${SLOOP:-$HOME/Projects/sloop-fm1}

test -f "$SLOOP/build/gen/felucca_tables.h" || {
    echo "generated headers missing; run the gen_*.py tools in $SLOOP first" >&2
    exit 1
}

mkdir -p dist
clang --target=wasm32 -O2 -fno-builtin -ffreestanding -nostdlib \
    -Wall -Wno-unused-function -Wno-unused-variable \
    -I "$SLOOP/build/gen" -I "$SLOOP/firmware/src" \
    -Wl,--no-entry -Wl,--export-memory \
    -Wl,-z,stack-size=1048576 -Wl,--global-base=1048576 \
    -o dist/sloop.wasm src/sloop_wasm.c
cp web/index.html web/emu.js web/worklet.js dist/
ls -la dist/
