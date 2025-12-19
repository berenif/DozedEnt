import { CharacterAnimator } from '../animation/system/animation-system.js';
import { PlayerRenderer } from '../renderer/PlayerRenderer.js';
import { PLAYER_ANIM_CODES } from './wasm-api.js';
import { WolfRenderer } from '../renderer/WolfRenderer.js';

let ctx = null;
let canvas = null;
let width = 0;
let height = 0;
let deviceRatio = 1;

const scratchVec = { x: 0, y: 0 };

const worldBounds = {
  minX: 0,
  maxX: 1,
  minY: 0,
  maxY: 1
};

// Camera state for smooth following
const camera = {
  x: 0.5,  // Camera center in world coordinates (0-1)
  y: 0.5,
  targetX: 0.5,
  targetY: 0.5,
  smoothing: 0.1,  // Camera smoothing factor (lower = smoother but slower)
  zoom: 0.5  // View size in world units (0.5 = half the world visible)
};

// Procedural-only: no sprite sheet used

const playerAnimator = new CharacterAnimator();
let playerRenderer = null;

const IDLE_STATE = PLAYER_ANIM_CODES.idle ?? 0;
let activeAnimState = IDLE_STATE;
let lastFacing = 'right';
let lastAnimatorTime = typeof performance !== 'undefined' ? performance.now() : 0;
playerAnimator.setAnimState(IDLE_STATE);
playerAnimator.setFacing(lastFacing);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Update camera to follow target position smoothly
const updateCamera = (targetX, targetY, deltaTime) => {
  // Set target position
  camera.targetX = clamp(targetX, worldBounds.minX, worldBounds.maxX);
  camera.targetY = clamp(targetY, worldBounds.minY, worldBounds.maxY);
  
  // Smooth interpolation (exponential smoothing)
  const smoothing = 1 - (1 - camera.smoothing)**(deltaTime * 60);
  camera.x += (camera.targetX - camera.x) * smoothing;
  camera.y += (camera.targetY - camera.y) * smoothing;
  
  // Snap if very close
  if (Math.abs(camera.x - camera.targetX) < 0.001) {
    camera.x = camera.targetX;
  }
  if (Math.abs(camera.y - camera.targetY) < 0.001) {
    camera.y = camera.targetY;
  }
};

