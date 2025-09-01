import {test, expect} from '@playwright/test'

const testUrl = 'https://localhost:8080/test'

test('Phase Transitions: Complete core loop test', async ({page}) => {
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

    // Track phase transitions
    const phaseTransitions = []
    const phaseNames = ['Explore', 'Fight', 'Choose', 'PowerUp', 'Risk', 'Escalate', 'CashOut', 'Reset']
    
    // Initialize
    api.init_run(BigInt(12345), 0)
    let currentPhase = api.get_phase()
    phaseTransitions.push({phase: currentPhase, name: phaseNames[currentPhase], time: 0})
    
    // Test complete core loop
    const testResults = {
      explore: false,
      fight: false,
      choose: false,
      powerUp: false,
      risk: false,
      escalate: false,
      cashOut: false,
      reset: false,
      roomCount: 0,
      gold: 0,
      essence: 0,
      curses: [],
      escalationLevel: 0,
      minibossDefeated: false
    }
    
    // Simulate gameplay for complete loop
    let simTime = 0
    const maxSimTime = 120 // 2 minutes max
    
    while (simTime < maxSimTime) {
      // Update simulation
      api.update(Math.sin(simTime) * 0.5, Math.cos(simTime) * 0.5, 0, 0.1)
      simTime += 0.1
      
      const newPhase = api.get_phase()
      if (newPhase !== currentPhase) {
        currentPhase = newPhase
        phaseTransitions.push({
          phase: currentPhase,
          name: phaseNames[currentPhase],
          time: simTime
        })
        
        // Mark phase as visited
        testResults[phaseNames[currentPhase].toLowerCase()] = true
      }
      
      // Phase-specific actions
      switch (currentPhase) {
        case 0: // Explore
        case 1: // Fight
          // Simulate combat to trigger choices
          if (Math.random() < 0.1) {
            api.on_attack()
          }
          // Check for Risk phase trigger
          if (api.should_enter_risk_phase && api.should_enter_risk_phase()) {
            api.force_phase_transition(4) // Risk
          }
          break;
          
        case 2: // Choose
          if (api.get_choice_count() > 0) {
            // Commit first choice
            const choiceId = api.get_choice_id(0)
            api.commit_choice(choiceId)
          }
          break;
          
        case 3: // PowerUp
          // Auto-transitions back to Explore
          break;
          
        case 4: // Risk
          testResults.curses.push({
            count: api.get_active_curse_count(),
            elite: api.get_elite_active()
          })
          
          // Try to escape after a bit
          if (Math.random() < 0.1) {
            api.escape_risk()
          }
          break;
          
        case 5: // Escalate
          testResults.escalationLevel = api.get_escalation_level()
          
          // Check miniboss
          if (api.get_miniboss_active()) {
            // Attack miniboss
            api.damage_miniboss(10)
            if (!api.get_miniboss_active()) {
              testResults.minibossDefeated = true
            }
          }
          break;
          
        case 6: // CashOut
          testResults.gold = api.get_gold()
          testResults.essence = api.get_essence()
          
          // Try to buy something
          if (api.get_shop_item_count() > 0) {
            api.buy_shop_item(0)
          }
          
          // Exit after shopping
          api.exit_cashout()
          break;
          
        case 7: // Reset
          testResults.reset = true
          api.reset_run(BigInt(54321))
          break;
      }
      
      // Check room count
      testResults.roomCount = api.get_room_count()
      
      // Break if we've seen all phases
      if (Object.values(testResults).filter(v => typeof v === 'boolean').every(v => v)) {
        break
      }
    }
    
    return {
      phaseTransitions,
      testResults,
      finalPhase: currentPhase,
      finalPhaseName: phaseNames[currentPhase],
      totalTime: simTime
    }
  })

  // Verify we visited multiple phases
  expect(result.phaseTransitions.length).toBeGreaterThan(1)
  
  // Log results
  console.log('Phase transition test results:')
  console.log('  Transitions:', result.phaseTransitions.map(t => t.name).join(' -> '))
  console.log('  Phases visited:', Object.entries(result.testResults)
    .filter(([k, v]) => typeof v === 'boolean' && v)
    .map(([k]) => k))
  console.log('  Room count:', result.testResults.roomCount)
  console.log('  Gold earned:', result.testResults.gold)
  console.log('  Essence earned:', result.testResults.essence)
  console.log('  Escalation level:', result.testResults.escalationLevel)
  console.log('  Total simulation time:', result.totalTime.toFixed(1), 'seconds')
})

test('Phase Transitions: Risk phase mechanics', async ({page}) => {
  await page.goto(testUrl)

  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../docs/game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Initialize and force Risk phase
    api.init_run(BigInt(99999), 0)
    api.force_phase_transition(4) // Risk phase
    
    const riskData = {
      initialPhase: api.get_phase(),
      cursesBefore: api.get_active_curse_count(),
      multiplierBefore: api.get_risk_multiplier(),
      eliteBefore: api.get_elite_active(),
      eventCount: api.get_risk_event_count()
    }
    
    // Trigger multiple risk events
    for (let i = 0; i < 5; i++) {
      api.trigger_risk_event()
      api.update(0, 0, 0, 0.5)
    }
    
    riskData.cursesAfter = api.get_active_curse_count()
    riskData.multiplierAfter = api.get_risk_multiplier()
    riskData.eliteAfter = api.get_elite_active()
    riskData.eventCountAfter = api.get_risk_event_count()
    
    // Get curse details
    riskData.curses = []
    for (let i = 0; i < riskData.cursesAfter; i++) {
      riskData.curses.push({
        type: api.get_curse_type(i),
        intensity: api.get_curse_intensity(i)
      })
    }
    
    // Try to escape
    riskData.escapeSuccessful = api.escape_risk() === 1
    riskData.finalPhase = api.get_phase()
    
    return riskData
  })

  // Verify Risk phase was entered
  expect(result.initialPhase).toBe(4)
  
  // Verify risk events were triggered
  expect(result.eventCountAfter).toBeGreaterThan(0)
  
  // Verify escape worked
  expect(result.escapeSuccessful).toBe(true)
  expect(result.finalPhase).toBe(0) // Back to Explore
  
  console.log('Risk phase test results:')
  console.log('  Curses applied:', result.cursesAfter)
  console.log('  Risk multiplier:', result.multiplierAfter)
  console.log('  Elite spawned:', result.eliteAfter)
  console.log('  Curse details:', result.curses)
})

