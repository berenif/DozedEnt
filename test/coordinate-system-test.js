/**
 * Coordinate System Test Suite for DozedEnt
 * Tests WASM ↔ World ↔ Screen coordinate transformations
 */

import { GameRenderer } from '../src/utils/game-renderer.js';

// Mock canvas for testing
function createMockCanvas(width = 800, height = 600) {
    const canvas = {
        width: width,
        height: height,
        getContext: () => ({
            clearRect: () => {},
            fillRect: () => {},
            strokeRect: () => {},
            beginPath: () => {},
            arc: () => {},
            fill: () => {},
            stroke: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            fillText: () => {},
            createLinearGradient: () => ({
                addColorStop: () => {}
            })
        })
    };
    return canvas;
}

// Test suite
export class CoordinateSystemTest {
    constructor() {
        this.results = [];
        this.mockCanvas = createMockCanvas();
        this.gameRenderer = new GameRenderer(this.mockCanvas.getContext('2d'), this.mockCanvas);
    }
    
    // Add test result
    addResult(testName, passed, message, details = '') {
        const result = {
            name: testName,
            passed: passed,
            message: message,
            details: details,
            timestamp: new Date().toISOString()
        };
        this.results.push(result);
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status} ${testName}: ${message}`);
        if (details) {
            console.log(`  Details: ${details}`);
        }
        
        return result;
    }
    
    // Test WASM to World transformation
    testWasmToWorld() {
        console.log('\n🧪 Testing WASM to World transformations...');
        
        const testCases = [
            { wasmX: 0, wasmY: 0, description: 'top-left corner' },
            { wasmX: 0.5, wasmY: 0.5, description: 'center' },
            { wasmX: 1, wasmY: 1, description: 'bottom-right corner' },
            { wasmX: 0.25, wasmY: 0.75, description: 'quarter positions' },
            { wasmX: 0.33, wasmY: 0.67, description: 'one-third positions' }
        ];
        
        testCases.forEach(testCase => {
            const worldPos = this.gameRenderer.wasmToWorld(testCase.wasmX, testCase.wasmY);
            
            // Check if result is within expected bounds
            const playableWidth = this.gameRenderer.world.width / 3;
            const playableHeight = this.gameRenderer.world.height / 3;
            const offsetX = this.gameRenderer.world.width / 3;
            const offsetY = this.gameRenderer.world.height / 3;
            
            const expectedX = offsetX + testCase.wasmX * playableWidth;
            const expectedY = offsetY + testCase.wasmY * playableHeight;
            
            const xError = Math.abs(worldPos.x - expectedX);
            const yError = Math.abs(worldPos.y - expectedY);
            const totalError = xError + yError;
            
            this.addResult(
                `WASM to World (${testCase.description})`,
                totalError < 1,
                `WASM(${testCase.wasmX}, ${testCase.wasmY}) → World(${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)})`,
                `Expected: (${expectedX.toFixed(0)}, ${expectedY.toFixed(0)}), Error: ${totalError.toFixed(2)}`
            );
        });
    }
    
    // Test World to WASM transformation
    testWorldToWasm() {
        console.log('\n🧪 Testing World to WASM transformations...');
        
        const playableWidth = this.gameRenderer.world.width / 3;
        const playableHeight = this.gameRenderer.world.height / 3;
        const offsetX = this.gameRenderer.world.width / 3;
        const offsetY = this.gameRenderer.world.height / 3;
        
        const testCases = [
            { worldX: offsetX, worldY: offsetY, description: 'playable top-left' },
            { worldX: offsetX + playableWidth/2, worldY: offsetY + playableHeight/2, description: 'playable center' },
            { worldX: offsetX + playableWidth, worldY: offsetY + playableHeight, description: 'playable bottom-right' },
            { worldX: offsetX + playableWidth*0.25, worldY: offsetY + playableHeight*0.75, description: 'playable quarter positions' }
        ];
        
        testCases.forEach(testCase => {
            const wasmPos = this.gameRenderer.worldToWasm(testCase.worldX, testCase.worldY);
            
            // Check if result is within valid WASM range [0,1]
            const isValid = wasmPos.x >= 0 && wasmPos.y >= 0 && wasmPos.x <= 1 && wasmPos.y <= 1;
            
            // Calculate expected WASM coordinates
            const expectedX = (testCase.worldX - offsetX) / playableWidth;
            const expectedY = (testCase.worldY - offsetY) / playableHeight;
            
            const xError = Math.abs(wasmPos.x - expectedX);
            const yError = Math.abs(wasmPos.y - expectedY);
            const totalError = xError + yError;
            
            this.addResult(
                `World to WASM (${testCase.description})`,
                isValid && totalError < 0.01,
                `World(${testCase.worldX.toFixed(0)}, ${testCase.worldY.toFixed(0)}) → WASM(${wasmPos.x.toFixed(3)}, ${wasmPos.y.toFixed(3)})`,
                `Expected: (${expectedX.toFixed(3)}, ${expectedY.toFixed(3)}), Error: ${totalError.toFixed(4)}`
            );
        });
    }
    
    // Test round-trip transformations
    testRoundTrip() {
        console.log('\n🧪 Testing round-trip transformations...');
        
        const testCases = [
            { wasmX: 0.1, wasmY: 0.1 },
            { wasmX: 0.5, wasmY: 0.5 },
            { wasmX: 0.9, wasmY: 0.9 },
            { wasmX: 0.33, wasmY: 0.67 },
            { wasmX: 0.75, wasmY: 0.25 }
        ];
        
        testCases.forEach((testCase, index) => {
            const originalWasm = { x: testCase.wasmX, y: testCase.wasmY };
            
            // WASM → World → WASM
            const worldPos = this.gameRenderer.wasmToWorld(originalWasm.x, originalWasm.y);
            const backToWasm = this.gameRenderer.worldToWasm(worldPos.x, worldPos.y);
            
            const roundTripError = Math.abs(originalWasm.x - backToWasm.x) + Math.abs(originalWasm.y - backToWasm.y);
            
            this.addResult(
                `Round-trip ${index + 1}`,
                roundTripError < 0.01,
                `WASM(${originalWasm.x}, ${originalWasm.y}) → World → WASM(${backToWasm.x.toFixed(3)}, ${backToWasm.y.toFixed(3)})`,
                `Round-trip error: ${roundTripError.toFixed(4)} (should be < 0.01)`
            );
        });
    }
    
    // Test camera system
    testCameraSystem() {
        console.log('\n🧪 Testing camera system...');
        
        // Test camera bounds
        const bounds = this.gameRenderer.camera.bounds;
        const boundsValid = bounds.minX >= 0 && bounds.minY >= 0 && 
                           bounds.maxX <= this.gameRenderer.world.width && 
                           bounds.maxY <= this.gameRenderer.world.height;
        
        this.addResult(
            'Camera Bounds',
            boundsValid,
            `Camera bounds: min(${bounds.minX.toFixed(0)}, ${bounds.minY.toFixed(0)}) to max(${bounds.maxX.toFixed(0)}, ${bounds.maxY.toFixed(0)})`,
            `World size: ${this.gameRenderer.world.width}x${this.gameRenderer.world.height}`
        );
        
        // Test camera update
        const testWorldX = this.gameRenderer.world.width / 2;
        const testWorldY = this.gameRenderer.world.height / 2;
        const originalCameraX = this.gameRenderer.camera.x;
        const originalCameraY = this.gameRenderer.camera.y;
        
        this.gameRenderer.updateCamera(testWorldX, testWorldY, 0.016);
        
        const cameraMoved = Math.abs(this.gameRenderer.camera.x - originalCameraX) > 0 || 
                           Math.abs(this.gameRenderer.camera.y - originalCameraY) > 0;
        
        this.addResult(
            'Camera Update',
            cameraMoved,
            `Camera moved from (${originalCameraX.toFixed(0)}, ${originalCameraY.toFixed(0)}) to (${this.gameRenderer.camera.x.toFixed(0)}, ${this.gameRenderer.camera.y.toFixed(0)})`,
            `Target was (${testWorldX.toFixed(0)}, ${testWorldY.toFixed(0)})`
        );
        
        // Test camera centering
        const expectedCameraX = testWorldX - this.gameRenderer.camera.width / 2;
        const expectedCameraY = testWorldY - this.gameRenderer.camera.height / 2;
        const centeringError = Math.abs(this.gameRenderer.camera.x - expectedCameraX) + Math.abs(this.gameRenderer.camera.y - expectedCameraY);
        
        this.addResult(
            'Camera Centering',
            centeringError < 10,
            `Camera position (${this.gameRenderer.camera.x.toFixed(0)}, ${this.gameRenderer.camera.y.toFixed(0)})`,
            `Expected (${expectedCameraX.toFixed(0)}, ${expectedCameraY.toFixed(0)}), error: ${centeringError.toFixed(1)}`
        );
    }
    
    // Test edge cases
    testEdgeCases() {
        console.log('\n🧪 Testing edge cases...');
        
        // Test invalid inputs
        const invalidCases = [
            { wasmX: NaN, wasmY: 0.5, description: 'NaN X coordinate' },
            { wasmX: 0.5, wasmY: Infinity, description: 'Infinity Y coordinate' },
            { wasmX: -1, wasmY: 0.5, description: 'Negative X coordinate' },
            { wasmX: 0.5, wasmY: 2, description: 'Y coordinate > 1' }
        ];
        
        invalidCases.forEach(testCase => {
            const worldPos = this.gameRenderer.wasmToWorld(testCase.wasmX, testCase.wasmY);
            
            // Should handle invalid inputs gracefully
            const isValid = Number.isFinite(worldPos.x) && Number.isFinite(worldPos.y) &&
                           worldPos.x >= 0 && worldPos.y >= 0 &&
                           worldPos.x <= this.gameRenderer.world.width &&
                           worldPos.y <= this.gameRenderer.world.height;
            
            this.addResult(
                `Edge Case (${testCase.description})`,
                isValid,
                `WASM(${testCase.wasmX}, ${testCase.wasmY}) → World(${worldPos.x.toFixed(0)}, ${worldPos.y.toFixed(0)})`,
                `Should handle invalid inputs gracefully`
            );
        });
    }
    
    // Test coordinate validation
    testCoordinateValidation() {
        console.log('\n🧪 Testing coordinate validation...');
        
        // Test WASM coordinate validation
        const wasmValidationTests = [
            { x: 0, y: 0, expected: true },
            { x: 0.5, y: 0.5, expected: true },
            { x: 1, y: 1, expected: true },
            { x: -0.1, y: 0.5, expected: false },
            { x: 0.5, y: 1.1, expected: false }
        ];
        
        wasmValidationTests.forEach(test => {
            const isValid = this.gameRenderer.isWasmCoordValid(test.x, test.y);
            this.addResult(
                `WASM Validation (${test.x}, ${test.y})`,
                isValid === test.expected,
                `WASM(${test.x}, ${test.y}) is ${isValid ? 'valid' : 'invalid'}`,
                `Expected: ${test.expected ? 'valid' : 'invalid'}`
            );
        });
        
        // Test world coordinate validation
        const worldValidationTests = [
            { x: this.gameRenderer.world.width / 3, y: this.gameRenderer.world.height / 3, expected: true },
            { x: this.gameRenderer.world.width / 2, y: this.gameRenderer.world.height / 2, expected: true },
            { x: this.gameRenderer.world.width * 2/3, y: this.gameRenderer.world.height * 2/3, expected: true },
            { x: 0, y: 0, expected: false },
            { x: this.gameRenderer.world.width, y: this.gameRenderer.world.height, expected: false }
        ];
        
        worldValidationTests.forEach(test => {
            const isValid = this.gameRenderer.isWorldCoordInPlayableArea(test.x, test.y);
            this.addResult(
                `World Validation (${test.x.toFixed(0)}, ${test.y.toFixed(0)})`,
                isValid === test.expected,
                `World(${test.x.toFixed(0)}, ${test.y.toFixed(0)}) is ${isValid ? 'valid' : 'invalid'}`,
                `Expected: ${test.expected ? 'valid' : 'invalid'}`
            );
        });
    }
    
    // Run all tests
    runAllTests() {
        console.log('🚀 Starting DozedEnt Coordinate System Test Suite...\n');
        
        this.testWasmToWorld();
        this.testWorldToWasm();
        this.testRoundTrip();
        this.testCameraSystem();
        this.testEdgeCases();
        this.testCoordinateValidation();
        
        // Summary
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        
        console.log('\n📊 Test Summary:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${total - passed}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (passed === total) {
            console.log('\n🎉 All tests passed! Coordinate system is working correctly.');
        } else {
            console.log('\n⚠️ Some tests failed. Check the details above.');
        }
        
        return {
            passed: passed,
            total: total,
            successRate: (passed / total) * 100,
            results: this.results
        };
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const testSuite = new CoordinateSystemTest();
    const results = testSuite.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.passed === results.total ? 0 : 1);
}

export default CoordinateSystemTest;
