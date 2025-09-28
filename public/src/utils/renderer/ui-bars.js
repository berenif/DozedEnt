// UI bars and minimap extracted from GameRenderer
// Each function expects `renderer` (the GameRenderer instance) as first argument

export function drawHealthBar(renderer, x, y, width, height, current, max) {
  const ctx = renderer.ctx;
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y, width, height);

  // Health fill
  const healthPercent = current / max;
  const gradient = ctx.createLinearGradient(x, y, x + width * healthPercent, y);
  gradient.addColorStop(0, healthPercent > 0.5 ? '#4caf50' : healthPercent > 0.25 ? '#ff9800' : '#f44336');
  gradient.addColorStop(1, healthPercent > 0.5 ? '#8bc34a' : healthPercent > 0.25 ? '#ffc107' : '#ff5722');

  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width * healthPercent, height);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.floor(current)}/${max}`, x + width / 2, y + height / 2);
}

export function drawStaminaBar(renderer, x, y, width, height, current, max) {
  const ctx = renderer.ctx;
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(x, y, width, height);

  // Stamina fill
  const staminaPercent = current / max;
  ctx.fillStyle = '#2196f3';
  ctx.fillRect(x, y, width * staminaPercent, height);

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

export function drawMiniMap(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  const world = renderer.world;
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x, y, width, height);

  // Map scale
  const scaleX = width / world.width;
  const scaleY = height / world.height;

  // Draw platforms
  ctx.fillStyle = '#4a5568';
  renderer.platforms.forEach(platform => {
    ctx.fillRect(
      x + platform.x * scaleX,
      y + platform.y * scaleY,
      platform.width * scaleX,
      platform.height * scaleY
    );
  });

  // Draw enemies
  ctx.fillStyle = '#ff0000';
  renderer.enemies.forEach(enemy => {
    if (enemy.health > 0) {
      ctx.fillRect(
        x + enemy.x * scaleX - 1,
        y + enemy.y * scaleY - 1,
        3, 3
      );
    }
  });

  // Draw player (convert from WASM normalized coordinates to world coordinates)
  const playerWorldPos = renderer.wasmToWorld(renderer.player.x, renderer.player.y);
  ctx.fillStyle = '#00ff00';
  ctx.fillRect(
    x + playerWorldPos.x * scaleX - 2,
    y + playerWorldPos.y * scaleY - 2,
    4, 4
  );

  // Border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
}

