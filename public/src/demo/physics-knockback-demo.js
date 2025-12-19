import { loadWasm } from '../../utils/wasm.js';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let wasmExports = null;
let isInitialized = false;

async function initWasm() {
    try {
        console.log('Loading WASM module...');
        
        // Use the lightweight wasm.js loader - includes WASI shim automatically
        const { exports, memory } = await loadWasm('../../wasm/game.wasm');
        
        wasmExports = exports;

        console.log('WASM loaded successfully');
        console.log('Available exports:', Object.keys(wasmExports).sort());
        
        // Check for required physics functions
        const requiredFunctions = [
            'get_physics_player_x',
            'get_physics_player_y',
            'get_physics_player_vel_x',
            'get_physics_player_vel_y',
            'apply_physics_knockback'
        ];
        
        const missingFunctions = requiredFunctions.filter(
            fn => typeof wasmExports[fn] !== 'function'
        );

        if (missingFunctions.length > 0) {
            console.warn('⚠️ Missing physics functions:', missingFunctions);
            console.warn('⚠️ The WASM module may need to be rebuilt with physics support.');
            console.warn('⚠️ Demo will use fallback functions with limited functionality.');
        } else {
            console.log('✅ All physics functions available');
            // Log initial physics state
            console.log('Initial physics state:');
            console.log('  Position:', wasmExports.get_physics_player_x(), wasmExports.get_physics_player_y());
            console.log('  Velocity:', wasmExports.get_physics_player_vel_x(), wasmExports.get_physics_player_vel_y());
        }

        // Initialize with fixed seed for determinism
        if (typeof wasmExports.init_run === 'function') {
            wasmExports.init_run(BigInt(12345), 0);
            console.log('Game initialized with seed 12345');
        }

        isInitialized = true;
        document.getElementById('loading').style.display = 'none';
        requestAnimationFrame(render);
    } catch (error) {
        console.error('WASM initialization failed:', error);
        document.getElementById('loading').textContent = 
            `Failed to load WASM module: ${error.message}\n\n` +
            'Please ensure:\n' +
            '1. The WASM module is built (npm run wasm:build)\n' +
            '2. The file exists at public/wasm/game.wasm\n' +
            '3. Your browser supports WebAssembly';
        document.getElementById('loading').style.color = '#ff6b6b';
    }
}

window.applyKnockback = function(dx, dy, force) {
    if (!wasmExports || !isInitialized) {
        console.warn('⚠️ WASM not initialized yet');
        return;
    }
    
    if (typeof wasmExports.apply_physics_knockback !== 'function') {
        console.warn('⚠️ apply_physics_knockback not available in this WASM build');
        return;
    }
    
    try {
        console.log(`🚀 Applying knockback: direction=(${dx}, ${dy}), force=${force}`);
        wasmExports.apply_physics_knockback(dx, dy, force);

        // Log velocity after applying knockback
        if (typeof wasmExports.get_physics_player_vel_x === 'function' &&
            typeof wasmExports.get_physics_player_vel_y === 'function') {
            const vx = wasmExports.get_physics_player_vel_x();
            const vy = wasmExports.get_physics_player_vel_y();
            console.log(`  ✅ New velocity: (${vx.toFixed(3)}, ${vy.toFixed(3)})`);
        }
    } catch (error) {
        console.error('❌ Knockback failed:', error);
    }
};

window.resetDemo = function() {
    if (!wasmExports || !isInitialized) {
        console.warn('⚠️ WASM not initialized yet');
        return;
    }
    
    try {
        if (typeof wasmExports.init_run === 'function') {
            wasmExports.init_run(BigInt(12345), 0);
            console.log('🔄 Demo reset to initial state');
            document.getElementById('test-results').innerHTML = '';
        }
    } catch (error) {
        console.error('❌ Reset failed:', error);
    }
};

