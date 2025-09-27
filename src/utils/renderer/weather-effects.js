// Weather effects extracted from GameRenderer
// Each function expects `renderer` (the GameRenderer instance) as first argument

export function drawRainEffect(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.strokeStyle = `rgba(200, 200, 255, ${0.5 * intensity})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 50 * intensity; i++) {
    const x = Math.random() * canvas.width + camera.x - canvas.width / 2;
    const y = Math.random() * canvas.height + camera.y - canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + 10);
    ctx.stroke();
  }
}

export function drawSnowEffect(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * intensity})`;
  for (let i = 0; i < 30 * intensity; i++) {
    const x = Math.random() * canvas.width + camera.x - canvas.width / 2;
    const y = Math.random() * canvas.height + camera.y - canvas.height / 2;
    const size = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFogEffect(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.fillStyle = `rgba(200, 200, 200, ${0.3 * intensity})`;
  ctx.fillRect(
    camera.x - canvas.width / 2,
    camera.y - canvas.height / 2,
    canvas.width,
    canvas.height
  );
}

export function drawWindEffect(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  // Subtle lines or particles moving across the screen
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 * intensity})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 20 * intensity; i++) {
    const x = (Math.random() * canvas.width + camera.x - canvas.width / 2 + (Date.now() / 100 * 5 * intensity)) % (canvas.width + 200) - 100; // Drifting effect
    const y = Math.random() * canvas.height + camera.y - canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 * intensity, y);
    ctx.stroke();
  }
}

export function drawFallingLeaves(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.fillStyle = `rgba(139, 69, 19, ${0.4 * intensity})`; // Brownish leaves
  for (let i = 0; i < 20 * intensity; i++) {
    const x = (Math.random() * canvas.width + camera.x - canvas.width / 2 + (Date.now() / 1000 * 20 * intensity)) % (canvas.width + 50) - 25;
    const y = (Math.random() * canvas.height + camera.y - canvas.height / 2 + (Date.now() / 1000 * 10 * intensity)) % (canvas.height + 50) - 25;
    const size = Math.random() * 4 + 2;
    ctx.beginPath();
    ctx.ellipse(x, y, size / 2, size, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGlowingSpores(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.fillStyle = `rgba(100, 255, 100, ${0.5 * intensity})`; // Greenish glow
  ctx.shadowColor = `rgba(100, 255, 100, ${0.8 * intensity})`;
  ctx.shadowBlur = 10;
  for (let i = 0; i < 15 * intensity; i++) {
    const x = (Math.random() * canvas.width + camera.x - canvas.width / 2 + (Date.now() / 1000 * 10 * intensity)) % (canvas.width + 50) - 25;
    const y = (Math.random() * canvas.height + camera.y - canvas.height / 2 + (Date.now() / 1000 * 5 * intensity)) % (canvas.height + 50) - 25;
    const size = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0; // Reset shadow
}

export function drawShimmeringCold(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.strokeStyle = `rgba(200, 220, 255, ${0.3 * intensity})`;
  ctx.lineWidth = 1;
  for (let i = 0; i < 10 * intensity; i++) {
    const x = Math.random() * canvas.width + camera.x - canvas.width / 2;
    const y = Math.random() * canvas.height + camera.y - canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.sin(Date.now() / 200 + i) * 10, y + Math.cos(Date.now() / 200 + i) * 10);
    ctx.stroke();
  }
}

export function drawFloatingDust(renderer, intensity) {
  const ctx = renderer.ctx;
  const canvas = renderer.canvas;
  const camera = renderer.camera;
  ctx.fillStyle = `rgba(220, 180, 140, ${0.2 * intensity})`; // Dusty brownish color
  for (let i = 0; i < 30 * intensity; i++) {
    const x = (Math.random() * canvas.width + camera.x - canvas.width / 2 - (Date.now() / 1000 * 15 * intensity)) % (canvas.width + 50) - 25;
    const y = Math.random() * canvas.height + camera.y - canvas.height / 2;
    const size = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

