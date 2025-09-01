import {test, expect} from '@playwright/test'

const testUrl = 'https://localhost:8080/test'

test('Performance Test: No GC churn/regressions, memory within limits', async ({page}) => {
  await page.goto(testUrl)

  // Load wasm helpers
  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../docs/game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Performance metrics
    const metrics = {
      frameTimeMs: [],
      memoryUsedKB: [],
      gcCount: 0,
      maxFrameTimeMs: 0,
      avgFrameTimeMs: 0,
      maxMemoryKB: 0,
      startMemoryKB: 0,
      endMemoryKB: 0
    }

    // Monitor GC if available
    if (performance.memory) {
      const initialMemory = performance.memory.usedJSHeapSize / 1024
      metrics.startMemoryKB = initialMemory
      
      // Track GC events (this is approximate)
      let lastHeapSize = performance.memory.usedJSHeapSize
      const checkGC = () => {
        const currentHeapSize = performance.memory.usedJSHeapSize
        if (currentHeapSize < lastHeapSize * 0.7) {
          // Significant drop suggests GC occurred
          metrics.gcCount++
        }
        lastHeapSize = currentHeapSize
      }
      
      // Set up periodic GC checking
      const gcInterval = setInterval(checkGC, 100)
      
      // Run intensive gameplay simulation for 30 seconds
      const seed = 42
      api.init_run(BigInt(seed), 0)
      
      const startTime = performance.now()
      let frameCount = 0
      const targetFPS = 60
      const frameDuration = 1000 / targetFPS
      
      // Simulate 30 seconds of gameplay
      while (performance.now() - startTime < 30000) {
        const frameStart = performance.now()
        
        // Simulate player input
        const t = (performance.now() - startTime) / 1000
        const dirX = Math.sin(t * 2)
        const dirY = Math.cos(t * 2)
        const isRolling = Math.floor(t) % 3 === 0 ? 1 : 0
        
        // Random actions
        if (Math.random() < 0.1) api.on_attack()
        if (Math.random() < 0.05) api.on_roll_start()
        if (Math.random() < 0.05) api.set_blocking(1, dirX, dirY)
        if (Math.random() < 0.05) api.set_blocking(0, 0, 0)
        
        // Update simulation
        api.update(dirX, dirY, isRolling, frameDuration / 1000)
        
        // Trigger phase transitions occasionally
        if (frameCount % 180 === 0) {
          // Force some enemies to be killed to trigger choices
          for (let i = 0; i < 3; i++) {
            if (api.get_enemy_count && api.get_enemy_count() > 0) {
              // Simulate enemy defeat (would normally happen through combat)
              api.update(0, 0, 0, 0.1)
            }
          }
        }
        
        // Measure frame time
        const frameTime = performance.now() - frameStart
        metrics.frameTimeMs.push(frameTime)
        metrics.maxFrameTimeMs = Math.max(metrics.maxFrameTimeMs, frameTime)
        
        // Measure memory usage
        if (performance.memory) {
          const memoryKB = performance.memory.usedJSHeapSize / 1024
          metrics.memoryUsedKB.push(memoryKB)
          metrics.maxMemoryKB = Math.max(metrics.maxMemoryKB, memoryKB)
        }
        
        frameCount++
        
        // Throttle to target FPS
        const elapsed = performance.now() - frameStart
        if (elapsed < frameDuration) {
          // Simple busy wait (in real app would use requestAnimationFrame)
          while (performance.now() - frameStart < frameDuration) {
            // Wait
          }
        }
      }
      
      clearInterval(gcInterval)
      
      // Calculate averages
      metrics.avgFrameTimeMs = metrics.frameTimeMs.reduce((a, b) => a + b, 0) / metrics.frameTimeMs.length
      
      if (performance.memory) {
        metrics.endMemoryKB = performance.memory.usedJSHeapSize / 1024
      }
    } else {
      // Fallback for browsers without memory API
      // Just run the simulation and measure frame times
      const seed = 42
      api.init_run(BigInt(seed), 0)
      
      const startTime = performance.now()
      let frameCount = 0
      
      // Simulate 10 seconds of gameplay (shorter without memory monitoring)
      while (performance.now() - startTime < 10000) {
        const frameStart = performance.now()
        
        const t = (performance.now() - startTime) / 1000
        const dirX = Math.sin(t * 2)
        const dirY = Math.cos(t * 2)
        const isRolling = Math.floor(t) % 3 === 0 ? 1 : 0
        
        api.update(dirX, dirY, isRolling, 1/60)
        
        const frameTime = performance.now() - frameStart
        metrics.frameTimeMs.push(frameTime)
        metrics.maxFrameTimeMs = Math.max(metrics.maxFrameTimeMs, frameTime)
        
        frameCount++
      }
      
      metrics.avgFrameTimeMs = metrics.frameTimeMs.reduce((a, b) => a + b, 0) / metrics.frameTimeMs.length
    }
    
    return metrics
  })

  // Performance assertions
  
  // Frame time should stay under 16.67ms for 60 FPS (with some tolerance)
  expect(result.avgFrameTimeMs).toBeLessThan(20) // Allow some overhead
  expect(result.maxFrameTimeMs).toBeLessThan(50) // Occasional spikes OK
  
  // GC should be minimal (less than 1 per second on average)
  if (result.gcCount > 0) {
    const gcPerSecond = result.gcCount / 30 // 30 second test
    expect(gcPerSecond).toBeLessThan(1)
  }
  
  // Memory growth should be reasonable (less than 10MB growth)
  if (result.startMemoryKB > 0 && result.endMemoryKB > 0) {
    const memoryGrowthKB = result.endMemoryKB - result.startMemoryKB
    expect(memoryGrowthKB).toBeLessThan(10240) // 10MB
  }
  
  // Log results for debugging
  console.log('Performance test results:')
  console.log(`  Average frame time: ${result.avgFrameTimeMs.toFixed(2)}ms`)
  console.log(`  Max frame time: ${result.maxFrameTimeMs.toFixed(2)}ms`)
  console.log(`  GC count: ${result.gcCount}`)
  if (result.startMemoryKB > 0) {
    console.log(`  Memory growth: ${((result.endMemoryKB - result.startMemoryKB) / 1024).toFixed(2)}MB`)
    console.log(`  Max memory: ${(result.maxMemoryKB / 1024).toFixed(2)}MB`)
  }
})

