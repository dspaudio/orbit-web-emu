#!/bin/sh
# Build the web emulator: firmware sources -> wasm32 (system clang+lld),
# then copy the web shell into dist/. Builds both firmwares:
#   sloop.wasm    from $SLOOP   (isod89/sloop-fm1)
#   felucca.wasm  from $FELUCCA (hugelton/Felucca), if present
set -e
cd "$(dirname "$0")"
SLOOP=${SLOOP:-$HOME/Projects/sloop-fm1}
FELUCCA=${FELUCCA:-$HOME/Projects/Felucca}

CFLAGS="--target=wasm32 -O2 -fno-builtin -ffreestanding -nostdlib \
    -Wall -Wno-unused-function -Wno-unused-variable"
LDFLAGS="-Wl,--no-entry -Wl,--export-memory \
    -Wl,-z,stack-size=1048576 -Wl,--global-base=1048576"

test -f "$SLOOP/build/gen/felucca_tables.h" || {
    echo "SLOOP generated headers missing; run the gen_*.py tools in $SLOOP first" >&2
    exit 1
}

mkdir -p dist
clang $CFLAGS -I "$SLOOP/build/gen" -I "$SLOOP/firmware/src" \
    $LDFLAGS -o dist/sloop.wasm src/sloop_wasm.c

if [ -f "$FELUCCA/build/gen/felucca_tables.h" ]; then
    clang $CFLAGS -I "$FELUCCA/build/gen" -I "$FELUCCA/firmware/src" \
        $LDFLAGS -o dist/felucca.wasm src/felucca_wasm.c
else
    echo "note: Felucca generated headers missing ($FELUCCA); skipping felucca.wasm" >&2
fi

cp web/index.html web/emu.js web/worklet.js web/manifest.webmanifest \
   web/icon-192.png web/icon-512.png web/apple-touch-icon.png dist/
ls -la dist/
