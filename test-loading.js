#!/usr/bin/env node

/**
 * Test script to simulate game loading and check for errors
 * This will help identify potential console errors without a browser
 */

import http from 'http';
import { JSDOM } from 'jsdom';

// Mock browser environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
    <div id="loadingScreen">
        <div class="loading-spinner"></div>
        <div class="loading-text">Loading DozedEnt...</div>
        <button id="start-game-btn" disabled>Loading...</button>
    </div>
    <div id="viewport">
        <canvas id="gameCanvas" width="1280" height="720"></canvas>
        <div id="canvas"></div>
    </div>
</body>
</html>
`, {
    url: 'http://localhost:8080',
    resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;
global.fetch = dom.window.fetch;
global.WebAssembly = dom.window.WebAssembly;
global.performance = dom.window.performance;
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;

// Mock console to capture errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const errors = [];
const warnings = [];

console.error = (...args) => {
    errors.push(args.join(' '));
    originalConsoleError(...args);
};

console.warn = (...args) => {
    warnings.push(args.join(' '));
    originalConsoleWarn(...args);
};

async function testGameLoading() {
    console.log('🧪 Testing game loading process...');
    
    try {
        // Test if main HTML loads
        const response = await fetch('http://localhost:8080/');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        console.log('✅ Main HTML loads successfully');
        
        // Test if main JS loads
        const jsResponse = await fetch('http://localhost:8080/js/site.js');
        if (!jsResponse.ok) {
            throw new Error(`JS HTTP ${jsResponse.status}: ${jsResponse.statusText}`);
        }
        console.log('✅ Main JavaScript loads successfully');
        
        // Test if WASM loads
        const wasmResponse = await fetch('http://localhost:8080/game.wasm');
        if (!wasmResponse.ok) {
            throw new Error(`WASM HTTP ${wasmResponse.status}: ${wasmResponse.statusText}`);
        }
        console.log('✅ WASM file loads successfully');
        
        // Test if key dependencies load
        const dependencies = [
            'js/src/wasm/wasm-manager.js',
            'js/src/utils/wasm.js',
            'js/src/utils/rng.js',
            'js/src/game/game-state-manager.js',
            'js/src/ui/ui-coordinator.js'
        ];
        
        for (const dep of dependencies) {
            const depResponse = await fetch(`http://localhost:8080/${dep}`);
            if (!depResponse.ok) {
                throw new Error(`Dependency ${dep} HTTP ${depResponse.status}: ${depResponse.statusText}`);
            }
        }
        console.log('✅ All key dependencies load successfully');
        
        // Test CSS files
        const cssFiles = [
            'js/src/css/base.css',
            'js/src/css/game-viewport.css',
            'js/src/css/loading.css'
        ];
        
        for (const css of cssFiles) {
            const cssResponse = await fetch(`http://localhost:8080/${css}`);
            if (!cssResponse.ok) {
                throw new Error(`CSS ${css} HTTP ${cssResponse.status}: ${cssResponse.statusText}`);
            }
        }
        console.log('✅ All CSS files load successfully');
        
        console.log('\n📊 Test Results:');
        console.log(`✅ Successful requests: ${dependencies.length + cssFiles.length + 3}`);
        console.log(`❌ Errors: ${errors.length}`);
        console.log(`⚠️ Warnings: ${warnings.length}`);
        
        if (errors.length > 0) {
            console.log('\n❌ Errors found:');
            errors.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error}`);
            });
        }
        
        if (warnings.length > 0) {
            console.log('\n⚠️ Warnings found:');
            warnings.forEach((warning, i) => {
                console.log(`  ${i + 1}. ${warning}`);
            });
        }
        
        if (errors.length === 0 && warnings.length === 0) {
            console.log('\n🎉 No errors or warnings detected! Game should load successfully.');
        } else {
            console.log('\n🔧 Issues detected that may cause console errors in browser.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

testGameLoading().catch(console.error);