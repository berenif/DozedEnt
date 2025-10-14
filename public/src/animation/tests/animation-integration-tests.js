/**
 * Animation Integration Tests
 * Tests the integration between different animation systems
 */

import { AnimatedPlayer } from '../player/procedural/player-animator.js'
import { AnimationEventSystem } from '../system/animation-events.js'
import { ComboSystem } from '../system/combo-system.js'
import { AbilityManager, FireballAbility, ThunderStrikeAbility } from '../abilities/index.js'
import { EnhancedWolfAnimationSystem } from '../enemy/enhanced-wolf-animation.js'
import TopDownPlayerRenderer from '../../renderer/player/TopDownPlayerRenderer.js'

export class AnimationIntegrationTests {
    constructor() {
        this.tests = []
        this.results = []
        this.canvas = null
        this.ctx = null
    }
    
    /**
     * Initialize test environment
     */
    initialize() {
        // Create test canvas
        this.canvas = document.createElement('canvas')
        this.canvas.width = 800
        this.canvas.height = 600
        this.ctx = this.canvas.getContext('2d')
        
        // Add canvas to document for visual tests
        document.body.appendChild(this.canvas)
        
        // Register all tests
        this.registerTests()
    }
    
    /**
     * Register all integration tests
     */
    registerTests() {
        this.tests = [
            {
                name: 'Player Animation System Integration',
                test: () => this.testPlayerAnimationIntegration()
            },
            {
                name: 'Animation Event System Integration',
                test: () => this.testAnimationEventIntegration()
            },
            {
                name: 'Combo System Integration',
                test: () => this.testComboSystemIntegration()
            },
            {
                name: 'Ability System Integration',
                test: () => this.testAbilitySystemIntegration()
            },
            {
                name: 'Wolf Animation System Integration',
                test: () => this.testWolfAnimationIntegration()
            },
            {
                name: 'Top-Down Renderer Integration',
                test: () => this.testTopDownRendererIntegration()
            },
            {
                name: 'Cross-System Communication',
                test: () => this.testCrossSystemCommunication()
            },
            {
                name: 'Performance Integration',
                test: () => this.testPerformanceIntegration()
            }
        ]
    }
    
    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Animation Integration Tests...')
        
        for (const test of this.tests) {
            try {
                console.log(`\n📋 Running: ${test.name}`)
                const result = await test.test()
                this.results.push({
                    name: test.name,
                    passed: result.passed,
                    message: result.message,
                    duration: result.duration,
                    details: result.details
                })
                
                if (result.passed) {
                    console.log(`✅ ${test.name}: PASSED`)
                } else {
                    console.log(`❌ ${test.name}: FAILED - ${result.message}`)
                }
            } catch (error) {
                console.error(`💥 ${test.name}: ERROR - ${error.message}`)
                this.results.push({
                    name: test.name,
                    passed: false,
                    message: error.message,
                    duration: 0,
                    details: { error: error.stack }
                })
            }
        }
        
