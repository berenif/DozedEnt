#!/bin/bash
# Test script to verify workflow dependencies

echo "=== Testing Workflow Dependencies ==="
echo

# Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js installed: $(node --version)"
else
    echo "   ❌ Node.js not found"
    exit 1
fi

# Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    echo "   ✅ npm installed: $(npm --version)"
else
    echo "   ❌ npm not found"
    exit 1
fi

# Check balance data files
echo "3. Checking balance data files..."
if [ -f "data/balance/player.json" ]; then
    echo "   ✅ data/balance/player.json exists"
else
    echo "   ❌ data/balance/player.json missing"
    exit 1
fi

if [ -f "data/balance/enemies.json" ]; then
    echo "   ✅ data/balance/enemies.json exists"
else
    echo "   ❌ data/balance/enemies.json missing"
    exit 1
fi

# Test balance generation
echo "4. Testing balance generation..."
if npm run balance:gen > /dev/null 2>&1; then
    echo "   ✅ Balance generation successful"
else
    echo "   ❌ Balance generation failed"
    exit 1
fi

# Check if generated file exists
if [ -f "public/src/wasm/generated/balance_data.h" ]; then
    echo "   ✅ Generated balance_data.h exists"
else
    echo "   ❌ Generated balance_data.h missing"
    exit 1
fi

# Check for Emscripten (optional for this test)
echo "5. Checking Emscripten (optional)..."
if command -v em++ &> /dev/null; then
    echo "   ✅ Emscripten installed: $(em++ --version | head -n1)"
else
    echo "   ⚠️  Emscripten not found (will be installed in CI)"
fi

echo
echo "=== Workflow dependencies check complete ==="
echo
echo "Summary:"
echo "- Balance data files: ✅ Present"
echo "- Balance generation: ✅ Working"
echo "- Node.js/npm: ✅ Installed"
echo
echo "The workflow should now work correctly in GitHub Actions."
echo "The Emscripten SDK will be installed automatically during the CI run."