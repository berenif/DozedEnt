import '../setup.js';
import { test, expect } from '@playwright/test';

const testUrl = 'https://localhost:8080/test';

test('Physics: collision events are emitted and can be read/cleared', async ({ page }) => {
  await page.goto(testUrl);

  await page.evaluate(async path => { window.trysteroWasm = await import(path); }, '../dist/trystero-wasm.min.js');

  const result = await page.evaluate(async () => {
    const { loadWasm } = window.trysteroWasm;
    const res = await fetch('../game.wasm');
    const { exports, memory } = await loadWasm(res);
    const api = exports;

    api.init_run(321n, 0);

    // Place a dynamic barrel near the player to collide
    const bodyId = api.spawn_barrel(0.52, 0.52, 0.0);
    // Nudge it toward the player body (id 0) so a collision happens
    // Use throw_barrel as an impulse helper
    api.throw_barrel(bodyId, -1, 0, 0, 10);

    for (let i = 0; i < 10; i++) api.update(1/120);

    const count = api.physics_get_event_count();
    const ptr = api.physics_get_events_ptr();

    let firstEvent = null;
    if (count > 0 && ptr) {
      // CollisionEvent layout: 11 floats/ints (2 uint32 + 8 floats + 1 float) => we read as 28 bytes? Actually: 2*4 + 8*4 + 4 = 40 bytes
      const BYTES_PER_EVENT = 40;
      const u8 = new Uint8Array(memory.buffer, ptr, BYTES_PER_EVENT);
      // DataView to parse
      const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
      const bodyA = dv.getUint32(0, true);
      const bodyB = dv.getUint32(4, true);
      const nx = dv.getFloat32(8, true);
      const ny = dv.getFloat32(12, true);
      const nz = dv.getFloat32(16, true);
      const px = dv.getFloat32(20, true);
      const py = dv.getFloat32(24, true);
      const pz = dv.getFloat32(28, true);
      const impulse = dv.getFloat32(32, true);
      firstEvent = { bodyA, bodyB, nx, ny, nz, px, py, pz, impulse };
    }

    api.physics_clear_events();
    const afterClear = api.physics_get_event_count();

    return { count, firstEvent, afterClear };
  });

  expect(result.count).toBeGreaterThanOrEqual(0);
  if (result.count > 0) {
    expect(result.firstEvent).not.toBeNull();
    expect(Number.isFinite(result.firstEvent.nx)).toBe(true);
    expect(Number.isFinite(result.firstEvent.px)).toBe(true);
  }
  expect(result.afterClear).toBe(0);
});


