import {test, expect} from '@playwright/test'
import fs from 'fs'
import path from 'path'

test('Wolf Pack WASM Module: Compilation and API Export Verification', async ({page}) => {
  // Create a simple HTML page to test WASM loading
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Wolf Pack Test</title>
</head>
<body>
    <script>
        async function testWasmModule() {
            try {
                // Load the WASM file
                const wasmPath = './game.wasm';
                const wasmBytes = await fetch(wasmPath).then(r => r.arrayBuffer());
                
                // Instantiate the WASM module
                const wasmModule = await WebAssembly.instantiate(wasmBytes);
                const exports = wasmModule.instance.exports;
                
                // Test that our new API functions exist
                const requiredFunctions = [
                    'init_run',
                    'update', 
                    'get_enemy_count',
                    'spawn_wolves',
                    'clear_enemies',
                    // New wolf pack management functions
                    'get_wolf_pack_count',
                    'get_wolf_pack_active',
                    'get_wolf_pack_alive',
                    'get_wolf_pack_respawn_timer',
                    'get_wolf_pack_member_count'
                ];
                
                const results = {
                    wasmLoaded: true,
                    functionsExist: {},
                    allFunctionsExist: true,
                    initTest: false,
                    packCountTest: false,
                    error: null
                };
                
                // Check if all required functions exist
                for (const funcName of requiredFunctions) {
                    results.functionsExist[funcName] = typeof exports[funcName] === 'function';
                    if (!results.functionsExist[funcName]) {
                        results.allFunctionsExist = false;
                    }
                }
                
                // Test basic functionality if functions exist
                if (results.allFunctionsExist) {
                    try {
                        // Test initialization
                        exports.init_run(12345n, 0);
                        results.initTest = true;
                        
                        // Test pack count (should be 3 after init)
                        const packCount = exports.get_wolf_pack_count();
                        results.packCountTest = (packCount === 3);
                        
                        // Test pack status
                        let activePacks = 0;
                        for (let i = 0; i < 3; i++) {
                            if (exports.get_wolf_pack_active(i)) {
                                activePacks++;
                            }
                        }
                        results.activePacksCorrect = (activePacks === 3);
                        
                    } catch (err) {
                        results.error = err.message;
                    }
                }
                
                return results;
                
            } catch (error) {
                return {
                    wasmLoaded: false,
                    error: error.message
                };
            }
        }
        
        // Export test function to global scope
        window.testWasmModule = testWasmModule;
    </script>
</body>
</html>
  `;

  // Create a data URL for the HTML content
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  
  // Navigate to the data URL
  await page.goto(dataUrl);
  
  // Copy the WASM file to a location the test can access
  const wasmContent = fs.readFileSync(path.join(process.cwd(), 'game.wasm'));
  
  // Set up the WASM file as a mock response
  await page.route('./game.wasm', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/wasm',
      body: wasmContent
    });
  });

  // Run the test
  const result = await page.evaluate(async () => {
    return await window.testWasmModule();
  });

  // Validate results
  expect(result.wasmLoaded).toBe(true);
  expect(result.allFunctionsExist).toBe(true);
  expect(result.initTest).toBe(true);
  expect(result.packCountTest).toBe(true);
  expect(result.activePacksCorrect).toBe(true);

  if (result.error) {
    console.log('Test completed with error details:', result.error);
  }

  // Log function existence for debugging
  console.log('Function existence check:', result.functionsExist);
})
