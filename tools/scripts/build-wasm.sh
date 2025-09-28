#!/bin/bash
# Shell script to build WASM modules with proper environment setup
# Usage: ./scripts/build-wasm.sh [dev|prod|host|all]

BUILD_TYPE="${1:-prod}"

echo "WASM Build Script for DozedEnt Game"
echo "Build type: $BUILD_TYPE"

# Verify em++ is available
if ! command -v em++ &> /dev/null; then
    echo "Error: em++ compiler not found"
    echo "Make sure Emscripten SDK is installed and sourced"
    exit 1
fi

echo "Emscripten compiler available:"
em++ --version | head -n1

# Clean previous builds
echo "Cleaning previous WASM builds..."
rm -f *.wasm

# Generate balance header from data files
echo "Generating balance data header..."
if ! node ./tools/scripts/generate-balance.cjs; then
    echo "Balance generation failed"
    exit 1
fi
echo "Balance data generated"

build_game_wasm() {
    local mode="$1"
    
    echo "Building game.wasm in $mode mode..."
    
    if [ "$mode" = "dev" ]; then
        flags="-O1 -g -s ASSERTIONS=1"
        echo "Development build with debug symbols and assertions"
    elif [ "$mode" = "prod-safe" ]; then
        flags="-O2"
        echo "Production build with safe optimization (O2)"
    else
        flags="-O3"
        echo "Production build with maximum optimization"
    fi
    
    cmd="em++ public/src/wasm/game.cpp $flags -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s EXPORT_ALL=0 -s ALLOW_MEMORY_GROWTH=1 -o ./game.wasm"
    echo "Command: $cmd"
    
    if eval "$cmd"; then
        size=$(stat -c%s "game.wasm" 2>/dev/null || stat -f%z "game.wasm" 2>/dev/null)
        size_kb=$((size / 1024))
        echo "game.wasm built successfully (${size_kb} KB)"
        return 0
    else
        echo "game.wasm build failed"
        return 1
    fi
}

build_host_wasm() {
    echo "Building game-host.wasm..."
    
    cmd='em++ public/src/wasm/game-host.cpp -O3 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS="[\"_game_init\",\"_game_create_state\",\"_game_update\",\"_game_handle_input\",\"_game_get_state\",\"_game_get_state_size\",\"_game_apply_state\",\"_game_destroy\",\"_malloc\",\"_free\"]" -s EXPORTED_RUNTIME_METHODS="[\"ccall\",\"cwrap\"]" -s ALLOW_MEMORY_GROWTH=1 -s WASM_BIGINT=1 -o ./game-host.wasm'
    echo "Command: $cmd"
    
    if eval "$cmd"; then
        size=$(stat -c%s "game-host.wasm" 2>/dev/null || stat -f%z "game-host.wasm" 2>/dev/null)
        size_kb=$((size / 1024))
        echo "game-host.wasm built successfully (${size_kb} KB)"
        return 0
    else
        echo "game-host.wasm build failed"
        return 1
    fi
}

# Main build logic
case "$BUILD_TYPE" in
    dev)
        if ! build_game_wasm "dev"; then
            exit 1
        fi
        ;;
    prod)
        if ! build_game_wasm "prod"; then
            exit 1
        fi
        ;;
    prod-safe)
        if ! build_game_wasm "prod-safe"; then
            exit 1
        fi
        ;;
    host)
        if ! build_host_wasm; then
            exit 1
        fi
        ;;
    all)
        echo "Building all WASM modules..."
        if ! build_game_wasm "prod"; then
            exit 1
        fi
        if ! build_host_wasm; then
            exit 1
        fi
        echo "All WASM modules built successfully"
        ;;
    *)
        echo "Invalid build type: $BUILD_TYPE"
        echo "Usage: $0 [dev|prod|prod-safe|host|all]"
        exit 1
        ;;
esac

# Copy WASM files to dist/wasm if they exist
if [ -f "game.wasm" ] || [ -f "game-host.wasm" ]; then
    echo "Copying WASM files to dist/wasm..."
    mkdir -p dist/wasm
    [ -f "game.wasm" ] && cp game.wasm dist/wasm/
    [ -f "game-host.wasm" ] && cp game-host.wasm dist/wasm/
    echo "WASM files copied to dist/wasm/"
fi

# Generate export manifest for CI/auditing
echo "Generating WASM export manifest..."
node ./tools/scripts/generate-wasm-exports.js --out ./WASM_EXPORTS.json || echo "Warning: Failed to generate export manifest"

echo "Build completed successfully"
