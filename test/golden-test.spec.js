import './setup.js';
import {test, expect} from '@playwright/test'

const testUrl = 'https://localhost:8080/test'

test('Golden Test: 60s deterministic gameplay with identical seed and inputs', async ({page}) => {
  await page.goto(testUrl)

  // Load wasm helpers
  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Input script: 60 seconds of gameplay with various actions
    // Format: [dirX, dirY, isRolling, dtSeconds, action]
    // action: null, 'attack', 'block', 'unblock'
    const inputScript = []
    
    // First 5 seconds: move right
    for (let i = 0; i < 300; i++) {
      inputScript.push([1, 0, 0, 1/60, null])
    }
    
    // Roll to the right
    inputScript.push([1, 0, 1, 1/60, 'roll'])
    for (let i = 0; i < 10; i++) {
      inputScript.push([1, 0, 1, 1/60, null])
    }
    
    // Attack
    inputScript.push([1, 0, 0, 1/60, 'attack'])
    
    // Move in circles for 10 seconds
    for (let t = 0; t < 10; t++) {
      const angle = (t / 10) * Math.PI * 2
      const dx = Math.cos(angle)
      const dy = Math.sin(angle)
      for (let i = 0; i < 60; i++) {
        inputScript.push([dx, dy, 0, 1/60, null])
      }
    }
    
    // Block for 2 seconds
    inputScript.push([0, 0, 0, 1/60, 'block'])
    for (let i = 0; i < 120; i++) {
      inputScript.push([0, 0, 0, 1/60, null])
    }
    inputScript.push([0, 0, 0, 1/60, 'unblock'])
    
    // More attacks with cooldown waits
    for (let a = 0; a < 5; a++) {
      inputScript.push([0, 0, 0, 0.5, 'attack'])
      for (let i = 0; i < 30; i++) {
        inputScript.push([0, 0, 0, 1/60, null])
      }
    }
    
    // Move diagonally while rolling occasionally
    for (let t = 0; t < 20; t++) {
      const roll = t % 5 === 0
      for (let i = 0; i < 60; i++) {
        inputScript.push([0.7, 0.7, roll ? 1 : 0, 1/60, roll && i === 0 ? 'roll' : null])
      }
    }
    
    // Fill remaining time with idle
    while (inputScript.length < 3600) {
      inputScript.push([0, 0, 0, 1/60, null])
    }

    // Function to run the input script and capture state
    const runScript = (seed) => {
      // Initialize with seed
      api.init_run(BigInt(seed), 0)
      
      const states = []
      let totalTime = 0
      
      // Execute input script
      for (const [dirX, dirY, isRolling, dt, action] of inputScript) {
        // Handle special actions
        if (action === 'attack') {
          api.on_attack()
        } else if (action === 'roll') {
          api.on_roll_start()
        } else if (action === 'block') {
          api.set_blocking(1, dirX || 1, dirY || 0)
        } else if (action === 'unblock') {
          api.set_blocking(0, 0, 0)
        }
        
        // Update simulation
        api.update(dirX, dirY, isRolling, dt)
        totalTime += dt
        
        // Capture state every second
        if (Math.floor(totalTime) > states.length) {
          states.push({
            time: totalTime,
            x: api.get_x(),
            y: api.get_y(),
            stamina: api.get_stamina(),
            phase: api.get_phase(),
            blockState: api.get_block_state(),
            enemyCount: api.get_enemy_count ? api.get_enemy_count() : 0,
            obstacleCount: api.get_obstacle_count ? api.get_obstacle_count() : 0
          })
        }
      }
      
      // Capture final state
      const finalState = {
        time: totalTime,
        x: api.get_x(),
        y: api.get_y(),
        stamina: api.get_stamina(),
        phase: api.get_phase(),
        blockState: api.get_block_state(),
        enemyCount: api.get_enemy_count ? api.get_enemy_count() : 0,
        obstacleCount: api.get_obstacle_count ? api.get_obstacle_count() : 0,
        choiceCount: api.get_choice_count()
      }
      
      return {states, finalState}
    }

    // Run with same seed multiple times
    const seed = 42
    const run1 = runScript(seed)
    const run2 = runScript(seed)
    const run3 = runScript(seed)
    
    // Run with different seed for comparison
    const differentSeed = 999
    const runDiff = runScript(differentSeed)

    return {run1, run2, run3, runDiff, seed, differentSeed}
  })

  // Verify determinism: same seed + same inputs = same results
  expect(result.run1.finalState).toEqual(result.run2.finalState)
  expect(result.run2.finalState).toEqual(result.run3.finalState)
  
  // Verify all intermediate states match
  for (let i = 0; i < result.run1.states.length; i++) {
    expect(result.run1.states[i]).toEqual(result.run2.states[i])
    expect(result.run2.states[i]).toEqual(result.run3.states[i])
  }
  
  // Verify different seed produces different results (with high probability)
  const sameFinal = JSON.stringify(result.run1.finalState) === JSON.stringify(result.runDiff.finalState)
  expect(sameFinal).toBe(false)
  
  // Log final state for debugging
  console.log('Golden test final state (seed=' + result.seed + '):', result.run1.finalState)
  console.log('Different seed final state (seed=' + result.differentSeed + '):', result.runDiff.finalState)
})

test('Golden Test: Pity timer for rare choices', async ({page}) => {
  await page.goto(testUrl)

  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Test pity timer by forcing many choice cycles
    const testPityTimer = (seed) => {
      api.init_run(BigInt(seed), 0)
      
      const rarities = []
      let choiceCycles = 0
      const maxCycles = 20
      
      while (choiceCycles < maxCycles) {
        // Trigger phase change to Choose by attacking
        for (let i = 0; i < 5; i++) {
          api.on_attack()
          api.update(0, 0, 0, 0.5) // wait for cooldown
        }
        
        if (api.get_phase() === 2) { // Choose phase
          const count = api.get_choice_count()
          if (count > 0) {
            // Record rarities
            for (let i = 0; i < count; i++) {
              rarities.push(api.get_choice_rarity(i))
            }
            
            // Commit first choice to continue
            api.commit_choice(api.get_choice_id(0))
            choiceCycles++
          }
        }
        
        // Step simulation
        api.update(0, 0, 0, 0.1)
      }
      
      return rarities
    }

    const rarities = testPityTimer(12345)
    
    // Count rare choices (assuming rarity 2+ is rare)
    const rareCount = rarities.filter(r => r >= 2).length
    const totalCount = rarities.length
    
    return {rarities, rareCount, totalCount}
  })

  // Verify that we get at least some rare choices
  // With pity timer, we should see at least 1 rare in 20 cycles (60 choices)
  expect(result.rareCount).toBeGreaterThan(0)
  
  console.log(`Pity timer test: ${result.rareCount}/${result.totalCount} rare choices`)
  console.log('Rarity distribution:', result.rarities)
})
