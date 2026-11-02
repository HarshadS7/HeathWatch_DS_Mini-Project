// WebAssembly build: exported for the Web Worker (frontend/src/engine/worker.ts).
#include <emscripten/emscripten.h>
#include <string>
#include "engine.hpp"
static std::string last;
extern "C" EMSCRIPTEN_KEEPALIVE const char* hw_handle(const char* req) {
    last = hw::handle(req);
    return last.c_str();
}
