import {test, expect} from '@playwright/test'

test.describe('Utils Module Tests', () => {
  test('shuffle function with operator precedence fix', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {shuffle} = await import('../src/utils.js')
      
      // Test shuffle with various array sizes
      const testCases = [
        { input: [1, 2, 3, 4, 5], seed: 42 },
        { input: ['a', 'b', 'c'], seed: 123 },
        { input: [1], seed: 0 },
        { input: [], seed: 999 }
      ]
      
      const results = []
      
      for (const {input, seed} of testCases) {
        const shuffled = shuffle(input, seed)
        
        // Verify length is preserved
        if (shuffled.length !== input.length) {
          throw new Error(`Length mismatch: expected ${input.length}, got ${shuffled.length}`)
        }
        
        // Verify all elements are present
        for (const elem of input) {
          if (!shuffled.includes(elem)) {
            throw new Error(`Element ${elem} missing from shuffled array`)
          }
        }
        
        // Verify deterministic behavior
        const shuffled2 = shuffle(input, seed)
        if (JSON.stringify(shuffled) !== JSON.stringify(shuffled2)) {
          throw new Error('Shuffle is not deterministic with same seed')
        }
        
        results.push({
          input,
          seed,
          output: shuffled,
          isDeterministic: true
        })
      }
      
      return results
    })
    
    expect(result).toHaveLength(4)
    result.forEach(r => {
      expect(r.isDeterministic).toBe(true)
    })
  })

  test('genId generates unique IDs', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {genId} = await import('../src/utils.js')
      
      const ids = new Set()
      const numIds = 100
      const idLength = 20
      
      for (let i = 0; i < numIds; i++) {
        const id = genId(idLength)
        
        // Check length
        if (id.length !== idLength) {
          throw new Error(`ID length mismatch: expected ${idLength}, got ${id.length}`)
        }
        
        // Check character set
        if (!/^[0-9A-Za-z]+$/.test(id)) {
          throw new Error(`Invalid characters in ID: ${id}`)
        }
        
        ids.add(id)
      }
      
      return {
        totalGenerated: numIds,
        uniqueIds: ids.size,
        allUnique: ids.size === numIds
      }
    })
    
    expect(result.allUnique).toBe(true)
    expect(result.uniqueIds).toBe(result.totalGenerated)
  })

  test('toHex converts buffer correctly', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {toHex} = await import('../src/utils.js')
      
      const testCases = [
        { input: new Uint8Array([0, 255, 16, 128]), expected: '00ff1080' },
        { input: new Uint8Array([1, 2, 3]), expected: '010203' },
        { input: new Uint8Array([]), expected: '' }
      ]
      
      const results = []
      for (const {input, expected} of testCases) {
        const hex = toHex(input)
        results.push({
          input: Array.from(input),
          output: hex,
          expected,
          passed: hex === expected
        })
      }
      
      return results
    })
    
    result.forEach(r => {
      expect(r.passed).toBe(true)
    })
  })
})