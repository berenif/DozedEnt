// Collectible item drawings

export function drawCoin(renderer, x, y, size) {
  const ctx = renderer.ctx;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner circle
  ctx.strokeStyle = '#ffed4e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawGem(renderer, x, y, size) {
  const ctx = renderer.ctx;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y);
  ctx.lineTo(x + size, y + size / 3);
  ctx.lineTo(x + size * 0.8, y + size);
  ctx.lineTo(x + size * 0.2, y + size);
  ctx.lineTo(x, y + size / 3);
  ctx.closePath();
  ctx.fill();
}

export function drawPowerup(renderer, x, y, size) {
  const ctx = renderer.ctx;
  // Star shape for powerups
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const outerX = x + size / 2 + Math.cos(angle) * size / 2;
    const outerY = y + size / 2 + Math.sin(angle) * size / 2;

    if (i === 0) {
      ctx.moveTo(outerX, outerY);
    } else {
      ctx.lineTo(outerX, outerY);
    }

    const innerAngle = angle + Math.PI / 5;
    const innerX = x + size / 2 + Math.cos(innerAngle) * size / 4;
    const innerY = y + size / 2 + Math.sin(innerAngle) * size / 4;
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawHealthPickup(renderer, x, y, size) {
  const ctx = renderer.ctx;
  // Heart shape
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + size * 0.3);
  ctx.bezierCurveTo(
    x + size / 2, y,
    x, y,
    x, y + size * 0.3
  );
  ctx.bezierCurveTo(
    x, y + size * 0.6,
    x + size / 2, y + size,
    x + size / 2, y + size
  );
  ctx.bezierCurveTo(
    x + size / 2, y + size,
    x + size, y + size * 0.6,
    x + size, y + size * 0.3
  );
  ctx.bezierCurveTo(
    x + size, y,
    x + size, y,
    x + size / 2, y + size * 0.3
  );
  ctx.fill();
}