test('Phase Transitions: Escalate phase mechanics', async ({page}) => {
  await page.goto(testUrl)

  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../docs/game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Initialize and force Escalate phase
    api.init_run(BigInt(77777), 0)
    api.force_phase_transition(5) // Escalate phase
    
    const escalateData = {
      initialPhase: api.get_phase(),
      levelBefore: api.get_escalation_level(),
      spawnRateBefore: api.get_spawn_rate_modifier(),
      enemySpeedBefore: api.get_enemy_speed_modifier(),
      enemyDamageBefore: api.get_enemy_damage_modifier(),
      minibossBefore: api.get_miniboss_active()
    }
    
    // Trigger escalation events
    for (let i = 0; i < 3; i++) {
      api.trigger_escalation_event()
      api.update(0, 0, 0, 1.0)
    }
    
    escalateData.levelAfter = api.get_escalation_level()
    escalateData.spawnRateAfter = api.get_spawn_rate_modifier()
    escalateData.enemySpeedAfter = api.get_enemy_speed_modifier()
    escalateData.enemyDamageAfter = api.get_enemy_damage_modifier()
    escalateData.minibossAfter = api.get_miniboss_active()
    
    // Get miniboss details if active
    if (escalateData.minibossAfter) {
      escalateData.miniboss = {
        x: api.get_miniboss_x(),
        y: api.get_miniboss_y(),
        health: api.get_miniboss_health()
      }
      
      // Try to damage miniboss
      api.damage_miniboss(50)
      escalateData.minibossHealthAfterDamage = api.get_miniboss_health()
    }
    
    return escalateData
  })

  // Verify Escalate phase was entered
  expect(result.initialPhase).toBe(5)
  
  // Verify escalation increased difficulty
  expect(result.levelAfter).toBeGreaterThan(result.levelBefore)
  expect(result.spawnRateAfter).toBeGreaterThanOrEqual(result.spawnRateBefore)
  
  console.log('Escalate phase test results:')
  console.log('  Escalation level:', result.levelAfter)
  console.log('  Spawn rate modifier:', result.spawnRateAfter)
  console.log('  Enemy speed modifier:', result.enemySpeedAfter)
  console.log('  Enemy damage modifier:', result.enemyDamageAfter)
  console.log('  Miniboss spawned:', result.minibossAfter)
  if (result.miniboss) {
    console.log('  Miniboss health:', result.miniboss.health)
  }
})

test('Phase Transitions: CashOut phase mechanics', async ({page}) => {
  await page.goto(testUrl)

  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../docs/game.wasm')
    const {instance, memory, exports} = await loadWasm(res)
    const api = exports

    // Initialize and force CashOut phase
    api.init_run(BigInt(33333), 0)
    
    // Add some currency first
    for (let i = 0; i < 10; i++) {
      api.on_attack()
      api.update(0, 0, 0, 0.5)
    }
    
    api.force_phase_transition(6) // CashOut phase
    
    const cashOutData = {
      initialPhase: api.get_phase(),
      goldBefore: api.get_gold(),
      essenceBefore: api.get_essence(),
      shopItemCount: api.get_shop_item_count(),
      items: []
    }
    
    // Get shop items
    for (let i = 0; i < cashOutData.shopItemCount; i++) {
      cashOutData.items.push({
        type: api.get_shop_item_type(i),
        goldCost: api.get_shop_item_cost_gold(i),
        essenceCost: api.get_shop_item_cost_essence(i)
      })
    }
    
    // Try to buy first item
    cashOutData.purchaseSuccess = api.buy_shop_item(0) === 1
    
    // Try to heal
    cashOutData.healSuccess = api.buy_heal() === 1
    
    // Try to reroll shop
    cashOutData.rerollSuccess = api.reroll_shop_items() === 1
    
    // Try forge
    cashOutData.forgeSuccess = api.use_forge_option(0) === 1
    
    cashOutData.goldAfter = api.get_gold()
    cashOutData.essenceAfter = api.get_essence()
    
    // Exit cashout
    api.exit_cashout()
    cashOutData.finalPhase = api.get_phase()
    
    return cashOutData
  })

  // Verify CashOut phase was entered
  expect(result.initialPhase).toBe(6)
  
  // Verify shop has items
  expect(result.shopItemCount).toBeGreaterThan(0)
  
  // Verify exit worked
  expect(result.finalPhase).toBe(0) // Back to Explore
  
  console.log('CashOut phase test results:')
  console.log('  Shop items:', result.shopItemCount)
  console.log('  Gold:', result.goldBefore, '->', result.goldAfter)
  console.log('  Essence:', result.essenceBefore, '->', result.essenceAfter)
  console.log('  Purchase success:', result.purchaseSuccess)
  console.log('  Items:', result.items)
})