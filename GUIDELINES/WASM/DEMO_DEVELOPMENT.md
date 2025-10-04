# WASM Demo Development Guide

## Overview

This guide provides a step-by-step approach to creating WASM-powered demos that showcase specific features or mechanics.

## Demo Structure

### Standard Demo Layout
```
public/src/demos/
├── physics/
│   ├── physics-knockback-demo.html    # HTML entry point
│   ├── physics-knockback-demo.js      # Demo logic
│   └── physics-knockback-demo.css     # Demo styles
├── animation/
│   └── ...
└── combat/
    └── ...
```

## Step-by-Step: Creating a Demo

### Step 1: Create HTML Entry Point

**File**: `public/src/demos/your-category/your-demo.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Demo - Feature Name</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Courier New', monospace;
            background: #1a1a2e;
            color: #e9e9e9;
        }
        
        #canvas {
            display: block;
            margin: 20px auto;
            border: 2px solid #4ecdc4;
            background: #16213e;
        }
        
        .controls {
            max-width: 800px;
            margin: 20px auto;
            padding: 20px;
            background: rgba(78, 205, 196, 0.1);
            border-radius: 8px;
        }
        
        button {
            background: #4ecdc4;
            color: #1a1a2e;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-weight: bold;
        }
        
        button:hover {
            background: #95e1d3;
        }
        
        #loading {
            text-align: center;
            margin-top: 50px;
            font-size: 18px;
            color: #4ecdc4;
        }
    </style>
</head>
<body>
    <div id="loading">Loading WASM module...</div>
    
    <canvas id="canvas" width="800" height="600" style="display: none;"></canvas>
    
    <div class="controls" style="display: none;">
        <h2>🎮 Your Demo - Feature Name</h2>
        <p>Description of what this demo showcases.</p>
        
        <div>
            <button onclick="testFeature()">Test Feature</button>
            <button onclick="resetDemo()">Reset</button>
        </div>
        
        <div id="stats"></div>
    </div>
    
    <script type="module" src="./your-demo.js"></script>
</body>
</html>
```

### Step 2: Create Demo JavaScript

**File**: `public/src/demos/your-category/your-demo.js`

```javascript
import { loadWasm } from '../../utils/wasm.js';

// Canvas setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// State
let wasmExports = null;
let isInitialized = false;
let lastTime = performance.now();

/**
 * Initialize WASM module
 */
async function initWasm() {
    try {
        console.log('Loading WASM module...');
        
        // Use the lightweight wasm.js loader for demos
        const { exports, memory } = await loadWasm('../../wasm/game.wasm');
        
        wasmExports = exports;
        console.log('WASM loaded. Available exports:', Object.keys(exports).sort());
        
        // Initialize game with deterministic seed
        if (typeof exports.init_run === 'function') {
            exports.init_run(BigInt(12345), 0);
            console.log('Game initialized with seed 12345');
        }
        
        // Verify required functions exist
        const requiredFunctions = [
            'update',
            'get_x',
            'get_y',
            // Add your required functions here
        ];
        
        const missingFunctions = requiredFunctions.filter(
            fn => typeof exports[fn] !== 'function'
        );
        
        if (missingFunctions.length > 0) {
            throw new Error(
                `Missing required WASM functions: ${missingFunctions.join(', ')}\n` +
                'The WASM module may need to be rebuilt with these features.'
            );
        }
        
        // Demo is ready
        isInitialized = true;
        document.getElementById('loading').style.display = 'none';
        document.getElementById('canvas').style.display = 'block';
        document.querySelector('.controls').style.display = 'block';
        
        // Start render loop
        requestAnimationFrame(render);
        
    } catch (error) {
        console.error('WASM initialization failed:', error);
        document.getElementById('loading').textContent = `Error: ${error.message}`;
        document.getElementById('loading').style.color = '#ff6b6b';
    }
}

/**
 * Main render loop
 */
function render(currentTime) {
    if (!wasmExports || !isInitialized) {
        requestAnimationFrame(render);
        return;
    }
    
    try {
        // Calculate delta time (capped at 50ms to prevent spiral of death)
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;
        
        // Update WASM simulation
        if (typeof wasmExports.update === 'function') {
            wasmExports.update(deltaTime);
        }
        
        // Read state from WASM
        const x = wasmExports.get_x();
        const y = wasmExports.get_y();
        // Add your state reads here
        
        // Clear canvas
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw your visualization here
        drawPlayer(x, y);
        
        // Update stats display
        updateStats();
        
    } catch (error) {
        console.error('Render error:', error);
        document.getElementById('loading').textContent = `Render error: ${error.message}`;
        document.getElementById('loading').style.display = 'block';
        return; // Stop rendering on error
    }
    
    requestAnimationFrame(render);
}

/**
 * Draw player at position
 */
function drawPlayer(x, y) {
    const screenX = x * canvas.width;
    const screenY = (1 - y) * canvas.height; // Flip Y axis
    
    ctx.fillStyle = '#4ecdc4';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Update stats display
 */
function updateStats() {
    if (!wasmExports) {
        return;
    }
    
    const x = wasmExports.get_x();
    const y = wasmExports.get_y();
    
    document.getElementById('stats').innerHTML = `
        <div><strong>Position:</strong> (${x.toFixed(3)}, ${y.toFixed(3)})</div>
    `;
}

/**
 * Test your feature
 */
window.testFeature = function() {
    if (!wasmExports || !isInitialized) {
        console.warn('WASM not initialized yet');
        return;
    }
    
    console.log('Testing feature...');
    // Call your WASM function here
};

/**
 * Reset demo
 */
window.resetDemo = function() {
    if (!wasmExports || !isInitialized) {
        return;
    }
    
    if (typeof wasmExports.init_run === 'function') {
        wasmExports.init_run(BigInt(12345), 0);
        console.log('Demo reset');
    }
};

// Initialize when page loads
initWasm();
```

