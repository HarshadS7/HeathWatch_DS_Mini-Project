#!/usr/bin/env bash
# Native (tests + CLI) and WebAssembly builds of the HeatWatch engine.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
g++ -std=c++17 -O2 -Wall -Wextra -Iinclude src/engine.cpp src/main_native.cpp -o build/heatwatch_engine
g++ -std=c++17 -O1 -Wall -Wextra -Iinclude src/engine.cpp tests/tests.cpp -o build/tests && ./build/tests
if command -v em++ >/dev/null; then
  out=../frontend/public/engine
  mkdir -p "$out"
  em++ -std=c++17 -O2 -Iinclude src/engine.cpp src/wasm.cpp -o "$out/heatwatch.js" \
    -sMODULARIZE -sEXPORT_ES6 -sENVIRONMENT=worker -sALLOW_MEMORY_GROWTH \
    -sEXPORTED_FUNCTIONS=_hw_handle -sEXPORTED_RUNTIME_METHODS=ccall
  echo "WASM -> $out"
else
  echo "em++ not found: activate emsdk (emsdk_env) to build the WebAssembly engine"
fi
