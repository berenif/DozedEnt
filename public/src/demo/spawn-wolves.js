export function spawnWolvesIfAvailable(wasmApi, count = 5) {
  try {
    const exports = wasmApi?.exports;
    if (!exports) {return;}

    if (typeof exports.spawn_wolves === 'function') {
      exports.spawn_wolves(count);
      console.log(`[Demo] Spawned ${count} wolves via spawn_wolves()`);
    } else if (typeof exports.spawn_wolf === 'function') {
      const px = exports.get_x?.() ?? 0.5;
      const py = exports.get_y?.() ?? 0.5;
      const dist = 0.15;
      for (let i = 0; i < count; i += 1) {
        const angle = (i / Math.max(1, count)) * Math.PI * 2;
        const x = px + Math.cos(angle) * dist;
        const y = py + Math.sin(angle) * dist;
        exports.spawn_wolf(x, y, i % 4);
      }
      console.log(`[Demo] Spawned ${count} wolves via spawn_wolf()`);
    }
  } catch (error) {
    console.warn('Failed to spawn wolves:', error);
  }
}
