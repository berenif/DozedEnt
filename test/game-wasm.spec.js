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