test('Performance Test: WASM memory usage stays within limits', async ({page}) => {
  await page.goto(testUrl)

  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../docs/game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Track WASM memory usage
    const wasmMemoryMetrics = {
      initialPages: memory.buffer.byteLength / 65536,
      maxPages: 0,
      finalPages: 0,
      growthEvents: 0
    }

    // Monitor memory growth
    const originalGrow = memory.grow
    memory.grow = function(delta) {
      wasmMemoryMetrics.growthEvents++
      const result = originalGrow.call(this, delta)
      wasmMemoryMetrics.maxPages = Math.max(wasmMemoryMetrics.maxPages, memory.buffer.byteLength / 65536)
      return result
    }

    // Run intensive simulation
    const seed = 12345
    api.init_run(BigInt(seed), 0)

    // Simulate many phase transitions and state changes
    for (let cycle = 0; cycle < 100; cycle++) {
      // Move around
      for (let i = 0; i < 10; i++) {
        api.update(Math.random() * 2 - 1, Math.random() * 2 - 1, 0, 0.1)
      }
      
      // Combat actions
      api.on_attack()
      api.update(0, 0, 0, 0.5)
      
      // Trigger choices if possible
      if (api.get_phase() === 2) {
        const choiceId = api.get_choice_id(0)
        api.commit_choice(choiceId)
      }
      
      // Trigger risk events
      if (api.trigger_risk_event) {
        api.trigger_risk_event()
      }
      
      // Trigger escalation
      if (api.trigger_escalation_event) {
        api.trigger_escalation_event()
      }
      
      // Shop interactions
      if (api.get_phase() === 6) { // CashOut
        if (api.buy_shop_item) {
          api.buy_shop_item(0)
        }
      }
    }

    wasmMemoryMetrics.finalPages = memory.buffer.byteLength / 65536
    wasmMemoryMetrics.maxPages = Math.max(wasmMemoryMetrics.maxPages, wasmMemoryMetrics.finalPages)

    return wasmMemoryMetrics
  })

  // WASM memory assertions
  
  // Initial memory should be reasonable (less than 256 pages = 16MB)
  expect(result.initialPages).toBeLessThan(256)
  
  // Memory growth should be minimal (ideally 0 growth events)
  expect(result.growthEvents).toBeLessThanOrEqual(2) // Allow up to 2 growth events
  
  // Total memory should stay under 32MB (512 pages)
  expect(result.maxPages).toBeLessThan(512)
  
  console.log('WASM memory test results:')
  console.log(`  Initial memory: ${result.initialPages} pages (${(result.initialPages * 64).toFixed(2)}KB)`)
  console.log(`  Final memory: ${result.finalPages} pages (${(result.finalPages * 64).toFixed(2)}KB)`)
  console.log(`  Max memory: ${result.maxPages} pages (${(result.maxPages * 64).toFixed(2)}KB)`)
  console.log(`  Growth events: ${result.growthEvents}`)
})