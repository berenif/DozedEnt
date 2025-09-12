#!/bin/bash

# Cross-platform WASM build script
# Usage: ./scripts/build-wasm.sh [dev|prod|prod-safe|host|all]

set -e  # Exit on any error

# Default build type
BUILD_TYPE=${1:-prod}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}WASM Build Script for DozedEnt Game${NC}"
echo -e "${YELLOW}Build type: $BUILD_TYPE${NC}"

# Initialize Emscripten environment
echo -e "${GREEN}Setting up Emscripten environment...${NC}"
if [ -f "./emsdk/emsdk_env.sh" ]; then
    source ./emsdk/emsdk_env.sh
    echo -e "${GREEN}Emscripten environment initialized${NC}"
else
    echo -e "${RED}Failed to initialize Emscripten environment${NC}"
    echo -e "${YELLOW}Make sure emsdk is properly installed in the emsdk/ directory${NC}"
    exit 1
fi

# Verify em++ is available
if command -v em++ >/dev/null 2>&1; then
    EM_VERSION=$(em++ --version | grep "emcc" || echo "emcc version unknown")
    echo -e "${GREEN}Emscripten compiler available: $EM_VERSION${NC}"
else
    echo -e "${RED}em++ compiler not found${NC}"
    exit 1
fi

# Clean previous builds
echo -e "${YELLOW}Cleaning previous WASM builds...${NC}"
rm -f *.wasm

# Generate balance header from data files
echo -e "${YELLOW}Generating balance data header...${NC}"
node scripts/generate-balance.cjs || { echo -e "${RED}Balance generation failed${NC}"; exit 1; }

# Function to build game WASM
build_game_wasm() {
    local mode=$1
    
    echo -e "${CYAN}Building game.wasm in $mode mode...${NC}"
    
    local flags=""
    case $mode in
        "dev")
            flags="-O1 -g -s ASSERTIONS=1"
            echo -e "${YELLOW}Development build with debug symbols and assertions${NC}"
            ;;
        "prod-safe")
            flags="-O2"
            echo -e "${YELLOW}Production build with safe optimization (O2)${NC}"
            ;;
        *)
            flags="-O3"
            echo -e "${YELLOW}Production build with maximum optimization${NC}"
            ;;
    esac
    
    local cmd="em++ src/wasm/game.cpp $flags -s STANDALONE_WASM=1 -s WASM_BIGINT=1 -s EXPORT_ALL=0 -s ALLOW_MEMORY_GROWTH=1 -o ./game.wasm"
    echo -e "${GRAY}Command: $cmd${NC}"
    
    if eval "$cmd"; then
        if [ -f "game.wasm" ]; then
            local size_bytes=$(stat -c%s "game.wasm" 2>/dev/null || stat -f%z "game.wasm" 2>/dev/null || echo "0")
            local size_kb=$(echo "scale=1; $size_bytes / 1024" | bc -l 2>/dev/null || echo "0")
            echo -e "${GREEN}game.wasm built successfully ($size_kb KB)${NC}"
            return 0
        else
            echo -e "${RED}game.wasm build failed - file not created${NC}"
            return 1
        fi
    else
        echo -e "${RED}game.wasm build failed${NC}"
        return 1
    fi
}

# Function to build host WASM
build_host_wasm() {
    echo -e "${CYAN}Building game-host.wasm...${NC}"
    
    local cmd='em++ src/wasm/game-host.cpp -O3 -s STANDALONE_WASM=1 -s EXPORTED_FUNCTIONS="[\"_game_init\",\"_game_create_state\",\"_game_update\",\"_game_handle_input\",\"_game_get_state\",\"_game_get_state_size\",\"_game_apply_state\",\"_game_destroy\",\"_malloc\",\"_free\"]" -s EXPORTED_RUNTIME_METHODS="[\"ccall\",\"cwrap\"]" -s ALLOW_MEMORY_GROWTH=1 -s WASM_BIGINT=1 -o ./game-host.wasm'
    echo -e "${GRAY}Command: $cmd${NC}"
    
    if eval "$cmd"; then
        if [ -f "game-host.wasm" ]; then
            local size_bytes=$(stat -c%s "game-host.wasm" 2>/dev/null || stat -f%z "game-host.wasm" 2>/dev/null || echo "0")
            local size_kb=$(echo "scale=1; $size_bytes / 1024" | bc -l 2>/dev/null || echo "0")
            echo -e "${GREEN}game-host.wasm built successfully ($size_kb KB)${NC}"
            return 0
        else
            echo -e "${RED}game-host.wasm build failed - file not created${NC}"
            return 1
        fi
    else
        echo -e "${RED}game-host.wasm build failed${NC}"
        return 1
    fi
}

# Execute builds based on type
success=true

case $BUILD_TYPE in
    'dev')
        build_game_wasm "dev" || success=false
        ;;
    'prod')
        build_game_wasm "prod" || success=false
        ;;
    'prod-safe')
        build_game_wasm "prod-safe" || success=false
        ;;
    'host')
        build_host_wasm || success=false
        ;;
    'all')
        echo -e "${CYAN}Building all WASM modules...${NC}"
        build_game_wasm "prod" && build_host_wasm || success=false
        ;;
    *)
        build_game_wasm "prod" || success=false
        ;;
esac

if [ "$success" = true ]; then
    echo -e "${GREEN}WASM build completed successfully!${NC}"
    
    # Show build artifacts
    echo ""
    echo -e "${CYAN}Build artifacts:${NC}"
    for wasm_file in *.wasm; do
        if [ -f "$wasm_file" ]; then
            local size_bytes=$(stat -c%s "$wasm_file" 2>/dev/null || stat -f%z "$wasm_file" 2>/dev/null || echo "0")
            local size_kb=$(echo "scale=1; $size_bytes / 1024" | bc -l 2>/dev/null || echo "0")
            echo -e "  ${NC}$wasm_file - $size_kb KB${NC}"
        fi
    done
    
    echo ""
    echo -e "${CYAN}Usage:${NC}"
    echo -e "  ${NC}npm run wasm:build      - Build production game.wasm${NC}"
    echo -e "  ${NC}npm run wasm:build:dev  - Build development game.wasm${NC}"
    echo -e "  ${NC}npm run wasm:build:host - Build game-host.wasm${NC}"
    echo -e "  ${NC}npm run wasm:build:all  - Build all WASM modules${NC}"
else
    echo -e "${RED}WASM build failed!${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  ${NC}1. Check that all C++ header files are properly defined${NC}"
    echo -e "  ${NC}2. Ensure all enum values and struct members exist${NC}"
    echo -e "  ${NC}3. Verify function declarations match their usage${NC}"
    echo -e "  ${NC}4. Run: npm run wasm:build:dev for debug build with more info${NC}"
    exit 1
fi