### Step 3: Add Demo-Specific Features

Customize the demo based on what you're showcasing:

#### Example: Physics Demo
```javascript
function drawPhysicsVisualization() {
    // Draw velocity vectors
    const vx = wasmExports.get_physics_player_vel_x();
    const vy = wasmExports.get_physics_player_vel_y();
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + vx * 100, screenY - vy * 100);
    ctx.stroke();
}

window.applyKnockback = function(dx, dy, force) {
    if (typeof wasmExports.apply_physics_knockback === 'function') {
        wasmExports.apply_physics_knockback(dx, dy, force);
        console.log(`Knockback applied: (${dx}, ${dy}) with force ${force}`);
    }
};
```

#### Example: Animation Demo
```javascript
function drawAnimationState() {
    const animState = wasmExports.get_player_anim_state();
    const animTime = wasmExports.get_anim_time();
    
    // Draw animation frame indicator
    ctx.fillStyle = '#95e1d3';
    ctx.font = '14px monospace';
    ctx.fillText(`Animation: ${animState} (${animTime.toFixed(2)}s)`, 10, 20);
}
```

## Best Practices

### 1. Use Lightweight Loader for Demos
```javascript
// ✅ GOOD - For demos
import { loadWasm } from '../../utils/wasm.js';

// ❌ OVERKILL - For simple demos
import { WasmManager } from '../../utils/wasm-manager.js';
```

### 2. Deterministic Seeds
```javascript
// ✅ GOOD - Fixed seed for reproducibility
exports.init_run(BigInt(12345), 0);

// ❌ BAD - Random seed makes debugging hard
exports.init_run(BigInt(Date.now()), 0);
```

### 3. Graceful Error Handling
```javascript
// ✅ GOOD - User-friendly error messages
try {
    await loadWasm('game.wasm');
} catch (error) {
    document.getElementById('loading').textContent = 
        `Failed to load demo: ${error.message}\n` +
        'Please ensure the WASM module is built and accessible.';
}

// ❌ BAD - Silent failure
await loadWasm('game.wasm').catch(() => {});
```

### 4. Feature Detection
```javascript
// ✅ GOOD - Check for feature availability
if (typeof exports.apply_physics_knockback === 'function') {
    // Use feature
} else {
    console.warn('Physics knockback not available in this WASM build');
    // Show warning to user
}

// ❌ BAD - Assume feature exists
exports.apply_physics_knockback(1, 0, 10); // May crash
```

### 5. Fixed Timestep for Physics
```javascript
// ✅ GOOD - Fixed timestep with accumulator
let accumulator = 0;
const FIXED_DT = 1/60;

function update(deltaTime) {
    accumulator += deltaTime;
    
    while (accumulator >= FIXED_DT) {
        exports.update(FIXED_DT);
        accumulator -= FIXED_DT;
    }
}

// ❌ BAD - Variable timestep
function update(deltaTime) {
    exports.update(deltaTime); // Causes physics instability
}
```

### 6. Visual Feedback
```javascript
// ✅ GOOD - Show what's happening
function applyKnockback(dx, dy, force) {
    exports.apply_physics_knockback(dx, dy, force);
    
    // Visual feedback
    flashEffect();
    playSound('knockback');
    
    // Console feedback for debugging
    console.log(`Knockback: direction=(${dx}, ${dy}), force=${force}`);
}

// ❌ BAD - Silent action
function applyKnockback(dx, dy, force) {
    exports.apply_physics_knockback(dx, dy, force);
}
```

## Common Patterns

