let ctx = null;
let canvas = null;
let width = 0;
let height = 0;
let deviceRatio = 1;

const scratchVec = { x: 0, y: 0 };

const worldBounds = {
  minX: -5,
  maxX: 5,
  minY: 0,
  maxY: 5
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const wasmToCanvas = (x, y) => {
  const nx = (x - worldBounds.minX) / (worldBounds.maxX - worldBounds.minX);
  const ny = (y - worldBounds.minY) / (worldBounds.maxY - worldBounds.minY);
  scratchVec.x = nx * width;
  scratchVec.y = height - (ny * height);
  return scratchVec;
};

const ensureContext = () => {
  if (!ctx) {
    throw new Error('Renderer not initialised');
  }
};

const resize = () => {
  if (!canvas) return;
  deviceRatio = window.devicePixelRatio || 1;
  const displayWidth = Math.floor(canvas.clientWidth * deviceRatio);
  const displayHeight = Math.floor(canvas.clientHeight * deviceRatio);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }

  width = canvas.width;
  height = canvas.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
};

const drawGrid = () => {
  ensureContext();
  ctx.save();
  ctx.strokeStyle = 'rgba(86, 97, 138, 0.15)';
  ctx.lineWidth = 1;
  const spacing = Math.max(32, Math.min(width, height) / 20);
  for (let x = 0; x <= width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
};

const drawBackground = () => {
  ensureContext();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#020510');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  drawGrid();
};

const drawPlayer = (state) => {
  ensureContext();
  const position = wasmToCanvas(state.x, state.y);
  const baseRadius = Math.max(12, Math.min(width, height) * 0.03);

  ctx.save();
  ctx.translate(position.x, position.y);

  const rolling = !!state.rolling;
  const attacking = state.anim === 'attacking';
  const blocking = state.block;

  ctx.shadowColor = attacking ? 'rgba(255, 120, 90, 0.55)' : 'rgba(80, 140, 255, 0.4)';
  ctx.shadowBlur = rolling ? 28 : 18;

  const bodyRadius = baseRadius * (blocking ? 1.15 : 1);
  ctx.fillStyle = blocking ? '#5eead4' : attacking ? '#f97316' : '#93c5fd';
  ctx.beginPath();
  ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator using velocity
  const speed = Math.hypot(state.vx, state.vy);
  if (speed > 0.01) {
    const dirX = clamp(state.vx / Math.max(speed, 0.001), -1, 1);
    const dirY = clamp(state.vy / Math.max(speed, 0.001), -1, 1);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dirX * baseRadius * 1.8, -dirY * baseRadius * 1.8);
    ctx.stroke();
  }

  if (rolling) {
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (blocking) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(0, 0, bodyRadius + 10, Math.PI * -0.25, Math.PI * 0.25);
    ctx.stroke();
  }

  ctx.restore();
};

const drawObstacles = (obstacles) => {
  ensureContext();
  if (!Array.isArray(obstacles) || obstacles.length === 0) return;
  ctx.save();
  ctx.lineWidth = 2;
  for (const obstacle of obstacles) {
    const pos = wasmToCanvas(obstacle.x, obstacle.y);
    const radius = Math.max(6, obstacle.r * Math.min(width, height) * 0.05);
    const stroke = obstacle.type === "landmark" ? "rgba(190, 242, 100, 0.45)" : "rgba(148, 163, 184, 0.35)";
    const fill = obstacle.type === "landmark" ? "rgba(190, 242, 100, 0.18)" : "rgba(148, 163, 184, 0.12)";
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
};

const drawOverlays = (state, overlayInfo) => {
  ensureContext();
  const staminaWidth = Math.max(width * 0.18, 160);
  const staminaHeight = 10;
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(20, height - 40, staminaWidth, staminaHeight);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(20, height - 40, staminaWidth * clamp(state.stamina, 0, 1), staminaHeight);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(20, height - 24, staminaWidth, staminaHeight);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(20, height - 24, staminaWidth * clamp(state.hp, 0, 1), staminaHeight);

  if (overlayInfo && overlayInfo.debug) {
    const lines = overlayInfo.lines || [];
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    const boxWidth = 220;
    const boxHeight = 18 * lines.length + 12;
    ctx.fillRect(16, 16, boxWidth, boxHeight);
    ctx.fillStyle = '#e2e8f0';
    lines.forEach((line, index) => {
      ctx.fillText(line, 24, 24 + index * 16);
    });
  }
  ctx.restore();
};

export const createRenderer = (targetCanvas) => {
  canvas = targetCanvas;
  ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) {
    throw new Error('Unable to acquire 2D context');
  }

  const style = getComputedStyle(canvas);
  if (style.position === 'static') {
    canvas.style.position = 'relative';
  }

  const onResize = () => resize();
  resize();
  window.addEventListener('resize', onResize);

  return {
    resize,
    clear: drawBackground,
    drawBackground,
    drawPlayer,
    drawObstacles,
    drawOverlays,
    wasmToCanvas,
    dispose: () => window.removeEventListener('resize', onResize)
  };
};



