import { setGlobalSeed as setVisualRngSeed } from '../../utils/rng.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function createFallbackExports(initializer) {
  console.warn('Creating comprehensive fallback WASM exports - significant limitations apply');

  const fallbackState = {
    playerX: 0.5,
    playerY: 0.5,
    stamina: 1.0,
    health: 1.0,
    phase: 0,
    isBlocking: false,
    lastUpdate: performance.now(),
    inputHistory: []
  };

  return {
    start() {
      console.warn('Fallback WASM start called - using mock implementation');
      fallbackState.playerX = 0.5;
      fallbackState.playerY = 0.5;
      fallbackState.stamina = 1.0;
      fallbackState.health = 1.0;
      fallbackState.phase = 0;
    },

    init_run(seed = 1n, weapon = 0) {
      console.warn(`Fallback init_run called - seed=${seed.toString()} weapon=${weapon}`);
      initializer.runSeed = seed;
      try {
        const seedNumber = Number(seed % BigInt(Number.MAX_SAFE_INTEGER));
        if (Number.isFinite(seedNumber)) {
          setVisualRngSeed(seedNumber);
        }
      } catch (error) {
        console.warn('Failed to propagate fallback seed to RNG:', error);
      }
    },

    update(deltaTime) {
      const dt = Math.max(0, Math.min(deltaTime || 0.016, 0.1));
      fallbackState.lastUpdate = performance.now();

      fallbackState.playerX += (Math.random() - 0.5) * 0.01 * dt * 60;
      fallbackState.playerY += (Math.random() - 0.5) * 0.01 * dt * 60;

      fallbackState.playerX = clamp01(fallbackState.playerX);
      fallbackState.playerY = clamp01(fallbackState.playerY);

      fallbackState.stamina = clamp01(fallbackState.stamina + 0.1 * dt);
      fallbackState.health = clamp01(fallbackState.health + 0.05 * dt);

      if (fallbackState.isBlocking) {
        fallbackState.stamina = clamp01(fallbackState.stamina - 0.2 * dt);
      }
    },

    set_player_input(inputX, inputY, roll, jump, lightAttack, heavyAttack, block, special) {
      fallbackState.inputHistory.push({
        timestamp: performance.now(),
        inputX,
        inputY,
        roll,
        jump,
        lightAttack,
        heavyAttack,
        block,
        special
      });

      if (fallbackState.inputHistory.length > 60) {
        fallbackState.inputHistory.shift();
      }

      fallbackState.playerX = clamp01(fallbackState.playerX + inputX * 0.05);
      fallbackState.playerY = clamp01(fallbackState.playerY + inputY * 0.05);
      fallbackState.isBlocking = Boolean(block);

      if (roll) {
        fallbackState.stamina = clamp01(fallbackState.stamina - 0.3);
      }
      if (lightAttack || heavyAttack || special) {
        fallbackState.stamina = clamp01(fallbackState.stamina - 0.1);
      }
    },

    set_blocking(isBlocking, blockX = 0, blockY = 0) {
      fallbackState.isBlocking = Boolean(isBlocking);
      if (fallbackState.isBlocking) {
        console.log('Fallback blocking direction:', blockX, blockY);
      }
    },

    get_block_state() {
      return fallbackState.isBlocking ? 1 : 0;
    },

    get_x() {
      return fallbackState.playerX;
    },

    get_y() {
      return fallbackState.playerY;
    },

    get_stamina() {
      return fallbackState.stamina;
    },

    get_hp() {
      return fallbackState.health;
    },

    get_phase() {
      return fallbackState.phase;
    },

    get_choice_count() {
      return 0;
    },

    get_room_count() {
      return 1;
    },

    get_room_type() {
      return 0;
    },

    get_enemy_count() {
      return 0;
    },

    get_enemy_type() {
      return 0;
    },

    escape_risk() {
      console.warn('Fallback escape_risk called');
    },

    generate_choices() {
      console.warn('Fallback generate_choices called');
    },

    buy_shop_item() {
      console.warn('Fallback buy_shop_item called');
      return 0;
    },

    buy_heal() {
      console.warn('Fallback buy_heal called');
      fallbackState.health = clamp01(fallbackState.health + 0.25);
      return 1;
    },

    reroll_shop_items() {
      console.warn('Fallback reroll_shop_items called');
      return 1;
    },

    memory: {
      buffer: new ArrayBuffer(1024),
      grow: () => 1
    }
  };
}