        this.printSummary()
        return this.results
    }
    
    /**
     * Test player animation system integration
     */
    async testPlayerAnimationIntegration() {
        const startTime = performance.now()
        
        try {
            // Create player
            const player = new AnimatedPlayer(400, 300, {
                health: 100,
                stamina: 100,
                speed: 250
            })
            
            // Test basic functionality
            if (!player) {
                throw new Error('Failed to create AnimatedPlayer')
            }
            
            // Test update cycle
            const deltaTime = 0.016
            const input = {
                left: false,
                right: true,
                up: false,
                down: false,
                attack: false,
                block: false,
                roll: false
            }
            
            player.update(deltaTime, input)
            
            // Test rendering
            player.render(this.ctx, { x: 0, y: 0, zoom: 1 })
            
            // Test state changes
            player.setState('attacking')
            if (player.state !== 'attacking') {
                throw new Error('State change failed')
            }
            
            // Test damage
            player.takeDamage(20, 0, 0)
            if (player.health > 80) {
                throw new Error('Damage not applied correctly')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Player animation system integrated successfully',
                duration: duration,
                details: {
                    playerCreated: true,
                    updateCycle: true,
                    rendering: true,
                    stateChanges: true,
                    damageSystem: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test animation event system integration
     */
    async testAnimationEventIntegration() {
        const startTime = performance.now()
        
        try {
            // Create event system
            const events = new AnimationEventSystem()
            
            // Test event registration
            let eventReceived = false
            events.on('test.event', (data) => {
                eventReceived = true
            })
            
            // Test event emission
            events.emit('test.event', { test: true })
            
            // Process events
            events.processEventQueue()
            
            if (!eventReceived) {
                throw new Error('Event not received')
            }
            
            // Test frame events
            events.registerFrameEvent('attack', 3, {
                type: 'attack.active',
                damage: 50
            })
            
            const frameEventTriggered = events.triggerFrameEvents('attack', 3)
            if (!frameEventTriggered) {
                throw new Error('Frame event not triggered')
            }
            
            // Test state events
            events.registerStateEvent('idle', 'attacking', {
                type: 'combat.start'
            })
            
            const stateEventTriggered = events.triggerStateEvents('idle', 'attacking')
            if (!stateEventTriggered) {
                throw new Error('State event not triggered')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Animation event system integrated successfully',
                duration: duration,
                details: {
                    eventRegistration: true,
                    eventEmission: true,
                    frameEvents: true,
                    stateEvents: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test combo system integration
     */
    async testComboSystemIntegration() {
        const startTime = performance.now()
        
        try {
            // Create combo system
            const combos = new ComboSystem({
                comboWindow: 0.5,
                onComboHit: (data) => {
                    // Test callback
                }
            })
            
            // Test combo registration
            combos.registerCombo('testCombo', ['light', 'light', 'heavy'], {
                damage: 50,
                animation: 'test_combo'
            })
            
            // Test input processing
            const input = {
                lightAttack: true,
                heavyAttack: false,
                special: false,
                roll: false,
                block: false,
                jump: false,
                up: false,
                down: false,
                left: false,
                right: false
            }
            
            combos.processInput(input, 0.016)
            
            // Test combo detection
            if (combos.currentCombo.length === 0) {
                throw new Error('Combo not detected')
            }
            
            // Test combo meter
            const meter = combos.getComboMeter()
            if (!meter) {
                throw new Error('Combo meter not available')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Combo system integrated successfully',
                duration: duration,
                details: {
                    comboRegistration: true,
                    inputProcessing: true,
                    comboDetection: true,
                    comboMeter: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test ability system integration
     */
    async testAbilitySystemIntegration() {
        const startTime = performance.now()
        
        try {
            // Create mock player
            const mockPlayer = {
                x: 400,
                y: 300,
                health: 100,
                stamina: 100,
                mana: 100,
                facing: 1,
                setState: (state) => {},
                wasmModule: null,
                vfxManager: {
                    particles: null,
                    camera: null,
                    audio: null
                }
            }
            
            // Create ability manager
            const abilityManager = new AbilityManager(mockPlayer)
            
            // Register abilities
            abilityManager.registerAbility('fireball', FireballAbility, {
                hotkey: '1',
                category: 'combat'
            })
            
            abilityManager.registerAbility('thunder', ThunderStrikeAbility, {
                hotkey: '2',
                category: 'combat'
            })
            
            // Test ability usage
            const fireballUsed = abilityManager.useAbility('fireball')
            if (!fireballUsed) {
                throw new Error('Fireball ability not used')
            }
            
            // Test ability update
            abilityManager.update(0.016)
            
            // Test ability info
            const fireballInfo = abilityManager.getAbilityInfo('fireball')
            if (!fireballInfo) {
                throw new Error('Ability info not available')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Ability system integrated successfully',
                duration: duration,
                details: {
                    abilityRegistration: true,
                    abilityUsage: true,
                    abilityUpdate: true,
                    abilityInfo: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test wolf animation system integration
     */
    async testWolfAnimationIntegration() {
        const startTime = performance.now()
        
        try {
            // Create wolf animation system
            const wolfSystem = new EnhancedWolfAnimationSystem({
                enablePhysics: true,
                enablePackDynamics: true,
                maxWolves: 5
            })
            
            // Create wolves
            const alpha = wolfSystem.createWolf('alpha1', {
                type: 'alpha',
                position: { x: 100, y: 100 }
            })
            
            const scout = wolfSystem.createWolf('scout1', {
                type: 'scout',
                position: { x: 150, y: 120 }
            })
            
            if (!alpha || !scout) {
                throw new Error('Failed to create wolves')
            }
            
            // Test wolf update
            wolfSystem.update(0.016, {
                wind: { x: 0.1, y: 0, strength: 0.3 },
                weather: { temperature: 0.6, rain: 0 }
            })
            
            // Test pack dynamics
            const packLeader = wolfSystem.getPackLeader()
            if (!packLeader) {
                throw new Error('Pack leader not set')
            }
            
            // Test wolf retrieval
            const retrievedAlpha = wolfSystem.getWolf('alpha1')
            if (!retrievedAlpha) {
                throw new Error('Wolf retrieval failed')
            }
            
            // Test system status
            const status = wolfSystem.getStatus()
            if (status.wolves !== 2) {
                throw new Error('Wolf count incorrect')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Wolf animation system integrated successfully',
                duration: duration,
                details: {
                    wolfCreation: true,
                    wolfUpdate: true,
                    packDynamics: true,
                    wolfRetrieval: true,
                    systemStatus: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test top-down renderer integration
     */
    async testTopDownRendererIntegration() {
        const startTime = performance.now()
        
        try {
            // Create renderer
            const renderer = new TopDownPlayerRenderer(this.ctx, this.canvas, {
                mode: 'physics',
                physics: {
                    fixedDt: 1/60,
                    substeps: 2
                }
            })
            
            if (!renderer) {
                throw new Error('Failed to create TopDownPlayerRenderer')
            }
            
            // Test player state
            const playerState = {
                x: 0.5,
                y: 0.5,
                vx: 0.1,
                vy: 0.05,
                anim: 'running',
                hp: 0.8,
                stamina: 0.6,
                grounded: true
            }
            
            // Test coordinate conversion
            const toCanvas = (wx, wy) => ({
                x: wx * this.canvas.width,
                y: wy * this.canvas.height
            })
            
            // Test rendering
            renderer.render(playerState, toCanvas, 20)
            
            // Test mode switching
            const proceduralRenderer = new TopDownPlayerRenderer(this.ctx, this.canvas, {
                mode: 'procedural',
                procedural: {
                    footIK: { stepHeight: 7 },
                    spine: { maxBend: 0.18 }
                }
            })
            
            if (!proceduralRenderer) {
                throw new Error('Failed to create procedural renderer')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Top-down renderer integrated successfully',
                duration: duration,
                details: {
                    rendererCreation: true,
                    playerStateRendering: true,
                    coordinateConversion: true,
                    modeSwitching: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test cross-system communication
     */
    async testCrossSystemCommunication() {
        const startTime = performance.now()
        
        try {
            // Create systems
            const events = new AnimationEventSystem()
            const combos = new ComboSystem({
                onComboHit: (data) => {
                    events.emit('combo.hit', data)
                }
            })
            
            const player = new AnimatedPlayer(400, 300)
            
            // Test event communication
            let comboEventReceived = false
            events.on('combo.hit', (data) => {
                comboEventReceived = true
            })
            
            // Trigger combo
            combos.processInput({ lightAttack: true }, 0.016)
            combos.processInput({ lightAttack: true }, 0.016)
            combos.processInput({ heavyAttack: true }, 0.016)
            
            // Process events
            events.processEventQueue()
            
            if (!comboEventReceived) {
                throw new Error('Cross-system event communication failed')
            }
            
            // Test player-event integration
            let playerEventReceived = false
            events.on('player.damage', (data) => {
                playerEventReceived = true
            })
            
            player.takeDamage(20, 0, 0)
            events.emit('player.damage', { damage: 20 })
            events.processEventQueue()
            
            if (!playerEventReceived) {
                throw new Error('Player-event integration failed')
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Cross-system communication integrated successfully',
                duration: duration,
                details: {
                    eventCommunication: true,
                    playerEventIntegration: true,
                    comboEventIntegration: true
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Test performance integration
     */
    async testPerformanceIntegration() {
        const startTime = performance.now()
        
        try {
            // Create systems
            const player = new AnimatedPlayer(400, 300)
            const events = new AnimationEventSystem()
            const combos = new ComboSystem()
            const wolfSystem = new EnhancedWolfAnimationSystem({ maxWolves: 10 })
            
            // Performance test
            const iterations = 100
            const deltaTime = 0.016
            
            const performanceStart = performance.now()
            
            for (let i = 0; i < iterations; i++) {
                // Update player
                player.update(deltaTime, { right: true })
                
                // Update events
                events.emit('test.performance', { iteration: i })
                events.processEventQueue()
                
                // Update combos
                combos.processInput({ lightAttack: i % 2 === 0 }, deltaTime)
                
                // Update wolves
                wolfSystem.update(deltaTime)
            }
            
            const performanceEnd = performance.now()
            const totalTime = performanceEnd - performanceStart
            const avgTimePerFrame = totalTime / iterations
            
            // Performance thresholds
            const maxAvgTimePerFrame = 16.67 // 60 FPS
            if (avgTimePerFrame > maxAvgTimePerFrame) {
                throw new Error(`Performance below threshold: ${avgTimePerFrame.toFixed(2)}ms > ${maxAvgTimePerFrame}ms`)
            }
            
            const duration = performance.now() - startTime
            
            return {
                passed: true,
                message: 'Performance integration test passed',
                duration: duration,
                details: {
                    totalTime: totalTime,
                    avgTimePerFrame: avgTimePerFrame,
                    iterations: iterations,
                    performanceThreshold: maxAvgTimePerFrame
                }
            }
        } catch (error) {
            return {
                passed: false,
                message: error.message,
                duration: performance.now() - startTime,
                details: { error: error.stack }
            }
        }
    }
    
    /**
     * Print test summary
     */
    printSummary() {
        const passed = this.results.filter(r => r.passed).length
        const total = this.results.length
        const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)
        
        console.log('\n📊 Animation Integration Test Summary')
        console.log('=====================================')
        console.log(`✅ Passed: ${passed}/${total}`)
        console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`)
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
        
        if (passed < total) {
            console.log('\n❌ Failed Tests:')
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`   • ${r.name}: ${r.message}`)
            })
        }
        
        console.log('\n🎯 Test Details:')
        this.results.forEach(r => {
            const status = r.passed ? '✅' : '❌'
            console.log(`   ${status} ${r.name}: ${r.duration.toFixed(2)}ms`)
        })
    }
    
    /**
     * Clean up test environment
     */
    cleanup() {
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas)
        }
    }
}

// Export for use in other modules
export default AnimationIntegrationTests
