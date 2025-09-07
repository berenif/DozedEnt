import {test, expect} from '@playwright/test'

const testUrl = 'https://localhost:8080/test'

test('Wolf Pack Management: 3 packs with 30s respawn', async ({page}) => {
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

    // Test results object
    const results = {
      initialPackCount: 0,
      initialPacksAlive: 0,
      packsAfterClear: 0,
      packsAfterRespawn: 0,
      respawnTimersWork: false,
      maintainsThreePacks: false
    }

    try {
      // Initialize game
      api.init_run(12345n, 0)

      // Test 1: Should initialize with 3 active wolf packs
      results.initialPackCount = api.get_wolf_pack_count()
      
      let aliveCount = 0
      for (let i = 0; i < 3; i++) {
        if (api.get_wolf_pack_active(i) && api.get_wolf_pack_alive(i)) {
          aliveCount++
        }
      }
      results.initialPacksAlive = aliveCount

      // Test 2: Kill all enemies and check pack death detection
      api.clear_enemies()
      
      // Update for several frames to let pack system detect deaths
      for (let i = 0; i < 20; i++) {
        api.update(0, 0, 0, 0.016) // 16ms frame
      }

      // Check for dead packs with respawn timers
      let deadPacksWithTimers = 0
      for (let i = 0; i < 3; i++) {
        if (api.get_wolf_pack_active(i) && !api.get_wolf_pack_alive(i)) {
          const timer = api.get_wolf_pack_respawn_timer(i)
          if (timer > 0 && timer <= 30) {
            deadPacksWithTimers++
          }
        }
      }
      results.respawnTimersWork = deadPacksWithTimers > 0

      // Test 3: Simulate 31 seconds passing (respawn should trigger)
      for (let i = 0; i < 31; i++) {
        api.update(0, 0, 0, 1.0) // 1 second per update
      }

      // Check that packs respawned
      results.packsAfterRespawn = api.get_wolf_pack_count()
      
      let aliveAfterRespawn = 0
      for (let i = 0; i < 3; i++) {
        if (api.get_wolf_pack_active(i) && api.get_wolf_pack_alive(i)) {
          aliveAfterRespawn++
        }
      }
      results.packsAfterClear = aliveAfterRespawn

      // Test 4: Run longer simulation to ensure pack count is maintained
      for (let i = 0; i < 200; i++) {
        api.update(0, 0, 0, 0.1) // 100ms per update
      }

      const finalPackCount = api.get_wolf_pack_count()
      results.maintainsThreePacks = (finalPackCount === 3)

    } catch (error) {
      results.error = error.message
    }

    return results
  })

  // Validate test results
  expect(result.initialPackCount).toBe(3)
  expect(result.initialPacksAlive).toBe(3)
  expect(result.respawnTimersWork).toBe(true)
  expect(result.packsAfterRespawn).toBe(3)
  expect(result.packsAfterClear).toBe(3)
  expect(result.maintainsThreePacks).toBe(true)

  if (result.error) {
    throw new Error(`Test failed with error: ${result.error}`)
  }
})

test('Wolf Pack API Functions', async ({page}) => {
  await page.goto(testUrl)

  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    const results = {
      apiExists: false,
      packDataValid: false
    }

    try {
      // Initialize game
      api.init_run(54321n, 0)

      // Check that all API functions exist
      const apiFunctions = [
        'get_wolf_pack_count',
        'get_wolf_pack_active', 
        'get_wolf_pack_alive',
        'get_wolf_pack_respawn_timer',
        'get_wolf_pack_member_count'
      ]

      results.apiExists = apiFunctions.every(fn => typeof api[fn] === 'function')

      // Test API functions return valid data
      const packCount = api.get_wolf_pack_count()
      let validPacks = 0

      for (let i = 0; i < packCount; i++) {
        const active = api.get_wolf_pack_active(i)
        const alive = api.get_wolf_pack_alive(i)
        const timer = api.get_wolf_pack_respawn_timer(i)
        const memberCount = api.get_wolf_pack_member_count(i)

        if (active === 1 && alive === 1 && timer === -1 && memberCount > 0) {
          validPacks++
        }
      }

      results.packDataValid = (validPacks === 3)

    } catch (error) {
      results.error = error.message
    }

    return results
  })

  expect(result.apiExists).toBe(true)
  expect(result.packDataValid).toBe(true)

  if (result.error) {
    throw new Error(`API test failed: ${result.error}`)
  }
})