window.testDeterminism = async function() {
    if (!wasmExports || !isInitialized) {
        console.warn('⚠️ WASM not initialized yet');
        return;
    }

    const resultsDiv = document.getElementById('test-results');

    // Check if required functions are available
    const requiredFunctions = [
        'init_run',
        'update', 
        'apply_physics_knockback',
        'get_physics_player_x',
        'get_physics_player_y',
        'get_physics_player_vel_x',
        'get_physics_player_vel_y'
    ];
    
    const missingFunctions = requiredFunctions.filter(
        fn => typeof wasmExports[fn] !== 'function'
    );
    
    if (missingFunctions.length > 0) {
        resultsDiv.innerHTML = 
            '<div class="test-result test-fail">' +
            '❌ Physics functions not available: ' + missingFunctions.join(', ') + '<br>' +
            'Rebuild WASM with physics support.' +
            '</div>';
        console.error('❌ Missing functions:', missingFunctions);
        return;
    }

    console.log('🧪 Running determinism test...');
    resultsDiv.innerHTML = '<div style="color: #95e1d3;">🧪 Running determinism test...</div>';

    try {
        // Test 1: Same seed and inputs should produce same result
        wasmExports.init_run(BigInt(54321), 0);
        wasmExports.apply_physics_knockback(1, 0, 20);

        // Simulate 60 frames with fixed timestep
        for (let i = 0; i < 60; i++) {
            wasmExports.update(1.0 / 60.0);
        }

        const pos1 = {
            x: wasmExports.get_physics_player_x(),
            y: wasmExports.get_physics_player_y(),
            vx: wasmExports.get_physics_player_vel_x(),
            vy: wasmExports.get_physics_player_vel_y()
        };

        console.log('  Run 1 result:', pos1);

        // Reset and repeat with same seed
        wasmExports.init_run(BigInt(54321), 0);
        wasmExports.apply_physics_knockback(1, 0, 20);

        for (let i = 0; i < 60; i++) {
            wasmExports.update(1.0 / 60.0);
        }

        const pos2 = {
            x: wasmExports.get_physics_player_x(),
            y: wasmExports.get_physics_player_y(),
            vx: wasmExports.get_physics_player_vel_x(),
            vy: wasmExports.get_physics_player_vel_y()
        };

        console.log('  Run 2 result:', pos2);

        // Compare results (must be exactly identical)
        const posMatch = pos1.x === pos2.x && pos1.y === pos2.y;
        const velMatch = pos1.vx === pos2.vx && pos1.vy === pos2.vy;
        const deterministic = posMatch && velMatch;

        let resultHTML = '<div class="test-result ' + (deterministic ? 'test-pass' : 'test-fail') + '">';
        resultHTML += deterministic ? '✅ DETERMINISM TEST PASSED' : '❌ DETERMINISM TEST FAILED';
        resultHTML += '</div>';
        resultHTML += '<div style="margin-top: 8px; font-size: 11px;">';
        resultHTML += `<strong>Run 1:</strong> Position (${pos1.x.toFixed(4)}, ${pos1.y.toFixed(4)}), `;
        resultHTML += `Velocity (${pos1.vx.toFixed(4)}, ${pos1.vy.toFixed(4)})<br>`;
        resultHTML += `<strong>Run 2:</strong> Position (${pos2.x.toFixed(4)}, ${pos2.y.toFixed(4)}), `;
        resultHTML += `Velocity (${pos2.vx.toFixed(4)}, ${pos2.vy.toFixed(4)})<br>`;
        resultHTML += `<strong>Match:</strong> Position ${posMatch ? '✓' : '✗'}, Velocity ${velMatch ? '✓' : '✗'}`;
        resultHTML += '</div>';

        resultsDiv.innerHTML = resultHTML;

        console.log(deterministic ? '✅ Determinism test PASSED' : '❌ Determinism test FAILED');

        // Reset to demo state
        wasmExports.init_run(BigInt(12345), 0);
        
    } catch (error) {
        console.error('❌ Determinism test failed with error:', error);
        resultsDiv.innerHTML = 
            '<div class="test-result test-fail">' +
            '❌ TEST ERROR: ' + error.message +
            '</div>';
    }
};

