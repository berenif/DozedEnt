// Platforms, decorations, and wasm world markers

export function renderPlatforms(renderer) {
  // Clear existing platforms for biome-specific generation
  renderer.platforms = [];

  // WASM circular obstacles
  if (window.wasmExports && typeof window.wasmExports.get_obstacle_count === 'function') {
    const obstacleCount = window.wasmExports.get_obstacle_count();
    const safeObstacleCount = Number.isInteger(obstacleCount) && obstacleCount >= 0 ? Math.min(obstacleCount, 1000) : 0;

    for (let i = 0; i < safeObstacleCount; i++) {
      if (
        typeof window.wasmExports.get_obstacle_x === 'function' &&
        typeof window.wasmExports.get_obstacle_y === 'function' &&
        typeof window.wasmExports.get_obstacle_r === 'function'
      ) {
        try {
          const wasmX = window.wasmExports.get_obstacle_x(i);
          const wasmY = window.wasmExports.get_obstacle_y(i);
          const wasmR = window.wasmExports.get_obstacle_r(i);
          const worldPos = renderer.wasmToWorld(wasmX, wasmY);
          const worldRadius = wasmR * (renderer.world.width / 3);
          renderer.platforms.push({
            x: worldPos.x - worldRadius,
            y: worldPos.y - worldRadius,
            width: worldRadius * 2,
            height: worldRadius * 2,
            type: 'wasm_obstacle',
            color: '#666666',
            isCircular: true,
            centerX: worldPos.x,
            centerY: worldPos.y,
            radius: worldRadius,
          });
        } catch (e) {
          console.error(`Error reading obstacle ${i}:`, e);
        }
      }
    }
  }

  const ctx = renderer.ctx;
  // Render platforms (rectangular or circular)
  renderer.platforms.forEach((platform) => {
    if (platform.isCircular) {
      ctx.fillStyle = platform.color || '#666666';
      ctx.beginPath();
      ctx.arc(platform.centerX, platform.centerY, platform.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = platform.color || '#3e4444';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
  });
}

export function renderDecorations(renderer) {
  const ctx = renderer.ctx;
  renderer.decorations.forEach((decor) => {
    const lodInfo = renderer.lodSystem.getLODInfo(decor, renderer.camera, renderer.world);
    if (!lodInfo.shouldRender) {
      return;
    }
    const isDetailed = lodInfo.renderDetail > 0.7;

    switch (decor.type) {
      case 'tree':
        renderer.drawTree(decor.x, decor.y, decor.width, decor.height, isDetailed);
        break;
      case 'rock':
        renderer.drawRock(decor.x, decor.y, decor.width, decor.height, isDetailed);
        break;
      case 'bush':
        renderer.drawBush(decor.x, decor.y, decor.width, decor.height);
        break;
      case 'swamp_tree':
        renderer.drawSwampTreeForeground(decor.x, decor.y, decor.width, decor.height);
        break;
      case 'lilypad':
        renderer.drawLilyPad(decor.x, decor.y, decor.width);
        break;
      case 'snow_patch':
        renderer.drawSnowPatch(decor.x, decor.y, decor.width, decor.height);
        break;
      case 'grass_tuft':
        renderer.drawGrassTuft(decor.x, decor.y, decor.width, decor.height);
        break;
      case 'crate':
        renderer.drawCrate(decor.x, decor.y, decor.width, decor.height);
        break;
      case 'barrel':
        renderer.drawBarrel(decor.x, decor.y, decor.width, decor.height);
        break;
      default:
        // Unknown decorative type; fallback
        ctx.fillStyle = '#777';
        ctx.fillRect(decor.x, decor.y, decor.width, decor.height);
        break;
    }
  });
}

export function renderWasmLandmarks(renderer) {
  if (!window.wasmExports || typeof window.wasmExports.get_landmark_count !== 'function') {
    return;
  }
  try {
    const count = window.wasmExports.get_landmark_count();
    const safeCount = Number.isInteger(count) && count >= 0 ? Math.min(count, 1000) : 0;
    for (let i = 0; i < safeCount; i++) {
      try {
        const wasmX = window.wasmExports.get_landmark_x(i);
        const wasmY = window.wasmExports.get_landmark_y(i);
        const worldPos = renderer.wasmToWorld(wasmX, wasmY);
        renderer.drawLandmark(worldPos.x, worldPos.y, i);
      } catch (landmarkError) {
        console.error(`Error rendering landmark at index ${i}:`, landmarkError);
      }
    }
  } catch (error) {
    console.error('Error rendering WASM landmarks:', error);
  }
}

export function renderWasmExits(renderer) {
  if (!window.wasmExports || typeof window.wasmExports.get_exit_count !== 'function') {
    return;
  }
  try {
    const count = window.wasmExports.get_exit_count();
    const safeCount = Number.isInteger(count) && count >= 0 ? Math.min(count, 1000) : 0;
    for (let i = 0; i < safeCount; i++) {
      try {
        const wasmX = window.wasmExports.get_exit_x(i);
        const wasmY = window.wasmExports.get_exit_y(i);
        const worldPos = renderer.wasmToWorld(wasmX, wasmY);
        renderer.drawExit(worldPos.x, worldPos.y, i);
      } catch (exitError) {
        console.error(`Error rendering exit at index ${i}:`, exitError);
      }
    }
  } catch (error) {
    console.error('Error rendering WASM exits:', error);
  }
}
