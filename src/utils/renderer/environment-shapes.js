// Background/environment shape drawing helpers

export function drawMountain(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x, y - height);
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

export function drawBackgroundTree(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  // Simple triangle tree
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  ctx.lineTo(x - width / 2, y);
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();
}

export function drawSwampTree(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  // Trunk (taller, thinner, darker)
  ctx.fillStyle = '#4a3c28';
  ctx.fillRect(x + width * 0.45, y - height * 0.2, width * 0.1, height * 0.6);

  // Twisted canopy
  ctx.fillStyle = '#3e4e3d'; // Murky green
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y - height * 0.4, width * 0.3, height * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.3, y - height * 0.3, width * 0.25, height * 0.15, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + width * 0.7, y - height * 0.3, width * 0.25, height * 0.15, Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  // Water reflection (simple)
  ctx.fillStyle = 'rgba(42, 42, 30, 0.4)';
  ctx.fillRect(x + width * 0.45, y + height * 0.4, width * 0.1, height * 0.2);
}

export function drawSnowyMountain(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x, y - height);
  ctx.lineTo(x + width / 2, y);
  ctx.closePath();
  ctx.fill();

  // Snowy cap
  ctx.fillStyle = '#e0e8f0'; // Light blue-white
  ctx.beginPath();
  ctx.moveTo(x - width * 0.2, y - height * 0.7);
  ctx.lineTo(x, y - height - 5); // Peak slightly higher
  ctx.lineTo(x + width * 0.2, y - height * 0.7);
  ctx.closePath();
  ctx.fill();
}

export function drawHill(renderer, x, y, width, height) {
  const ctx = renderer.ctx;
  ctx.fillStyle = '#6a8e5a'; // Greenish-brown
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height, 0, 0, Math.PI * 2);
  ctx.fill();

  // Grass texture (simple)
  ctx.fillStyle = '#7aa36a'; // Lighter green
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(x - width / 2 + Math.random() * width, y - height / 2 + Math.random() * height / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