let lastTime = performance.now();
let frameCount = 0;
let fps = 60;
let accumulator = 0;
const FIXED_DT = 1/60; // 60 FPS fixed timestep

function render(currentTime) {
    if (!wasmExports || !isInitialized) {
        requestAnimationFrame(render);
        return;
    }

    try {
        // Calculate delta time (cap at 0.05s to prevent spiral of death)
        const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.05);
        lastTime = currentTime;
        accumulator += deltaTime;

        // Update FPS counter
        frameCount++;
        if (frameCount % 60 === 0) {
            fps = Math.round(1.0 / deltaTime);
        }

        // Fixed timestep update loop (prevents large jumps)
        let steps = 0;
        while (accumulator >= FIXED_DT && steps < 4) {
            if (typeof wasmExports.update === 'function') {
                wasmExports.update(FIXED_DT);
            }
            accumulator -= FIXED_DT;
            steps++;
        }

        // Clamp accumulator to prevent spiral of death
        if (accumulator > FIXED_DT) {
            accumulator = FIXED_DT;
        }

        // Get player state - try physics functions first, fallback to standard
        let px; let py; let vx; let vy; let perfMs;

        if (typeof wasmExports.get_physics_player_x === 'function') {
            px = wasmExports.get_physics_player_x();
            py = wasmExports.get_physics_player_y();
            vx = wasmExports.get_physics_player_vel_x();
            vy = wasmExports.get_physics_player_vel_y();
            perfMs = wasmExports.get_physics_perf_ms();
        } else {
            // Fallback to standard functions
            px = wasmExports.get_x ? wasmExports.get_x() : 0.5;
            py = wasmExports.get_y ? wasmExports.get_y() : 0.5;
            vx = 0;
            vy = 0;
            perfMs = 0;
        }

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = 'rgba(78, 205, 196, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Convert normalized position (0..1) to screen coordinates
        const screenX = px * canvas.width;
        const screenY = (1 - py) * canvas.height;  // Flip Y axis

        // Draw velocity vector
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > 0.001) {
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + vx * 100, screenY - vy * 100);  // Scale for visibility
            ctx.stroke();

            // Arrow head
            const angle = Math.atan2(-vy, vx);
            const arrowSize = 10;
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.moveTo(screenX + vx * 100, screenY - vy * 100);
            ctx.lineTo(
                screenX + vx * 100 - arrowSize * Math.cos(angle - Math.PI / 6),
                screenY - vy * 100 + arrowSize * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
                screenX + vx * 100 - arrowSize * Math.cos(angle + Math.PI / 6),
                screenY - vy * 100 + arrowSize * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
        }

        // Draw player
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#4ecdc4';
        ctx.fillStyle = '#4ecdc4';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw player center
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Update stats
        const speedVal = Math.sqrt(vx * vx + vy * vy);
        document.getElementById('stats').innerHTML = `
            <div><span class="stats-label">FPS:</span> ${fps}</div>
            <div><span class="stats-label">Position:</span> (${px.toFixed(3)}, ${py.toFixed(3)})</div>
            <div><span class="stats-label">Velocity:</span> (${vx.toFixed(3)}, ${vy.toFixed(3)})</div>
            <div><span class="stats-label">Speed:</span> ${speedVal.toFixed(3)} m/s</div>
            <div><span class="stats-label">Physics:</span> ${perfMs.toFixed(2)} ms</div>
        `;
    } catch (error) {
        console.error('Render error:', error);
        document.getElementById('loading').textContent = `Render error: ${error.message}`;
        document.getElementById('loading').style.display = 'block';
        // Don't continue rendering if there's an error
        return;
    }

    requestAnimationFrame(render);
}

// Initialize when page loads
initWasm();


