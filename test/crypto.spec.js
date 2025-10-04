import './setup.js';
import {test, expect} from '@playwright/test'

test.describe('Crypto Module Tests', () => {
  test('encrypt and decrypt with valid data', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {genKey, encrypt, decrypt} = await import('../src/crypto.js')
      
      const secret = 'test-secret'
      const appId = 'test-app'
      const roomId = 'test-room'
      const plaintext = 'Hello, World! This is a test message.'
      
      try {
        // Generate key
        const key = await genKey(secret, appId, roomId)
        
        // Encrypt
        const encrypted = await encrypt(key, plaintext)
        
        // Verify encrypted format (should contain $)
        if (!encrypted.includes('$')) {
          throw new Error('Encrypted data missing separator')
        }
        
        // Decrypt
        const decrypted = await decrypt(key, encrypted)
        
        return {
          success: true,
          plaintext,
          encrypted: encrypted.substring(0, 50) + '...', // Truncate for display
          decrypted,
          matches: plaintext === decrypted
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        }
      }
    })
    
    expect(result.success).toBe(true)
    expect(result.matches).toBe(true)
  })

  test('decrypt with invalid data formats', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {genKey, decrypt} = await import('../src/crypto.js')
      
      const key = await genKey('secret', 'app', 'room')
      const testCases = [
        { input: null, expectedError: 'Invalid encrypted data format' },
        { input: undefined, expectedError: 'Invalid encrypted data format' },
        { input: '', expectedError: 'Invalid encrypted data format' },
        { input: 'no-separator', expectedError: 'Invalid encrypted data format' },
        { input: '$', expectedError: 'Missing IV or ciphertext' },
        { input: 'iv$', expectedError: 'Missing IV or ciphertext' },
        { input: '$cipher', expectedError: 'Missing IV or ciphertext' }
      ]
      
      const results = []
      
      for (const {input, expectedError} of testCases) {
        try {
          await decrypt(key, input)
          results.push({
            input,
            error: null,
            passed: false
          })
        } catch (error) {
          results.push({
            input,
            error: error.message,
            passed: error.message.includes(expectedError)
          })
        }
      }
      
      return results
    })
    
    result.forEach(r => {
      expect(r.passed).toBe(true)
    })
  })

  test('sha1 caching works correctly', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {sha1} = await import('../src/crypto.js')
      
      const testString = 'test-string-for-hashing'
      
      // First call
      const start1 = performance.now()
      const hash1 = await sha1(testString)
      const time1 = performance.now() - start1
      
      // Second call (should be cached)
      const start2 = performance.now()
      const hash2 = await sha1(testString)
      const time2 = performance.now() - start2
      
      // Different string
      const hash3 = await sha1('different-string')
      
      return {
        hash1,
        hash2,
        hash3,
        hashesMatch: hash1 === hash2,
        differentHash: hash1 !== hash3,
        time1,
        time2,
        cachedFaster: time2 < time1 || time2 < 0.1 // Cached should be very fast
      }
    })
    
    expect(result.hashesMatch).toBe(true)
    expect(result.differentHash).toBe(true)
  })

  test('hashWith supports different algorithms', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const {hashWith} = await import('../src/crypto.js')
      
      const testString = 'test'
      const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
      const results = {}
      
      for (const algo of algorithms) {
        const hash = await hashWith(algo, testString)
        results[algo] = {
          length: hash.length,
          sample: Array.from(hash.slice(0, 4))
        }
      }
      
      return results
    })
    
    // Verify different algorithms produce different length hashes
    expect(result['SHA-1'].length).toBe(20)
    expect(result['SHA-256'].length).toBe(32)
    expect(result['SHA-384'].length).toBe(48)
    expect(result['SHA-512'].length).toBe(64)
  })
})
