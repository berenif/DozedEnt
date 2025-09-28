#!/usr/bin/env node

/**
 * Node.js WASM Test Script
 * Tests WASM loading and initialization outside of browser environment
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testWasmDirectly() {
    console.log('🚀 Starting direct WASM test...');

    try {
        // Load the WASM helper
        console.log('📥 Loading WASM helper...');
        const wasmPath = join(__dirname, 'src/utils/wasm.js');
        const wasmUrl = `file://${wasmPath.replace(/\\/g, '/')}`;
        const wasmModule = await import(wasmUrl);
        console.log('✅ WASM helper loaded');

        // Load the actual WASM file
        console.log('🔧 Loading WASM file...');
        const wasmFilePath = join(__dirname, 'public/game.wasm');

        // Read WASM file as bytes
        const wasmBytes = readFileSync(wasmFilePath);
        console.log(`📊 WASM file loaded: ${wasmBytes.length} bytes`);

        // Try to instantiate WASM directly
        console.log('⚙️ Instantiating WASM...');
        const { loadWasm } = wasmModule;

        const startTime = performance.now();
        const result = await loadWasm(wasmBytes);
        const loadTime = performance.now() - startTime;

        console.log(`✅ WASM instantiated in ${loadTime.toFixed(2)}ms`);
        console.log('📋 WASM exports:', Object.keys(result.exports));

        const { exports } = result;

        // Test WASM start function
        if (typeof exports.start === 'function') {
            console.log('🚀 Calling WASM start()...');
            const startStartTime = performance.now();

            try {
                exports.start();
                const startDuration = performance.now() - startStartTime;
                console.log(`✅ WASM start() completed in ${startDuration.toFixed(2)}ms`);
            } catch (startError) {
                console.error(`❌ WASM start() failed:`, startError.message);
                return;
            }
        }

        // Test basic functions
        console.log('🔍 Testing basic WASM functions...');

        try {
            const posX = exports.get_x?.();
            const posY = exports.get_y?.();
            console.log(`📍 Player position: ${posX}, ${posY}`);

            const stamina = exports.get_stamina?.();
            const hp = exports.get_hp?.();
            console.log(`📊 Player stats: stamina=${stamina}, hp=${hp}`);

            const phase = exports.get_phase?.();
            console.log(`🎮 Current phase: ${phase}`);

        } catch (funcError) {
            console.error('❌ Error testing WASM functions:', funcError.message);
        }

        // Test update function with timeout
        if (typeof exports.update === 'function') {
            console.log('🔄 Testing WASM update...');

            const updateStartTime = performance.now();
            const updateTimeout = setTimeout(() => {
                console.error('❌ WASM update timed out - infinite loop detected');
                process.exit(1);
            }, 2000); // 2 second timeout

            try {
                exports.update(0.016);
                clearTimeout(updateTimeout);
                const updateDuration = performance.now() - updateStartTime;
                console.log(`✅ WASM update completed in ${updateDuration.toFixed(2)}ms`);
            } catch (updateError) {
                clearTimeout(updateTimeout);
                console.error('❌ WASM update failed:', updateError.message);
            }
        }

        console.log('🏁 Direct WASM test completed successfully');

    } catch (error) {
        console.error('❌ Direct WASM test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

testWasmDirectly();
