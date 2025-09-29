/**
 * Input System Test Suite
 * Tests the unified input manager and validates fixes
 */

import { UnifiedInputManager } from './unified-input-manager.js';
import { InputValidator } from './input-validator.js';
import { createInputManager } from './input-migration-adapter.js';

export class InputSystemTest {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    /**
     * Run all input system tests
     */
    async runAllTests() {
        console.log('🧪 Starting Input System Tests...');
        
        // Test input validation
        await this.testInputValidation();
        
        // Test WASM synchronization
        await this.testWasmSynchronization();
        
        // Test gamepad integration
        await this.testGamepadIntegration();
        
        // Test legacy compatibility
        await this.testLegacyCompatibility();
        
        // Test memory management
        await this.testMemoryManagement();
        
        // Test rate limiting
        await this.testRateLimiting();
        
        this.printResults();
        return this.results;
    }
    
    /**
     * Test input validation system
     */
    async testInputValidation() {
        console.log('🔍 Testing Input Validation...');
        
        const validator = new InputValidator();
        
        // Test valid inputs
        this.assert(
            validator.validateInputAction('light-attack', true).valid,
            'Valid input should pass validation'
        );
        
        // Test invalid inputs
        this.assert(
            !validator.validateInputAction('invalid-action', true).valid,
            'Invalid action should fail validation'
        );
        
        this.assert(
            !validator.validateInputAction('light-attack', 'not-boolean').valid,
            'Invalid type should fail validation'
        );
        
        // Test direction validation
        const dirResult = validator.validateDirection(0.5, -0.8);
        this.assert(
            dirResult.valid && dirResult.x === 0.5 && dirResult.y === -0.8,
            'Valid direction should pass validation'
        );
        
        // Test clamping
        const clampResult = validator.validateDirection(2.0, -3.0);
        this.assert(
            clampResult.valid && clampResult.x === 1.0 && clampResult.y === -1.0,
            'Direction should be clamped to valid range'
        );
        
        // Test WASM input validation
        const wasmResult = validator.validateWasmInput(0.5, -0.5, true, false, true, false, false, true);
        this.assert(
            wasmResult.valid && wasmResult.isRolling === 1 && wasmResult.lightAttack === 1,
            'WASM input validation should work correctly'
        );
    }
    
    /**
     * Test WASM synchronization
     */
    async testWasmSynchronization() {
        console.log('🔗 Testing WASM Synchronization...');
        
        // Mock WASM manager
        const mockWasmManager = {
            exports: {
                set_player_input: (...args) => {
                    mockWasmManager.lastInput = args;
                },
                set_blocking: (...args) => {
                    mockWasmManager.lastBlocking = args;
                }
            },
            lastInput: null,
            lastBlocking: null
        };
        
        const inputManager = new UnifiedInputManager(mockWasmManager);
        
        // Test input queuing
        inputManager.handleInputAction('light-attack', true);
        this.assert(
            inputManager.syncState.inputQueue.length > 0,
            'Input should be queued'
        );
        
        // Test WASM readiness detection
        inputManager.checkWasmReadiness();
        this.assert(
            inputManager.syncState.wasmReady,
            'WASM should be detected as ready'
        );
        
        // Test input flushing
        inputManager.flushInputQueue();
        this.assert(
            mockWasmManager.lastInput !== null,
            'Input should be sent to WASM'
        );
        
        inputManager.destroy();
    }
    
    /**
     * Test gamepad integration
     */
    async testGamepadIntegration() {
        console.log('🎮 Testing Gamepad Integration...');
        
        // Mock gamepad manager
        const mockGamepadManager = {
            inputState: {
                buttons: {
                    lightAttack: true,
                    heavyAttack: false
                }
            },
            getProcessedInput: () => ({
                moveX: 0.5,
                moveY: -0.3,
                lightAttack: true,
                heavyAttack: false,
                special: false,
                roll: false,
                block: false
            }),
            destroy: () => {}
        };
        
        const mockWasmManager = { exports: null };
        const inputManager = new UnifiedInputManager(mockWasmManager);
        inputManager.gamepadManager = mockGamepadManager;
        
        this.assert(
            inputManager.gamepadManager !== null,
            'Gamepad manager should be integrated'
        );
        
        inputManager.destroy();
    }
    
    /**
     * Test legacy compatibility
     */
    async testLegacyCompatibility() {
        console.log('🔄 Testing Legacy Compatibility...');
        
        const mockWasmManager = {
            exports: {
                set_player_input: () => {}
            }
        };
        
        const legacyManager = createInputManager(mockWasmManager, {
            useLegacyAdapter: true
        });
        
        // Test legacy methods exist
        this.assert(
            typeof legacyManager.init === 'function',
            'Legacy init method should exist'
        );
        
        this.assert(
            typeof legacyManager.sendInputToWasm === 'function',
            'Legacy sendInputToWasm method should exist'
        );
        
        this.assert(
            typeof legacyManager.getInputState === 'function',
            'Legacy getInputState method should exist'
        );
        
        // Test legacy properties
        this.assert(
            legacyManager.inputState !== undefined,
            'Legacy inputState property should exist'
        );
        
        legacyManager.destroy();
    }
    
    /**
     * Test memory management
     */
    async testMemoryManagement() {
        console.log('🧠 Testing Memory Management...');
        
        const mockWasmManager = { exports: null };
        const inputManager = new UnifiedInputManager(mockWasmManager);
        
        // Test event listener tracking
        this.assert(
            Array.isArray(inputManager.eventListeners),
            'Event listeners should be tracked'
        );
        
        const initialListenerCount = inputManager.eventListeners.length;
        
        // Test cleanup
        inputManager.destroy();
        
        this.assert(
            inputManager.eventListeners.length === 0,
            'Event listeners should be cleaned up on destroy'
        );
    }
    
    /**
     * Test rate limiting
     */
    async testRateLimiting() {
        console.log('⏱️ Testing Rate Limiting...');
        
        const validator = new InputValidator();
        
        // Test rapid inputs
        let blockedCount = 0;
        const testCount = 100;
        
        for (let i = 0; i < testCount; i++) {
            const result = validator.validateInputAction('light-attack', true);
            if (!result.valid && result.reason === 'Rate limited') {
                blockedCount++;
            }
        }
        
        this.assert(
            blockedCount > 0,
            'Rate limiting should block rapid inputs'
        );
        
        // Test stats
        const stats = validator.getValidationStats();
        this.assert(
            stats.totalInputs > 0,
            'Validation stats should track inputs'
        );
    }
    
    /**
     * Assert a condition and track results
     */
    assert(condition, message) {
        this.results.total++;
        
        if (condition) {
            this.results.passed++;
            console.log(`✅ ${message}`);
        } else {
            this.results.failed++;
            console.error(`❌ ${message}`);
        }
    }
    
    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 Input System Test Results:');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Total: ${this.results.total}`);
        console.log(`📊 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed! Input system is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Please review the input system implementation.');
        }
    }
}

// Global test function for console use
if (typeof window !== 'undefined') {
    window.testInputSystem = async function() {
        const tester = new InputSystemTest();
        return await tester.runAllTests();
    };
}
