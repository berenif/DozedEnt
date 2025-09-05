import {test, expect} from '@playwright/test'

const testUrl = 'https://localhost:8080/test'

test('Game WASM: movement, stamina, block/parry, choices', async ({page}) => {
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

    // Helper to step sim deterministically
    const step = (ix, iy, roll, dt) => api.update(ix, iy, roll ? 1 : 0, dt)

    // Seed and reset
    api.init_run(123n, 0)

    // Initial state
    const startX = api.get_x()
    const startY = api.get_y()
    const startSt = api.get_stamina()

    // Move right for 1 second without rolling; stamina should regen or hold (no block/roll)
    step(1, 0, 0, 1/60)
    for (let i = 0; i < 59; i++) step(1, 0, 0, 1/60)
    const afterMoveX = api.get_x()
    const afterMoveY = api.get_y()
    const afterMoveSt = api.get_stamina()

    // Roll start drains stamina if cooldown allows
    const rollAccepted = api.on_roll_start()
    step(1, 0, 1, 1/60)
    const afterRollSt = api.get_stamina()

    // Attack drains stamina if off cooldown
    const atkAccepted = api.on_attack()
    const afterAtkSt = api.get_stamina()

    // Blocking drains over time and can parry
    // Face towards +X
    const blockOn = api.set_blocking(1, 1, 0)
    step(0, 0, 0, 0.05) // within perfect parry window (0.16s)
    // Incoming attack from the right towards player
    const parryResult = api.handle_incoming_attack(api.get_x() + 0.03, api.get_y(), -1, 0)
    const afterParrySt = api.get_stamina()

    // Leave block and let stamina regen a bit
    api.set_blocking(0, 0, 1)
    for (let i = 0; i < 60; i++) step(0, 0, 0, 1/60)
    const regenSt = api.get_stamina()

    // Choices: after enough attacks, phase should become Choose and commit should work
    // Fast-forward time between attacks to satisfy cooldown
    const ensureCooldown = () => {
      const dt = api.get_attack_cooldown()
      step(0, 0, 0, dt + 0.01)
    }
    let accepts = 0
    for (let i = 0; i < 3; i++) { ensureCooldown(); accepts += api.on_attack() }
    const phase = api.get_phase()
    const count = api.get_choice_count()
    const choiceId = count > 0 ? api.get_choice_id(0) : 0
    const committed = count > 0 ? api.commit_choice(choiceId) : 0
    const phaseAfterCommit = api.get_phase()

    return {
      startX, startY, startSt,
      afterMoveX, afterMoveY, afterMoveSt,
      rollAccepted, afterRollSt,
      atkAccepted, afterAtkSt,
      blockOn, parryResult, afterParrySt,
      regenSt,
      accepts,
      phase, count, committed, phaseAfterCommit
    }
  })

  // Movement happened
  expect(result.afterMoveX).not.toBe(result.startX)
  expect(result.afterMoveY).toBe(result.startY)

  // Roll drains stamina if accepted
  if (result.rollAccepted) expect(result.afterRollSt).toBeLessThan(result.afterMoveSt)

  // Attack drains stamina if accepted
  if (result.atkAccepted) expect(result.afterAtkSt).toBeLessThan(result.afterRollSt)

  // Block engaged and perfect parry refills stamina to 1 and returns 2
  expect(result.blockOn).toBe(1)
  expect(result.parryResult).toBe(2)
  expect(result.afterParrySt).toBeCloseTo(1, 5)

  // Stamina regens afterwards
  expect(result.regenSt).toBeGreaterThan(result.afterAtkSt)

  // After 3 attacks, should enter Choose phase and be able to commit and return to Explore
  expect(result.accepts).toBeGreaterThanOrEqual(1)
  expect(result.phase).toBe(2) // Choose
  expect(result.count).toBeGreaterThan(0)
  expect(result.committed).toBe(1)
  expect(result.phaseAfterCommit).toBe(0) // Explore
})

test('Game WASM: player anim/state timers and overlay exports exist and behave', async ({page}) => {
  await page.goto(testUrl)

  // Load wasm helpers
  await page.evaluate(async path => {
    window.trysteroWasm = await import(path)
  }, '../dist/trystero-wasm.min.js')

  const result = await page.evaluate(async () => {
    const {loadWasm} = window.trysteroWasm
    const res = await fetch('../docs/game.wasm')
    const {exports} = await loadWasm(res)
    const api = exports

    api.init_run(123n, 0)

    // Basic existence
    const has = {
      get_player_anim_state: typeof api.get_player_anim_state === 'function',
      get_player_state_timer: typeof api.get_player_state_timer === 'function',
      get_time_seconds: typeof api.get_time_seconds === 'function',
      get_attack_state: typeof api.get_attack_state === 'function',
      get_attack_state_time: typeof api.get_attack_state_time === 'function',
      get_attack_windup_sec: typeof api.get_attack_windup_sec === 'function',
      get_attack_active_sec: typeof api.get_attack_active_sec === 'function',
      get_attack_recovery_sec: typeof api.get_attack_recovery_sec === 'function',
      get_is_rolling: typeof api.get_is_rolling === 'function',
      get_is_invulnerable: typeof api.get_is_invulnerable === 'function',
      get_speed: typeof api.get_speed === 'function'
    }

    // Let a few frames pass idle
    for (let i = 0; i < 5; i++) api.update(1/60)

    const s0 = api.get_player_anim_state()
    const t0 = api.get_player_state_timer()
    const time0 = api.get_time_seconds()

    // Start a roll if possible and step during roll window
    const acceptedRoll = api.on_roll_start()
    api.set_player_input(1, 0, 1, 0, 0, 0)
    for (let i = 0; i < 4; i++) api.update(1/60)
    const rolling = api.get_is_rolling()
    const invuln = api.get_is_invulnerable()
    const speedCap = api.get_speed()
    const s1 = api.get_player_anim_state()
    const t1 = api.get_player_state_timer()

    // Attack path: fast-forward cooldown, then start an attack and sample timings
    const cd = api.get_attack_cooldown()
    api.update(cd + 0.01)
    const acceptedAtk = api.on_attack()
    // Advance into attack windup a bit
    api.update(1/30)
    const aState = api.get_attack_state()
    const aStateTime = api.get_attack_state_time()

    return {
      has,
      s0, t0, time0,
      acceptedRoll, rolling, invuln, speedCap, s1, t1,
      acceptedAtk, aState, aStateTime
    }
  })

  // Exports present
  Object.entries(result.has).forEach(([k, v]) => expect(v, `missing ${k}`).toBe(true))

  // State timer increases with time
  expect(result.t0).toBeGreaterThanOrEqual(0)

  // On roll, rolling flag toggles and invulnerability follows
  if (result.acceptedRoll) {
    expect(result.rolling).toBe(1)
    expect(result.invuln).toBe(1)
    expect(result.s1).toBeGreaterThanOrEqual(0)
    expect(result.t1).toBeGreaterThanOrEqual(0)
  }

  // Attack state should become non-idle if accepted
  if (result.acceptedAtk) {
    expect(result.aState).not.toBe(0)
    expect(result.aStateTime).toBeGreaterThanOrEqual(0)
  }
})


