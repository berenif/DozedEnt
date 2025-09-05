import {test, expect} from '@playwright/test'

test.describe('Golden Gameplay Tests', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('http://localhost:8080/index.html')
    await page.waitForTimeout(500) // Wait for WASM to load
  })

  test('deterministic gameplay with fixed seed', async ({page}) => {
    // Set a fixed seed via URL parameter
    await page.goto('http://localhost:8080/index.html?seed=12345')
    await page.waitForTimeout(1000)

    // Record initial state
    const initialState = await page.evaluate(() => {
      if (!window.wasmExports) return null
      return {
        x: window.wasmExports.get_x(),
        y: window.wasmExports.get_y(),
        stamina: window.wasmExports.get_stamina(),
        phase: window.wasmExports.get_phase()
      }
    })

    expect(initialState).toBeTruthy()
    expect(initialState.x).toBeCloseTo(0.5, 2)
    expect(initialState.y).toBeCloseTo(0.5, 2)
    expect(initialState.stamina).toBeCloseTo(1.0, 2)
    expect(initialState.phase).toBe(0) // Explore phase

    // Simulate 60 seconds of gameplay with fixed inputs
    const inputScript = [
      {time: 1000, action: 'move', dirX: 1, dirY: 0},
      {time: 2000, action: 'move', dirX: 0, dirY: 1},
      {time: 3000, action: 'attack'},
      {time: 4000, action: 'roll'},
      {time: 5000, action: 'move', dirX: -1, dirY: 0},
      {time: 6000, action: 'block', faceX: 1, faceY: 0},
      {time: 7000, action: 'move', dirX: 0, dirY: -1},
      {time: 8000, action: 'attack'},
      {time: 9000, action: 'move', dirX: 1, dirY: 1},
      {time: 10000, action: 'roll'}
    ]

    // Execute input script
    for (const input of inputScript) {
      await page.waitForTimeout(input.time - (inputScript.indexOf(input) > 0 ? inputScript[inputScript.indexOf(input) - 1].time : 0))
      
      await page.evaluate((input) => {
        if (!window.wasmExports) return
        
        switch (input.action) {
          case 'move':
            window.g_input_dir_x = input.dirX
            window.g_input_dir_y = input.dirY
            break
          case 'attack':
            if (window.wasmExports.on_attack) {
              window.wasmExports.on_attack()
            }
            break
          case 'roll':
            if (window.wasmExports.on_roll_start) {
              window.wasmExports.on_roll_start()
            }
            break
          case 'block':
            if (window.wasmExports.set_blocking) {
              window.wasmExports.set_blocking(1, input.faceX, input.faceY, performance.now() / 1000)
            }
            break
        }
      }, input)
    }

    // Wait for actions to complete
    await page.waitForTimeout(2000)

    // Record final state
    const finalState = await page.evaluate(() => {
      if (!window.wasmExports) return null
      return {
        x: window.wasmExports.get_x(),
        y: window.wasmExports.get_y(),
        stamina: window.wasmExports.get_stamina(),
        phase: window.wasmExports.get_phase(),
        wolfKills: window.g_wolf_kills_since_choice || 0
      }
    })

    // Store golden values (these should be consistent across runs with same seed)
    const goldenFinalState = {
      x: finalState.x,
      y: finalState.y,
      stamina: finalState.stamina,
      phase: finalState.phase,
      wolfKills: finalState.wolfKills
    }

    console.log('Golden final state:', goldenFinalState)

    // Test determinism by reloading and running the same script
    await page.goto('/index.html?seed=12345')
    await page.waitForTimeout(1000)

    // Run the same input script again
    for (const input of inputScript) {
      await page.waitForTimeout(input.time - (inputScript.indexOf(input) > 0 ? inputScript[inputScript.indexOf(input) - 1].time : 0))
      
      await page.evaluate((input) => {
        if (!window.wasmExports) return
        
        switch (input.action) {
          case 'move':
            window.g_input_dir_x = input.dirX
            window.g_input_dir_y = input.dirY
            break
          case 'attack':
            if (window.wasmExports.on_attack) {
              window.wasmExports.on_attack()
            }
            break
          case 'roll':
            if (window.wasmExports.on_roll_start) {
              window.wasmExports.on_roll_start()
            }
            break
          case 'block':
            if (window.wasmExports.set_blocking) {
              window.wasmExports.set_blocking(1, input.faceX, input.faceY, performance.now() / 1000)
            }
            break
        }
      }, input)
    }

    await page.waitForTimeout(2000)

    // Verify determinism
    const verifyState = await page.evaluate(() => {
      if (!window.wasmExports) return null
      return {
        x: window.wasmExports.get_x(),
        y: window.wasmExports.get_y(),
        stamina: window.wasmExports.get_stamina(),
        phase: window.wasmExports.get_phase(),
        wolfKills: window.g_wolf_kills_since_choice || 0
      }
    })

    // States should match exactly
    expect(verifyState.x).toBeCloseTo(goldenFinalState.x, 5)
    expect(verifyState.y).toBeCloseTo(goldenFinalState.y, 5)
    expect(verifyState.stamina).toBeCloseTo(goldenFinalState.stamina, 5)
    expect(verifyState.phase).toBe(goldenFinalState.phase)
    expect(verifyState.wolfKills).toBe(goldenFinalState.wolfKills)
  })

  test('pity timer guarantees good choice after bad streak', async ({page}) => {
    await page.goto('http://localhost:8080/index.html?seed=99999')
    await page.waitForTimeout(1000)

    // Simulate getting to choice phase multiple times
    const simulateChoices = async (count) => {
      for (let i = 0; i < count; i++) {
        // Kill 3 wolves to trigger choice phase
        await page.evaluate(() => {
          if (!window.wasmExports) return
          // Simulate killing wolves (this would normally happen through gameplay)
          window.g_wolf_kills_since_choice = 3
          if (window.wasmExports.get_phase() === 0 || window.wasmExports.get_phase() === 1) {
            // Trigger choice generation
            window.wasmExports.generate_choices && window.wasmExports.generate_choices()
          }
        })

        await page.waitForTimeout(100)

        // Check if we're in choice phase
        const phase = await page.evaluate(() => window.wasmExports?.get_phase())
        if (phase === 2) { // Choose phase
          // Get choice rarities
          const rarities = await page.evaluate(() => {
            if (!window.wasmExports) return []
            const count = window.wasmExports.get_choice_count()
            const rarities = []
            for (let i = 0; i < count; i++) {
              rarities.push(window.wasmExports.get_choice_rarity(i))
            }
            return rarities
          })

          console.log(`Choice ${i + 1} rarities:`, rarities)

          // Select the first choice to continue
          await page.evaluate(() => {
            if (window.wasmExports?.commit_choice) {
              const choiceId = window.wasmExports.get_choice_id(0)
              window.wasmExports.commit_choice(choiceId)
            }
          })
        }
      }
    }

    // Simulate multiple choice rounds
    await simulateChoices(10)

    // After many choices, pity timer should guarantee at least one high-rarity choice
    const finalRarities = await page.evaluate(() => {
      if (!window.wasmExports) return []
      window.g_wolf_kills_since_choice = 3
      window.wasmExports.generate_choices && window.wasmExports.generate_choices()
      
      const count = window.wasmExports.get_choice_count()
      const rarities = []
      for (let i = 0; i < count; i++) {
        rarities.push(window.wasmExports.get_choice_rarity(i))
      }
      return rarities
    })

    // At least one choice should have high rarity (>= 3)
    const hasHighRarity = finalRarities.some(r => r >= 3)
    expect(hasHighRarity).toBeTruthy()
  })

  test('phase transitions work correctly', async ({page}) => {
    await page.goto('http://localhost:8080/index.html?seed=54321')
    await page.waitForTimeout(1000)

    const phases = []
    
    // Track phase transitions
    const checkPhase = async () => {
      const phase = await page.evaluate(() => window.wasmExports?.get_phase())
      return phase
    }

    // Initial phase should be Explore (0)
    phases.push(await checkPhase())
    expect(phases[0]).toBe(0)

    // Simulate gameplay to trigger phase transitions
    for (let i = 0; i < 20; i++) {
      await page.evaluate(() => {
        if (!window.wasmExports) return
        
        // Simulate time passing
        window.wasmExports.update && window.wasmExports.update(0, 0, 0, 0.1)
        
        // Simulate enemy defeats to trigger choices
        if (i % 3 === 0) {
          window.g_wolf_kills_since_choice = (window.g_wolf_kills_since_choice || 0) + 1
        }
      })
      
      const currentPhase = await checkPhase()
      if (phases[phases.length - 1] !== currentPhase) {
        phases.push(currentPhase)
        console.log(`Phase transition: ${phases[phases.length - 2]} -> ${currentPhase}`)
      }
      
      await page.waitForTimeout(100)
    }

    // Should have experienced at least one phase transition
    expect(phases.length).toBeGreaterThan(1)
    
    // Phases should be valid (0-7)
    phases.forEach(phase => {
      expect(phase).toBeGreaterThanOrEqual(0)
      expect(phase).toBeLessThanOrEqual(7)
    })
  })
})