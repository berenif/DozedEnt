#!/usr/bin/env node

/**
 * Simple test script to check if game resources are accessible
 */

import http from 'http';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: 'GET'
        };
        
        const req = http.request(options, (res) => {
            resolve({
                status: res.statusCode,
                headers: res.headers,
                path: path
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.end();
    });
}

async function testGameResources() {
    console.log('🧪 Testing game resource accessibility...');
    
    const resources = [
        '/',
        '/js/site.js',
        '/game.wasm',
        '/js/src/wasm/wasm-manager.js',
        '/js/src/utils/wasm.js',
        '/js/src/utils/rng.js',
        '/js/src/game/game-state-manager.js',
        '/js/src/ui/ui-coordinator.js',
        '/js/src/css/base.css',
        '/js/src/css/game-viewport.css',
        '/js/src/css/loading.css'
    ];
    
    const results = [];
    
    for (const resource of resources) {
        try {
            const result = await makeRequest(resource);
            results.push({
                path: resource,
                status: result.status,
                contentType: result.headers['content-type'],
                success: result.status === 200
            });
        } catch (error) {
            results.push({
                path: resource,
                status: 'ERROR',
                error: error.message,
                success: false
            });
        }
    }
    
    console.log('\n📊 Resource Test Results:');
    console.log('='.repeat(80));
    
    let successCount = 0;
    let errorCount = 0;
    
    results.forEach((result, i) => {
        const status = result.success ? '✅' : '❌';
        const contentType = result.contentType ? ` (${result.contentType})` : '';
        const error = result.error ? ` - ${result.error}` : '';
        
        console.log(`${status} ${result.path} - ${result.status}${contentType}${error}`);
        
        if (result.success) {
            successCount++;
        } else {
            errorCount++;
        }
    });
    
    console.log('='.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errorCount === 0) {
        console.log('\n🎉 All resources are accessible! Game should load without network errors.');
    } else {
        console.log('\n🔧 Some resources failed to load. This may cause console errors.');
    }
    
    // Check for potential issues
    const wasmResult = results.find(r => r.path === '/game.wasm');
    if (wasmResult && wasmResult.success) {
        if (wasmResult.contentType !== 'application/wasm') {
            console.log('\n⚠️ WARNING: WASM file has incorrect MIME type. Expected "application/wasm", got:', wasmResult.contentType);
        } else {
            console.log('\n✅ WASM file has correct MIME type');
        }
    }
    
    const jsResult = results.find(r => r.path === '/js/site.js');
    if (jsResult && jsResult.success) {
        if (jsResult.contentType !== 'application/javascript') {
            console.log('\n⚠️ WARNING: JavaScript file has incorrect MIME type. Expected "application/javascript", got:', jsResult.contentType);
        } else {
            console.log('\n✅ JavaScript file has correct MIME type');
        }
    }
}

testGameResources().catch(console.error);