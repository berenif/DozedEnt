// Environment objects (foreground)

export function drawTree(renderer, x, y, width, height, detailed = true) {
  const ctx = renderer.ctx;
  if (detailed) {
    // Trunk
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + width * 0.35, y, width * 0.3, height * 0.4);

    // Leaves (detailed)
    ctx.fillStyle = '#228b22';
    ctx.beginPath();
    ctx.arc(x + width / 2, y - height * 0.3, width * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width * 0.3, y - height * 0.2, width * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + width * 0.7, y - height * 0.2, width * 0.35, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Simplified distant rendering
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + width * 0.4, y, width * 0.2, height * 0.4);
    ctx.fillStyle = '#228b22';
    ctx.fillRect(x, y - height * 0.4, width, height * 0.6);
  }
}

export function drawRock(renderer, x, y, width, height, detailed = true) {
  const ctx = renderer.ctx;
  ctx.fillStyle = '#696969';
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (detailed) {
    // Highlight
    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.ellipse(x + width * 0.4, y + height * 0.3, width * 0.2, height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBush(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  ctx.fillStyle = '#3cb371';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(
      x + (i + 0.5) * (width / 3),
      y + height / 2,
      height * 0.6,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

export function drawCrate(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  // Crate body
  ctx.fillStyle = '#8b6914';
  ctx.fillRect(x, y, width, height);

  // Wood grain
  ctx.strokeStyle = '#654321';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + height * 0.3);
  ctx.lineTo(x + width, y + height * 0.3);
  ctx.moveTo(x, y + height * 0.7);
  ctx.lineTo(x + width, y + height * 0.7);
  ctx.stroke();

  // Border
  ctx.strokeStyle = '#4a3c28';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
}

export function drawBarrel(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  // Barrel body
  ctx.fillStyle = '#8b6914';
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Metal bands
  ctx.strokeStyle = '#4a4a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height * 0.3, width / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + width / 2, y + height * 0.7, width / 2, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawSwampTreeForeground(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  // Trunk
  ctx.fillStyle = '#4a3c28';
  ctx.fillRect(x + width * 0.45, y - height * 0.2, width * 0.1, height * 0.6);

  // Twisted canopy
  ctx.fillStyle = '#3e4e3d';
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y - height * 0.4, width * 0.3, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.3, y - height * 0.3, width * 0.25, height * 0.15, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.7, y - height * 0.3, width * 0.25, height * 0.15, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLilyPad(renderer, x, y, size) {
  const ctx = renderer.ctx;
  ctx.fillStyle = '#689F38';
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.fill();
  // Cutout for realism
  ctx.fillStyle = '#5D4037'; // Swamp water color
  ctx.beginPath();
  ctx.moveTo(x + size * 0.4, y);
  ctx.lineTo(x + size * 0.2, y + size * 0.2);
  ctx.lineTo(x, y + size * 0.2);
  ctx.fill();
}

export function drawSnowPatch(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  ctx.fillStyle = '#E0E0E0';
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawGrassTuft(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  ctx.fillStyle = '#A2D27E';
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.quadraticCurveTo(x + width / 2, y - height, x + width, y + height);
  ctx.fill();
}

