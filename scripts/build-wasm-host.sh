#!/bin/bash

# Build script for the host authority WASM game module
# Requires Emscripten SDK (emsdk) to be installed and activated

echo "Building WASM host game module..."

# Navigate to wasm directory
cd wasm

# Compile the C++ game to WASM
emcc game-host.cpp \
    -O3 \
    -s STANDALONE_WASM=1 \
    -s EXPORTED_FUNCTIONS='["_game_init","_game_create_state","_game_update","_game_handle_input","_game_get_state","_game_get_state_size","_game_apply_state","_game_destroy","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s WASM_BIGINT=1 \
    -o game-host.wasm

if [ $? -eq 0 ]; then
    echo "✓ WASM module built successfully: wasm/game-host.wasm"
    
    # Copy to demo directory for easy access
    cp game-host.wasm ../demo/
    echo "✓ Copied to demo/game-host.wasm"
else
    echo "✗ Build failed"
    exit 1
fi