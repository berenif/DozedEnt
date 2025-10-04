#!/bin/bash

# Build script for skeleton physics WASM module

echo "Building skeleton physics WASM module..."

# Check if emscripten is available
if ! command -v emcc &> /dev/null; then
    echo "Error: emcc not found. Please install Emscripten."
    echo "Visit: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Build with Emscripten
emcc "${SCRIPT_DIR}/skeleton-physics.cpp" \
    -o "${SCRIPT_DIR}/skeleton-physics.js" \
    -std=c++17 \
    -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME="createSkeletonPhysicsModule" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MAXIMUM_MEMORY=512MB \
    -s INITIAL_MEMORY=64MB \
    --bind \
    -s ENVIRONMENT=web \
    -s FILESYSTEM=0 \
    -s ASSERTIONS=1

if [ $? -eq 0 ]; then
    echo "✓ Build successful!"
    echo "Output files:"
    echo "  - ${SCRIPT_DIR}/skeleton-physics.js"
    echo "  - ${SCRIPT_DIR}/skeleton-physics.wasm"
else
    echo "✗ Build failed!"
    exit 1
fi