### Pattern: Determinism Testing
```javascript
window.testDeterminism = async function() {
    console.log('Running determinism test...');
    
    // Run 1
    exports.init_run(BigInt(54321), 0);
    exports.apply_physics_knockback(1, 0, 20);
    for (let i = 0; i < 60; i++) {
        exports.update(1/60);
    }
    const pos1 = { x: exports.get_x(), y: exports.get_y() };
    
    // Run 2 (same seed)
    exports.init_run(BigInt(54321), 0);
    exports.apply_physics_knockback(1, 0, 20);
    for (let i = 0; i < 60; i++) {
        exports.update(1/60);
    }
    const pos2 = { x: exports.get_x(), y: exports.get_y() };
    
    // Compare
    const deterministic = pos1.x === pos2.x && pos1.y === pos2.y;
    console.log(deterministic ? '✅ DETERMINISTIC' : '❌ NON-DETERMINISTIC');
    console.log('Run 1:', pos1);
    console.log('Run 2:', pos2);
};
```

### Pattern: Interactive Controls
```javascript
// Keyboard controls
document.addEventListener('keydown', (event) => {
    if (!wasmExports || !isInitialized) {
        return;
    }
    
    switch(event.key) {
        case 'ArrowUp':
            applyKnockback(0, 1, 15);
            break;
        case 'ArrowDown':
            applyKnockback(0, -1, 15);
            break;
        case 'ArrowLeft':
            applyKnockback(-1, 0, 15);
            break;
        case 'ArrowRight':
            applyKnockback(1, 0, 15);
            break;
        case 'r':
            resetDemo();
            break;
    }
});
```

### Pattern: Performance Monitoring
```javascript
let frameCount = 0;
let fps = 60;
let fpsUpdateTime = performance.now();

function updateFPS(currentTime) {
    frameCount++;
    
    if (currentTime - fpsUpdateTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        fpsUpdateTime = currentTime;
    }
    
    // Display
    ctx.fillStyle = '#4ecdc4';
    ctx.font = '14px monospace';
    ctx.fillText(`FPS: ${fps}`, canvas.width - 80, 20);
}
```

## Anti-Patterns to Avoid

### ❌ Don't Duplicate WASI Logic
```javascript
// BAD - Reinventing wasm.js
function createWasiShim(getMemory) {
    return {
        fd_write: (fd, iovPtr, iovCnt, nwrittenPtr) => {
            // 50+ lines of duplicate code
        }
    };
}

// Use this instead
import { loadWasm } from '../../utils/wasm.js';
const { exports } = await loadWasm('game.wasm'); // WASI included
```

### ❌ Don't Skip Error Handling
```javascript
// BAD - Assumes everything works
const { exports } = await loadWasm('game.wasm');
exports.special_function(); // May not exist

// GOOD - Defensive programming
if (typeof exports.special_function === 'function') {
    exports.special_function();
} else {
    console.warn('special_function not available');
    showFeatureUnavailableMessage();
}
```

### ❌ Don't Use Inline Styles Excessively
```javascript
// BAD - Inline styles everywhere
canvas.style.cssText = 'display: block; margin: 20px auto; border: 2px solid #4ecdc4;';

// GOOD - CSS file or style tag
// Defined in HTML <style> section
```

## Debugging Tips

### 1. Log Available Exports
```javascript
console.log('WASM exports:', Object.keys(exports).sort());
```

### 2. Check WASM_EXPORTS.json
Before creating a demo, check what's available:
```bash
cat public/WASM_EXPORTS.json
```

### 3. Use Browser DevTools
- Set breakpoints in demo code
- Check console for WASM errors
- Monitor performance in Performance tab
- Check memory in Memory profiler

### 4. Test Determinism
Always verify your demo produces consistent results:
```javascript
// Same seed + inputs = same output
exports.init_run(BigInt(12345), 0);
// Apply actions...
// Compare results
```

## Example Demos

Refer to existing demos for inspiration:
- `public/src/demos/physics/physics-knockback-demo.js` - Physics visualization
- Other demos in `public/src/demos/`

## Checklist

Before submitting your demo:
- [ ] HTML entry point created
- [ ] Uses `loadWasm` from `utils/wasm.js` (not duplicate WASI)
- [ ] Error handling for WASM load failures
- [ ] Feature detection for optional WASM functions
- [ ] Deterministic seed for reproducibility
- [ ] Visual feedback for actions
- [ ] Performance monitoring (FPS counter)
- [ ] Reset button to restart demo
- [ ] Console logging for debugging
- [ ] Comments explaining non-obvious code
- [ ] User-friendly error messages
- [ ] Tested in multiple browsers

## Summary

- Keep demos **simple and focused** on one feature
- Use **`wasm.js`** loader (not WasmManager)
- **Don't duplicate** WASI shim logic
- Use **deterministic seeds** for reproducibility
- Add **visual feedback** and logging
- Handle **errors gracefully**
- Test for **determinism**
- Include **reset** functionality
- Monitor **performance** (FPS)

Happy demo building! 🎮
