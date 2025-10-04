export function registerDebugHelpers({ wasmApi, inputManagerRef }) {
  window.resetAttacks = () => {
    const inputManager = inputManagerRef();
    if (!inputManager) {
      console.warn('Input manager not initialized yet');
      return;
    }

    inputManager.inputState.lightAttack = false;
    inputManager.inputState.heavyAttack = false;
    inputManager.inputState.special = false;
    inputManager.inputState.block = false;

    const state = wasmApi.getPlayerState();
    console.log('Attack states cleared. Animation now:', state.anim);
  };

  window.clearAttacks = () => {
    console.log('Manually clearing attack states...');

    for (let i = 0; i < 10; i += 1) {
      wasmApi.setPlayerInput(0, 0, 0, 0, 0, 0, 0, 0);
      wasmApi.update(1 / 60);
    }

    const inputManager = inputManagerRef();
    if (inputManager && inputManager.inputState) {
      inputManager.inputState.lightAttack = false;
      inputManager.inputState.heavyAttack = false;
      inputManager.inputState.special = false;
      inputManager.inputState.block = false;
    }

    const state = wasmApi.getPlayerState();
    console.log('Attack states cleared. Animation now:', state.anim);
  };

  window.checkMovement = () => {
    const inputManager = inputManagerRef();
    if (!inputManager) {
      console.warn('Input manager not initialized yet');
      return;
    }

    const state = wasmApi.getPlayerState();
    console.log('Movement Debug:');
    console.log('  Position:', state.x.toFixed(3), state.y.toFixed(3));
    console.log('  Velocity:', state.vx.toFixed(3), state.vy.toFixed(3));
    console.log('  Animation:', state.anim);
    console.log('  Stamina:', (state.stamina * 100).toFixed(0) + '%');
    console.log('  Block:', state.block ? 'YES (blocks movement!)' : 'no');
    console.log('  Rolling:', state.rolling ? 'YES' : 'no');

    const input = inputManager.inputState;
    console.log('  Input Dir:', input.direction.x.toFixed(2), input.direction.y.toFixed(2));
    console.log('  Attacks:', input.lightAttack ? 'LIGHT' : '', input.heavyAttack ? 'HEAVY' : '', input.special ? 'SPECIAL' : '');

    if (state.block) console.warn('BLOCK is active - this prevents movement!');
    if (state.anim === 'attacking') console.warn('Attack animation may slow movement');
    if (state.stamina < 0.1) console.warn('Low stamina may affect movement');
  };
}

export function createOverlayBuilder({ wasmApi, config }) {
  let memorySampleTimer = 0;
  let memoryInfo = 'n/a';
  const overlayLines = [];

  return (state, now, fpsValue, fpsCap) => {
    if (!config.debug) {
      return null;
    }

    if (now - memorySampleTimer > 5000) {
      memorySampleTimer = now;
      const perfMemory = performance?.memory;
      if (perfMemory && perfMemory.usedJSHeapSize) {
        const usedMb = perfMemory.usedJSHeapSize / (1024 * 1024);
        memoryInfo = `${usedMb.toFixed(1)} MB`;
      }
    }

    overlayLines.length = 0;
    overlayLines.push(`fps: ${fpsValue.toFixed(1)}`);
    overlayLines.push(`pos: ${state.x.toFixed(2)}, ${state.y.toFixed(2)}`);
    overlayLines.push(`vel: ${state.vx.toFixed(2)}, ${state.vy.toFixed(2)}`);
    overlayLines.push(`anim: ${state.anim} (${state.animT.toFixed(2)}s)`);
    overlayLines.push(`roll: ${state.rolling ? 'on' : 'off'} block: ${state.block ? 'on' : 'off'}`);
    overlayLines.push(`stam: ${(state.stamina * 100).toFixed(0)}% hp: ${(state.hp * 100).toFixed(0)}%`);
    overlayLines.push(`loader: ${wasmApi.loaderInfo.mode} fallback: ${wasmApi.isFallback ? 'yes' : 'no'}`);
    if (fpsCap) {
      overlayLines.push(`fps cap: ${fpsCap}`);
    }
    overlayLines.push(`heap: ${memoryInfo}`);

    return { debug: true, lines: [...overlayLines] };
  };
}
