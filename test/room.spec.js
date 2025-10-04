import './setup.js';
import {test, expect} from '@playwright/test'

test.describe('Room Module Tests', () => {
  test('room handles peer cleanup safely', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const roomModule = await import('../src/room.js')
      const createRoom = roomModule.default
      
      let peerJoinCount = 0
      let peerLeaveCount = 0
      
      const room = createRoom(
        (peerId) => { peerJoinCount++ },
        (peerId) => { peerLeaveCount++ },
        () => {},
        null
      )
      
      // Simulate adding a peer
      const mockPeer = {
        destroy: () => {},
        sendData: () => {},
        channel: {
          readyState: 'open',
          bufferedAmount: 0,
          bufferedAmountLowThreshold: 16384
        }
      }
      
      // Access internal methods through returned object
      const roomObj = room({
        onPeerJoin: () => {},
        onPeerLeave: () => {},
        onPeerStream: () => {},
        onPeerTrack: () => {}
      })
      
      // Add peer to internal map (simulating peer join)
      const peerId = 'test-peer-123'
      
      // Test that room handles missing peers gracefully
      try {
        // Try to handle data from non-existent peer
        roomObj.handleData('non-existent-peer', new Uint8Array([1, 2, 3]))
        
        return {
          success: true,
          error: null,
          peerJoinCount,
          peerLeaveCount
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          peerJoinCount,
          peerLeaveCount
        }
      }
    })
    
    // Room should handle missing peers gracefully without throwing
    expect(result.success).toBe(true)
  })

  test('makeAction validates parameters', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const roomModule = await import('../src/room.js')
      const createRoom = roomModule.default
      
      const room = createRoom(
        () => {},
        () => {},
        () => {},
        null
      )
      
      const roomObj = room({
        onPeerJoin: () => {},
        onPeerLeave: () => {},
        onPeerStream: () => {},
        onPeerTrack: () => {}
      })
      
      const results = {
        emptyType: null,
        longType: null,
        validType: null,
        metaWithNonBinary: null
      }
      
      // Test empty type
      try {
        roomObj.makeAction('')
      } catch (error) {
        results.emptyType = error.message
      }
      
      // Test type that's too long
      try {
        roomObj.makeAction('a'.repeat(20))
      } catch (error) {
        results.longType = error.message
      }
      
      // Test valid type
      try {
        const [send, receive] = roomObj.makeAction('test')
        results.validType = typeof send === 'function' && typeof receive === 'function'
      } catch (error) {
        results.validType = false
      }
      
      // Test meta with non-binary data
      try {
        const [send] = roomObj.makeAction('meta-test')
        await send('string data', null, {meta: 'data'})
      } catch (error) {
        results.metaWithNonBinary = error.message
      }
      
      return results
    })
    
    expect(result.emptyType).toContain('action type argument is required')
    expect(result.longType).toContain('exceeds')
    expect(result.validType).toBe(true)
    expect(result.metaWithNonBinary).toContain('meta argument can only be used with binary data')
  })

  test('room handles binary and text data correctly', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const roomModule = await import('../src/room.js')
      const createRoom = roomModule.default
      
      const room = createRoom(
        () => {},
        () => {},
        () => {},
        null
      )
      
      const roomObj = room({
        onPeerJoin: () => {},
        onPeerLeave: () => {},
        onPeerStream: () => {},
        onPeerTrack: () => {}
      })
      
      const [sendTest] = roomObj.makeAction('data-test')
      
      const testCases = []
      
      // Test string data
      try {
        await sendTest('Hello World')
        testCases.push({ type: 'string', success: true })
      } catch (error) {
        testCases.push({ type: 'string', success: false, error: error.message })
      }
      
      // Test JSON data
      try {
        await sendTest({ key: 'value', number: 123 })
        testCases.push({ type: 'json', success: true })
      } catch (error) {
        testCases.push({ type: 'json', success: false, error: error.message })
      }
      
      // Test ArrayBuffer
      try {
        const buffer = new ArrayBuffer(10)
        await sendTest(buffer)
        testCases.push({ type: 'arraybuffer', success: true })
      } catch (error) {
        testCases.push({ type: 'arraybuffer', success: false, error: error.message })
      }
      
      // Test Uint8Array
      try {
        const array = new Uint8Array([1, 2, 3, 4, 5])
        await sendTest(array)
        testCases.push({ type: 'uint8array', success: true })
      } catch (error) {
        testCases.push({ type: 'uint8array', success: false, error: error.message })
      }
      
      // Test undefined (should fail)
      try {
        await sendTest(undefined)
        testCases.push({ type: 'undefined', success: true })
      } catch (error) {
        testCases.push({ type: 'undefined', success: false, error: error.message })
      }
      
      return testCases
    })
    
    // All data types except undefined should succeed
    expect(result.find(r => r.type === 'string').success).toBe(true)
    expect(result.find(r => r.type === 'json').success).toBe(true)
    expect(result.find(r => r.type === 'arraybuffer').success).toBe(true)
    expect(result.find(r => r.type === 'uint8array').success).toBe(true)
    expect(result.find(r => r.type === 'undefined').success).toBe(false)
    expect(result.find(r => r.type === 'undefined').error).toContain('cannot be undefined')
  })

  test('pendingTransmissions cleanup is safe', async ({page}) => {
    await page.goto('https://localhost:8080/test')
    
    const result = await page.evaluate(async () => {
      const roomModule = await import('../src/room.js')
      const createRoom = roomModule.default
      
      const room = createRoom(
        () => {},
        () => {},
        () => {},
        null
      )
      
      const roomObj = room({
        onPeerJoin: () => {},
        onPeerLeave: () => {},
        onPeerStream: () => {},
        onPeerTrack: () => {}
      })
      
      // Simulate receiving data with proper format
      const typeBytes = new TextEncoder().encode('test')
      const typeBytesPadded = new Uint8Array(12)
      typeBytesPadded.set(typeBytes)
      
      const chunk = new Uint8Array(16)
      chunk.set(typeBytesPadded, 0)
      chunk[12] = 1 // nonce
      chunk[13] = 1 // isLast flag
      chunk[14] = 255 // progress
      
      // First register the action
      roomObj.makeAction('test')
      
      // Try to handle data from non-existent peer (should not throw)
      try {
        roomObj.handleData('non-existent-peer', chunk)
        return { success: true, error: null }
      } catch (error) {
        return { success: false, error: error.message }
      }
    })
    
    // Should handle gracefully without throwing
    expect(result.success).toBe(true)
  })
})
