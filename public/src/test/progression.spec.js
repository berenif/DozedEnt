// Lightweight tests for progression manager and store
import { ProgressionManager } from '../game/progression/progression-manager.js';

const fakeModule = {
  exports: {
    malloc: () => 1024,
    free: () => {},
    upgrade_create_system: () => 1,
    upgrade_set_tree: () => {},
    upgrade_set_state: () => {},
    upgrade_get_state: () => 0,
    upgrade_get_essence: () => 0,
    upgrade_can_purchase: () => 0,
    upgrade_add_essence: () => {},
    upgrade_purchase: () => 0,
    upgrade_reset_class: () => {},
    upgrade_get_effect_scalar: () => 0
  },
  memory: new WebAssembly.Memory({ initial: 1 })
};

async function createPm() {
  const pm = new ProgressionManager(Promise.resolve(fakeModule), '/src');
  pm.trees.set('warden', { classId: 'warden', version: 1, nodes: [] });
  pm.trees.set('raider', { classId: 'raider', version: 1, nodes: [] });
  pm.trees.set('kensei', { classId: 'kensei', version: 1, nodes: [] });
  pm.bridge = { // stub bridge
    setTree: () => {},
    setState: () => {},
    getState: () => ({ essence: 0, nodes: {} }),
    addEssence: () => {},
    purchase: () => 0,
    getEffectScalar: () => 0
  };
  return pm;
}

export async function test_progression_basic() {
  const pm = await createPm();
  const state = pm.loadClassState('warden');
  if (!state || typeof state.essence !== 'number') {
    throw new Error('state missing');
  }
}