const wasmToCanvas = (x, y) => {
  // Calculate visible world bounds based on camera position and zoom
  const halfZoom = camera.zoom / 2;
  const visibleMinX = camera.x - halfZoom;
  const visibleMaxX = camera.x + halfZoom;
  const visibleMinY = camera.y - halfZoom;
  const visibleMaxY = camera.y + halfZoom;
  
  // Convert world position to normalized coordinates relative to camera view
  const nx = (x - visibleMinX) / (visibleMaxX - visibleMinX);
  const ny = (y - visibleMinY) / (visibleMaxY - visibleMinY);
  
  // Convert to canvas coordinates
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
  if (!canvas) {return;}
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

const drawFallbackPlayer = (state, position, baseRadius) => {
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

// Procedural player rendering using CharacterAnimator's transform data
const drawProceduralPlayer = (state, position, baseRadius, transform) => {
  ensureContext();

  // Trails (motion streaks)
  const trails = Array.isArray(transform.trails) ? transform.trails : [];
  if (trails.length > 0) {
    ctx.save();
    for (const trail of trails) {
      const tpos = wasmToCanvas(trail.x, trail.y);
      const alpha = typeof trail.alpha === 'number' ? clamp(trail.alpha, 0, 1) : 0.35;
      const scale = typeof trail.scale === 'number' ? trail.scale : 0.9;
      const r = baseRadius * 0.9 * scale;
      ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tpos.x, tpos.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }


  // Main body
  const renderSize = Math.max(64, Math.min(width, height) * 0.14);
  const attacking = state.anim === 'attacking';
  const blocking = !!state.block;
  const rolling = !!state.rolling;

  ctx.save();
  ctx.translate(position.x + (transform.offsetX ?? 0), position.y + (transform.offsetY ?? 0));
  if (transform.rotation) {
    ctx.rotate(transform.rotation);
  }
  ctx.scale(transform.scaleX ?? 1, transform.scaleY ?? 1);

  ctx.shadowColor = attacking ? 'rgba(255, 120, 90, 0.55)' : 'rgba(80, 140, 255, 0.4)';
  ctx.shadowBlur = rolling ? 28 : 18;

  const bodyRadius = baseRadius * (blocking ? 1.15 : 1);
  const grad = ctx.createRadialGradient(0, 0, bodyRadius * 0.3, 0, 0, bodyRadius);
  if (blocking) {
    grad.addColorStop(0, '#99f6e4');
    grad.addColorStop(1, '#14b8a6');
  } else if (attacking) {
    grad.addColorStop(0, '#fdba74');
    grad.addColorStop(1, '#f97316');
  } else {
    grad.addColorStop(0, '#bfdbfe');
    grad.addColorStop(1, '#60a5fa');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, bodyRadius, 0, Math.PI * 2);
  ctx.fill();

  // Direction indicator based on velocity
  const speed = Math.hypot(state.vx ?? 0, state.vy ?? 0);
  if (speed > 0.01) {
    const dirX = clamp((state.vx ?? 0) / Math.max(speed, 0.001), -1, 1);
    const dirY = clamp((state.vy ?? 0) / Math.max(speed, 0.001), -1, 1);
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(dirX * bodyRadius * 1.8, -dirY * bodyRadius * 1.8);
    ctx.stroke();
  }

  ctx.restore();

  // Shield overlay when blocking
  if (blocking) {
    ctx.save();
    ctx.translate(position.x, position.y - renderSize * 0.45);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, renderSize * 0.55, Math.PI * 0.03, Math.PI * 0.97);
    ctx.fill();
    ctx.restore();
  }
};

const drawPlayer = (state) => {
  ensureContext();
  
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  const deltaSeconds = Math.min(0.1, Math.max(0, (now - lastAnimatorTime) / 1000));
  lastAnimatorTime = now;
  
  // Update camera to follow player
  updateCamera(state.x, state.y, deltaSeconds);
  
  const position = wasmToCanvas(state.x, state.y);
  const baseRadius = Math.max(20, Math.min(width, height) * 0.035);

  const stateName = typeof state.anim === 'string' ? state.anim : 'idle';
  const targetState = PLAYER_ANIM_CODES[stateName] ?? IDLE_STATE;
  if (targetState !== activeAnimState) {
    try {
      playerAnimator.setAnimState(targetState);
      activeAnimState = targetState;
    } catch (error) {
      console.warn('[Demo] Unable to set animation state', stateName, error);
    }
  }

  const velocityMagnitude = Math.hypot(state.vx ?? 0, state.vy ?? 0);
  if (velocityMagnitude > 0.02) {
    lastFacing = (state.vx ?? 0) < 0 ? 'left' : 'right';
  }
  playerAnimator.setFacing(lastFacing);

  // Initialize procedural player renderer lazily
  if (!playerRenderer) {
    playerRenderer = new PlayerRenderer(ctx, canvas);
  }

  // Use CharacterAnimator only for simple overlay (breathing, wobble) if needed
  const transform = playerAnimator.update(
    deltaSeconds,
    { x: state.x, y: state.y },
    { x: state.vx ?? 0, y: state.vy ?? 0 },
    state.grounded ?? true
  ) || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 };

  // Render full procedural player using modular rig
  playerRenderer.render(state, wasmToCanvas, baseRadius);
};

const drawObstacles = (obstacles) => {
  ensureContext();
  if (!Array.isArray(obstacles) || obstacles.length === 0) {return;}
  ctx.save();
  ctx.lineWidth = 2;
  for (const obstacle of obstacles) {
    const pos = wasmToCanvas(obstacle.x, obstacle.y);
    const radius = Math.max(6, obstacle.r * Math.min(width, height) * 0.05);
    const stroke = obstacle.type === 'landmark' ? 'rgba(190, 242, 100, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    const fill = obstacle.type === 'landmark' ? 'rgba(190, 242, 100, 0.18)' : 'rgba(148, 163, 184, 0.12)';
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

// Wolf renderer instance
let wolfRenderer = null;

// Draw wolves from WASM
const drawWolves = (wasmExports) => {
  ensureContext();
  
  if (!wolfRenderer) {
    wolfRenderer = new WolfRenderer(ctx, canvas);
  }
  
  // Render all wolves using current camera state
  wolfRenderer.render(wasmExports, camera);
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
    drawWolves,
    wasmToCanvas,
    // Camera controls
    getCamera: () => ({ ...camera }),
    setCameraZoom: (zoom) => { camera.zoom = clamp(zoom, 0.1, 2.0); },
    setCameraSmoothing: (smoothing) => { camera.smoothing = clamp(smoothing, 0.01, 1.0); },
    resetCamera: () => {
      camera.x = 0.5;
      camera.y = 0.5;
      camera.targetX = 0.5;
      camera.targetY = 0.5;
    },
    dispose: () => window.removeEventListener('resize', onResize),
    // Wolf renderer configuration
    setWolfDebugMode: (options) => {
      if (wolfRenderer) {
        wolfRenderer.setDebugMode(options);
      }
    }
  };
};
