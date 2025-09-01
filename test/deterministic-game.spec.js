import {test, expect} from '@playwright/test'

test.describe('Deterministic Game Module Tests', () => {
  test('fixed-point division handles zero correctly', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {fixedDiv, toFixed} = await import('../src/deterministic-game.js')
      
      const testCases = []
      
      // Test normal division
      try {
        const a = toFixed(10)
        const b = toFixed(2)
        const result = fixedDiv(a, b)
        testCases.push({
          case: 'normal',
          a: 10,
          b: 2,
          result: result / (1 << 16), // Convert back to float
          success: true
        })
      } catch (error) {
        testCases.push({
          case: 'normal',
          success: false,
          error: error.message
        })
      }
      
      // Test division by zero
      try {
        const a = toFixed(10)
        const result = fixedDiv(a, 0)
        testCases.push({
          case: 'divByZero',
          success: false,
          result
        })
      } catch (error) {
        testCases.push({
          case: 'divByZero',
          success: true,
          error: error.message
        })
      }
      
      // Test edge cases
      try {
        const a = toFixed(1)
        const b = toFixed(3)
        const result = fixedDiv(a, b)
        testCases.push({
          case: 'fraction',
          a: 1,
          b: 3,
          result: result / (1 << 16),
          success: true
        })
      } catch (error) {
        testCases.push({
          case: 'fraction',
          success: false,
          error: error.message
        })
      }
      
      return testCases
    })
    
    // Normal division should work
    const normalCase = result.find(r => r.case === 'normal')
    expect(normalCase.success).toBe(true)
    expect(Math.abs(normalCase.result - 5)).toBeLessThan(0.01)
    
    // Division by zero should throw
    const divByZeroCase = result.find(r => r.case === 'divByZero')
    expect(divByZeroCase.success).toBe(true)
    expect(divByZeroCase.error).toContain('Division by zero')
    
    // Fraction should work
    const fractionCase = result.find(r => r.case === 'fraction')
    expect(fractionCase.success).toBe(true)
  })

  test('DeterministicRandom nextInt validates range', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {DeterministicRandom} = await import('../src/deterministic-game.js')
      
      const rng = new DeterministicRandom(12345)
      const testCases = []
      
      // Test valid range
      try {
        const values = []
        for (let i = 0; i < 100; i++) {
          values.push(rng.nextInt(0, 10))
        }
        const allInRange = values.every(v => v >= 0 && v < 10)
        testCases.push({
          case: 'validRange',
          success: true,
          allInRange,
          min: Math.min(...values),
          max: Math.max(...values)
        })
      } catch (error) {
        testCases.push({
          case: 'validRange',
          success: false,
          error: error.message
        })
      }
      
      // Test invalid range (min >= max)
      try {
        rng.nextInt(5, 5)
        testCases.push({
          case: 'equalMinMax',
          success: false
        })
      } catch (error) {
        testCases.push({
          case: 'equalMinMax',
          success: true,
          error: error.message
        })
      }
      
      // Test invalid range (min > max)
      try {
        rng.nextInt(10, 5)
        testCases.push({
          case: 'minGreaterThanMax',
          success: false
        })
      } catch (error) {
        testCases.push({
          case: 'minGreaterThanMax',
          success: true,
          error: error.message
        })
      }
      
      return testCases
    })
    
    // Valid range should work
    const validCase = result.find(r => r.case === 'validRange')
    expect(validCase.success).toBe(true)
    expect(validCase.allInRange).toBe(true)
    
    // Invalid ranges should throw
    const equalCase = result.find(r => r.case === 'equalMinMax')
    expect(equalCase.success).toBe(true)
    expect(equalCase.error).toContain('min must be less than max')
    
    const invalidCase = result.find(r => r.case === 'minGreaterThanMax')
    expect(invalidCase.success).toBe(true)
    expect(invalidCase.error).toContain('min must be less than max')
  })

  test('fixed-point math operations', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {
        toFixed, fromFixed, fixedAdd, fixedSub, 
        fixedMul, fixedSqrt, fixedSin, fixedCos
      } = await import('../src/deterministic-game.js')
      
      const tests = []
      
      // Test basic arithmetic
      const a = toFixed(3.5)
      const b = toFixed(2.0)
      
      tests.push({
        operation: 'add',
        result: fromFixed(fixedAdd(a, b)),
        expected: 5.5
      })
      
      tests.push({
        operation: 'sub',
        result: fromFixed(fixedSub(a, b)),
        expected: 1.5
      })
      
      tests.push({
        operation: 'mul',
        result: fromFixed(fixedMul(a, b)),
        expected: 7.0
      })
      
      // Test sqrt
      const c = toFixed(9)
      tests.push({
        operation: 'sqrt',
        result: fromFixed(fixedSqrt(c)),
        expected: 3.0
      })
      
      // Test sqrt of negative (should return 0)
      tests.push({
        operation: 'sqrtNegative',
        result: fromFixed(fixedSqrt(toFixed(-1))),
        expected: 0
      })
      
      // Test trig functions
      tests.push({
        operation: 'sin0',
        result: fromFixed(fixedSin(0)),
        expected: 0
      })
      
      tests.push({
        operation: 'cos0',
        result: fromFixed(fixedCos(0)),
        expected: 1
      })
      
      return tests
    })
    
    // Check all operations are within acceptable tolerance
    result.forEach(test => {
      const tolerance = 0.01
      expect(Math.abs(test.result - test.expected)).toBeLessThan(tolerance)
    })
  })

  test('DeterministicGame initialization and state management', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {DeterministicGame} = await import('../src/deterministic-game.js')
      
      const game = new DeterministicGame({
        seed: 42,
        maxEntities: 100
      })
      
      // Initialize with players
      const players = ['player1', 'player2', 'player3']
      game.initialize(players)
      
      // Get initial state
      const initialState = game.getState()
      
      // Simulate some frames
      for (let i = 0; i < 10; i++) {
        game.update({})
      }
      
      const afterUpdateState = game.getState()
      
      // Save and load state
      const savedState = game.saveState()
      
      // Continue updating
      for (let i = 0; i < 5; i++) {
        game.update({})
      }
      
      const beforeLoadState = game.getState()
      
      // Load saved state
      game.loadState(savedState)
      const afterLoadState = game.getState()
      
      return {
        playersCreated: initialState.players.length === players.length,
        frameProgressed: afterUpdateState.frame > initialState.frame,
        stateRestored: afterLoadState.frame === savedState.frame,
        frameRolledBack: afterLoadState.frame < beforeLoadState.frame,
        hasChecksum: typeof afterUpdateState.checksum === 'number'
      }
    })
    
    expect(result.playersCreated).toBe(true)
    expect(result.frameProgressed).toBe(true)
    expect(result.stateRestored).toBe(true)
    expect(result.frameRolledBack).toBe(true)
    expect(result.hasChecksum).toBe(true)
  })

  test('DeterministicRandom determinism', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {DeterministicRandom} = await import('../src/deterministic-game.js')
      
      const seed = 999
      const rng1 = new DeterministicRandom(seed)
      const rng2 = new DeterministicRandom(seed)
      
      const sequence1 = []
      const sequence2 = []
      
      for (let i = 0; i < 20; i++) {
        sequence1.push(rng1.nextFloat())
        sequence2.push(rng2.nextFloat())
      }
      
      // Test save/load
      const state = rng1.save()
      const beforeLoad = rng1.nextFloat()
      
      rng1.load(state)
      const afterLoad = rng1.nextFloat()
      
      // Test reset
      rng1.reset()
      const afterReset = rng1.nextFloat()
      
      return {
        sequencesMatch: JSON.stringify(sequence1) === JSON.stringify(sequence2),
        saveLoadWorks: beforeLoad === afterLoad,
        resetWorks: afterReset === sequence1[0],
        allInRange: sequence1.every(v => v >= 0 && v < 1)
      }
    })
    
    expect(result.sequencesMatch).toBe(true)
    expect(result.saveLoadWorks).toBe(true)
    expect(result.resetWorks).toBe(true)
    expect(result.allInRange).toBe(true)
  })
})