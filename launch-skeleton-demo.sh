#!/bin/bash

# Skeleton Physics Demo Launcher
# Simple script to launch the interactive skeleton physics demo

echo "=================================================="
echo "🦴 Skeleton Physics Demo Launcher"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "public/demos/interactive-skeleton-physics.html" ]; then
    echo "❌ Error: Cannot find demo file."
    echo "   Please run this script from the project root directory."
    exit 1
fi

echo "✓ Demo files found"
echo ""

# Check if WASM is built
if [ -f "public/wasm/skeleton-physics.wasm" ] && [ -f "public/wasm/skeleton-physics.js" ]; then
    echo "✓ WebAssembly module detected (best performance!)"
    MODE="WASM"
else
    echo "ℹ JavaScript fallback mode (fully functional)"
    echo "  Tip: Run 'npm run wasm:build:skeleton' for better performance"
    MODE="JavaScript"
fi

echo ""
echo "Starting HTTP server on port 8080..."
echo ""

# Try to use npm serve if available, otherwise fall back to Python
if command -v npx &> /dev/null; then
    echo "Using 'npx serve'..."
    echo ""
    echo "=================================================="
    echo "Demo URLs:"
    echo "  Main Demo:  http://localhost:8080/demos/interactive-skeleton-physics.html"
    echo "  Test Page:  http://localhost:8080/demos/test-skeleton-demo.html"
    echo "  Docs:       http://localhost:8080/demos/GETTING_STARTED.md"
    echo ""
    echo "Mode: $MODE"
    echo "=================================================="
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    npx serve public -p 8080
    
elif command -v python3 &> /dev/null; then
    echo "Using Python 3..."
    echo ""
    echo "=================================================="
    echo "Demo URLs:"
    echo "  Main Demo:  http://localhost:8080/demos/interactive-skeleton-physics.html"
    echo "  Test Page:  http://localhost:8080/demos/test-skeleton-demo.html"
    echo "  Docs:       http://localhost:8080/demos/GETTING_STARTED.md"
    echo ""
    echo "Mode: $MODE"
    echo "=================================================="
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    cd public
    python3 -m http.server 8080
    
else
    echo "❌ Error: No HTTP server available."
    echo "   Please install Node.js (for npx) or Python 3"
    exit 1
fi
