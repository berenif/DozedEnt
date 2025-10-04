export function createInputApplier({ wasmApi, inputManagerRef, clamp }) {
  let stuckAttackWarned = false;
  let firstFrameCleared = false;

  return () => {
    const inputManager = inputManagerRef();
    if (!inputManager || !inputManager.inputState) {
      console.warn('applyInput called before inputManager initialized');
      return;
    }

    if (!firstFrameCleared) {
      wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
      firstFrameCleared = true;
      console.log('[Demo] First frame input cleared');
      return;
    }

    const flagsSnapshot = (window.DZ && typeof window.DZ.flags === 'function') ? window.DZ.flags() : null;
    const override = flagsSnapshot && typeof flagsSnapshot.inputOverride === 'object' ? flagsSnapshot.inputOverride : null;
    const input = override || inputManager.inputState;
    const dirX = clamp(input.direction?.x ?? 0, -1, 1);
    const dirY = clamp(input.direction?.y ?? 0, -1, 1);

    if (!Number.isFinite(dirX) || !Number.isFinite(dirY)) {
      console.error('Invalid input in applyInput:', { dirX, dirY, input });
    }

    if (!override) {
      const hasAttackInput = inputManager.inputState.lightAttack || inputManager.inputState.heavyAttack;
      const hasPointerDown = inputManager.inputState.pointer?.down;

      if (hasAttackInput && !hasPointerDown) {
        if (!stuckAttackWarned) {
          console.warn('Detected stuck attack state, clearing...');
          stuckAttackWarned = true;
        }
        inputManager.inputState.lightAttack = false;
        inputManager.inputState.heavyAttack = false;
      } else if (!hasAttackInput) {
        stuckAttackWarned = false;
      }

      if (inputManager.inputState.block && !hasPointerDown) {
        inputManager.inputState.block = false;
      }

      const state = wasmApi.getPlayerState();
      if (state.anim === 'attacking' && !inputManager.inputState.lightAttack && !inputManager.inputState.heavyAttack && !inputManager.inputState.special) {
        wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
      }
    }

    if (dirX !== 0 || dirY !== 0) {
      inputManager.inputState.lastMovementDirection.x = dirX;
      inputManager.inputState.lastMovementDirection.y = dirY;
    }

    const block = (input.block === true || input.block === 1) ? 1 : 0;

    wasmApi.setPlayerInput(
      dirX,
      dirY,
      input.roll ? 1 : 0,
      input.jump ? 1 : 0,
      input.lightAttack ? 1 : 0,
      input.heavyAttack ? 1 : 0,
      block,
      input.special ? 1 : 0
    );

    if (wasmApi.exports?.set_blocking) {
      const lastDir = inputManager.inputState.lastMovementDirection;
      wasmApi.exports.set_blocking(
        block,
        lastDir.x || 1,
        lastDir.y || 0
      );
    }

    if (override && !window.__DZ_OVERRIDE_LOGGED__) {
      window.__DZ_OVERRIDE_LOGGED__ = true;
      console.info('[Demo] Using inputOverride from feature flags:', { dirX, dirY, ...override });
    } else if (!override && window.__DZ_OVERRIDE_LOGGED__) {
      window.__DZ_OVERRIDE_LOGGED__ = false;
    }
  };
}
