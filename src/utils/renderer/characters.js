// Character drawings and combat VFX
import { CharacterAnimator } from '../../animation/system/animation-system.js';

export function drawEnhancedCharacter(renderer, x, y, width, height, color, facing, state, stateTimer, effects) {
  const ctx = renderer.ctx;
  const time = Date.now() / 1000;

  // State-specific color modifications
  let bodyColor = color;
  if (state === 'hurt') {
    bodyColor = '#ff6b6b';
  } else if (state === 'blocking') {
    bodyColor = renderer.blendColors(color, '#4488ff', 0.3);
  } else if (state === 'rolling') {
    bodyColor = renderer.blendColors(color, '#ffffff', 0.2);
  } else if (state === 'wall_sliding') {
    bodyColor = renderer.blendColors(color, '#ffaa00', 0.2);
  }

  ctx.fillStyle = bodyColor;

  // Animation-specific transforms
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);

  // State-specific rotations and scaling
  if (state === 'rolling') {
    ctx.rotate(stateTimer * 20); // Spinning effect
  } else if (state === 'wall_sliding') {
    ctx.scale(1, 1.1); // Stretched vertically
    ctx.rotate(facing * 0.1); // Slight lean
  } else if (state === 'landing' && stateTimer < 0.2) {
    const squash = 1 - (stateTimer / 0.2) * 0.3;
    ctx.scale(1.2, squash); // Squash and stretch
  } else if (!effects.isGrounded && effects.velY < -0.2) {
    ctx.scale(0.9, 1.1); // Stretched when jumping up
  } else if (!effects.isGrounded && effects.velY > 0.2) {
    ctx.scale(1.1, 0.9); // Compressed when falling
  }

  // Translate back to corner for drawing
  ctx.translate(-width / 2, -height / 2);

  // Torso
  ctx.fillRect(width * 0.25, height * 0.3, width * 0.5, height * 0.4);

  // Head
  ctx.beginPath();
  ctx.arc(width / 2, height * 0.2, width * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Arms with state-specific animation
  let armOffset = 0;
  if (state === 'running') {
    armOffset = Math.sin(time * 8) * 8;
  } else if (state === 'attacking') {
    armOffset = Math.sin(stateTimer * 30) * 15;
  } else if (state === 'blocking') {
    armOffset = -5; // Arms up for blocking
  }

  ctx.fillRect(width * 0.1, height * 0.35 + armOffset, width * 0.15, height * 0.3);
  ctx.fillRect(width * 0.75, height * 0.35 - armOffset, width * 0.15, height * 0.3);

  // Legs with state-specific animation
  let legOffset = 0;
  if (state === 'running') {
    legOffset = Math.sin(time * 8 + Math.PI) * 12;
  } else if (state === 'jumping' || state === 'double_jumping') {
    legOffset = -10; // Legs tucked up
  } else if (state === 'landing') {
    legOffset = 5; // Legs extended for landing
  }

  ctx.fillRect(width * 0.25, height * 0.65 + Math.max(0, legOffset), width * 0.2, height * 0.35);
  ctx.fillRect(width * 0.55, height * 0.65 + Math.max(0, -legOffset), width * 0.2, height * 0.35);

  // Eyes
  ctx.fillStyle = '#ffffff';
  const eyeX = facing === 1 ? width * 0.55 : width * 0.35;
  ctx.fillRect(eyeX, height * 0.15, width * 0.1, height * 0.05);

  // State-specific details
  if (state === 'blocking') {
    // Block stance indicator
    ctx.fillStyle = '#4488ff';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(width * 0.8 * facing, height * 0.2, width * 0.1, height * 0.6);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function drawCharacter(renderer, x, y, width, height, color, facing, state, _frame) {
  // Fallback to simple character drawing for compatibility
  drawEnhancedCharacter(renderer, x, y, width, height, color, facing, state, 0, {
    isGrounded: true,
    isRolling: state === 'rolling',
    isBlocking: state === 'blocking',
    jumpCount: 0,
    isWallSliding: state === 'wall_sliding',
    velX: 0,
    velY: 0
  });
}

export function drawWeaponTrail(renderer, pos, facing, stateTimer) {
  const ctx = renderer.ctx;
  ctx.save();
  const angle = Math.sin(stateTimer * 15) * Math.PI / 3;
  const trailLength = 40;
  ctx.strokeStyle = '#ffddaa';
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.7;
  ctx.translate(pos.x + renderer.player.width / 2, pos.y + renderer.player.height * 0.4);
  ctx.rotate(angle * facing);
  ctx.beginPath();
  ctx.arc(0, 0, trailLength, -Math.PI / 6, Math.PI / 6);
  ctx.stroke();
  ctx.restore();
}

export function drawShieldEffect(renderer, pos, facing) {
  const ctx = renderer.ctx;
  ctx.save();
  const time = Date.now() / 1000;
  const pulse = 0.7 + 0.3 * Math.sin(time * 4);
  ctx.fillStyle = `rgba(68, 136, 255, ${0.3 * pulse})`;
  ctx.strokeStyle = '#4488ff';
  ctx.lineWidth = 2;
  const shieldX = pos.x + (facing > 0 ? renderer.player.width - 5 : -15);
  const shieldY = pos.y + renderer.player.height * 0.2;
  const shieldWidth = 20;
  const shieldHeight = renderer.player.height * 0.6;
  ctx.fillRect(shieldX, shieldY, shieldWidth, shieldHeight);
  ctx.strokeRect(shieldX, shieldY, shieldWidth, shieldHeight);
  ctx.restore();
}

export function drawRollTrail(renderer, pos, velX, velY) {
  const ctx = renderer.ctx;
  ctx.save();
  const trailLength = 5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let i = 1; i <= trailLength; i++) {
    const alpha = (trailLength - i) / trailLength * 0.3;
    ctx.globalAlpha = alpha;
    const trailX = pos.x - velX * i * 100;
    const trailY = pos.y - velY * i * 100;
    ctx.beginPath();
    ctx.arc(trailX + renderer.player.width / 2, trailY + renderer.player.height / 2, renderer.player.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawWallSlideEffect(renderer, pos, facing) {
  const ctx = renderer.ctx;
  ctx.save();
  const time = Date.now() / 1000;
  const sparkCount = 3;
  ctx.fillStyle = '#ffaa00';
  for (let i = 0; i < sparkCount; i++) {
    const sparkY = pos.y + renderer.player.height * (0.3 + Math.random() * 0.4);
    const sparkX = pos.x + (facing > 0 ? renderer.player.width + 2 : -5);
    const sparkSize = 2 + Math.random() * 3;
    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(sparkX + Math.sin(time * 10 + i) * 3, sparkY, sparkSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawAirborneEffects(renderer, pos, jumpCount, velY) {
  const ctx = renderer.ctx;
  ctx.save();
  if (jumpCount === 2) {
    // Double jump effect
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) {
      const radius = 20 + i * 8;
      ctx.beginPath();
      ctx.arc(pos.x + renderer.player.width / 2, pos.y + renderer.player.height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Wind effect when falling fast
  if (velY > 0.3) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const lineX = pos.x + renderer.player.width * (0.2 + i * 0.3);
      ctx.beginPath();
      ctx.moveTo(lineX, pos.y - 10);
      ctx.lineTo(lineX, pos.y - 30);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawWeapon(renderer, character) {
  const ctx = renderer.ctx;
  if (character.state === 'attacking') {
    ctx.save();
    // Sword position based on facing
    const swordX = character.x + (character.facing === 1 ? character.width : 0);
    const swordY = character.y + character.height * 0.4;
    ctx.translate(swordX, swordY);
    ctx.rotate(character.weaponAngle + (character.facing === -1 ? Math.PI : 0));
    // Sword blade
    const gradient = ctx.createLinearGradient(0, 0, 40, 0);
    gradient.addColorStop(0, '#c0c0c0');
    gradient.addColorStop(0.5, '#ffffff');
    gradient.addColorStop(1, '#c0c0c0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, -3, 40, 6);
    // Sword handle
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(-10, -4, 15, 8);
    // Sword guard
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(-5, -8, 8, 16);
    ctx.restore();
  }
}

export function drawBow(renderer, archer) {
  const ctx = renderer.ctx;
  if (archer.state === 'attacking') {
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      archer.x + (archer.facing === 1 ? archer.width : 0),
      archer.y + archer.height * 0.4,
      20,
      archer.facing === 1 ? -Math.PI / 4 : Math.PI - Math.PI / 4,
      archer.facing === 1 ? Math.PI / 4 : Math.PI + Math.PI / 4
    );
    ctx.stroke();
    // Arrow
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      archer.x + (archer.facing === 1 ? archer.width : 0),
      archer.y + archer.height * 0.4
    );
    ctx.lineTo(
      archer.x + (archer.facing === 1 ? archer.width + 20 : -20),
      archer.y + archer.height * 0.4
    );
    ctx.stroke();
  }
}

export function drawShield(renderer, character) {
  const ctx = renderer.ctx;
  ctx.fillStyle = 'rgba(100, 150, 200, 0.7)';
  ctx.strokeStyle = '#4a90e2';
  ctx.lineWidth = 3;
  const shieldX = character.x + (character.facing === 1 ? character.width - 10 : -5);
  const shieldY = character.y + character.height * 0.3;
  ctx.fillRect(shieldX, shieldY, 15, character.height * 0.5);
  ctx.strokeRect(shieldX, shieldY, 15, character.height * 0.5);
}

// Procedural player rendering using CharacterAnimator's transform data
export function drawProceduralPlayer(renderer, state, position, baseRadius, transform) {
  const ctx = renderer.ctx;

  // Trails (motion streaks)
  const trails = Array.isArray(transform.trails) ? transform.trails : [];
  if (trails.length > 0) {
    ctx.save();
    for (const trail of trails) {
      const screenPos = renderer.worldToScreen(trail.x, trail.y);
      const alpha = typeof trail.alpha === 'number' ? Math.min(Math.max(trail.alpha, 0), 1) : 0.35;
      const scale = typeof trail.scale === 'number' ? trail.scale : 0.9;
      const r = baseRadius * 0.9 * scale;
      ctx.fillStyle = `rgba(147, 197, 253, ${alpha})`;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Secondary motion (e.g., cape/cloth chain) - DISABLED
  // const segments = Array.isArray(transform.secondaryMotion) ? transform.secondaryMotion : [];
  // if (segments.length > 1) {
  //   ctx.save();
  //   ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  //   ctx.lineWidth = 2;
  //   ctx.beginPath();
  //   const first = renderer.worldToScreen(segments[0].x, segments[0].y);
  //   ctx.moveTo(first.x, first.y);
  //   for (let i = 1; i < segments.length; i++) {
  //     const p = renderer.worldToScreen(segments[i].x, segments[i].y);
  //     ctx.lineTo(p.x, p.y);
  //   }
  //   ctx.stroke();
  //   ctx.restore();
  // }

  // Main body
  const renderSize = Math.max(64, Math.min(renderer.canvas.width, renderer.canvas.height) * 0.14);
  const attacking = (typeof state.anim === 'string' && state.anim === 'attacking') || 
                   (typeof state.animState === 'number' && state.animState === 2);
  const blocking = !!state.block || !!state.isBlocking || 
                  (typeof state.animState === 'number' && state.animState === 3);
  const rolling = !!state.blocking || !!state.isRolling || 
                  (typeof state.animState === 'number' && state.animState === 4);

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
  const speed = Math.hypot(state.velocityX ?? state.velX ?? 0, state.velocityY ?? state.velY ?? 0);
  if (speed > 0.01) {
    const dirX = Math.min(Math.max((state.velocityX ?? state.velX ?? 0) / Math.max(speed, 0.001), -1), 1);
    const dirY = Math.min(Math.max((state.velocityY ?? state.velY ?? 0) / Math.max(speed, 0.001), -1), 1);
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
}

export function renderPlayer(renderer) {
  if (!window.wasmExports) {return;}

  const ctx = renderer.ctx;
  ctx.save();

  const _rx = typeof window.wasmExports.get_x === 'function' ? window.wasmExports.get_x() : 0.5;
  const _ry = typeof window.wasmExports.get_y === 'function' ? window.wasmExports.get_y() : 0.5;
  const wasmX = Number.isFinite(_rx) ? Math.max(0, Math.min(1, _rx)) : 0.5;
  const wasmY = Number.isFinite(_ry) ? Math.max(0, Math.min(1, _ry)) : 0.5;
  const velX = typeof window.wasmExports.get_vel_x === 'function' ? window.wasmExports.get_vel_x() : 0;
  const velY = typeof window.wasmExports.get_vel_y === 'function' ? window.wasmExports.get_vel_y() : 0;
  const isGrounded = typeof window.wasmExports.get_is_grounded === 'function' ? window.wasmExports.get_is_grounded() : 1;
  const isRolling = typeof window.wasmExports.get_is_rolling === 'function' ? window.wasmExports.get_is_rolling() : 0;
  const isBlocking = typeof window.wasmExports.get_block_state === 'function' ? window.wasmExports.get_block_state() : 0;
  const animState = typeof window.wasmExports.get_player_anim_state === 'function' ? window.wasmExports.get_player_anim_state() : 0;
  const jumpCount = typeof window.wasmExports.get_jump_count === 'function' ? window.wasmExports.get_jump_count() : 0;
  const isWallSliding = typeof window.wasmExports.get_is_wall_sliding === 'function' ? window.wasmExports.get_is_wall_sliding() : 0;
  const stateTimer = typeof window.wasmExports.get_player_state_timer === 'function' ? window.wasmExports.get_player_state_timer() : 0;

  const playerWorldPos = renderer.wasmToWorld(wasmX, wasmY);
  renderer.player.x = playerWorldPos.x;
  renderer.player.y = playerWorldPos.y;
  renderer.player.velocityX = velX;
  renderer.player.velocityY = velY;
  renderer.player.isGrounded = isGrounded;

  if (Math.abs(velX) > 0.01) {
    renderer.player.facing = velX > 0 ? 1 : -1;
  }

  const shadowSize = isGrounded ? renderer.player.width / 2 : renderer.player.width / 3;
  const shadowOpacity = isGrounded ? 0.3 : 0.2;
  ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
  ctx.beginPath();
  ctx.ellipse(
    playerWorldPos.x + renderer.player.width / 2,
    playerWorldPos.y + renderer.player.height + (isGrounded ? 5 : 15),
    shadowSize,
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Convert animation state names to match demo convention
  const animStateNames = [
    'idle', 'running', 'attacking', 'blocking', 'rolling', 'hurt', 'dead',
    'jumping', 'doubleJumping', 'landing', 'wallSliding', 'dashing', 'chargingAttack'
  ];
  const currentAnimState = animStateNames[animState] || 'idle';

  // Convert to screen coordinates for procedural rendering
  const screenPos = renderer.worldToScreen(playerWorldPos.x, playerWorldPos.y);
  const baseRadius = Math.max(20, Math.min(renderer.canvas.width, renderer.canvas.height) * 0.035);

  // Create CharacterAnimator instance if not exists on renderer
  if (!renderer.playerAnimator) {
    renderer.playerAnimator = new CharacterAnimator();
    renderer.lastAnimState = 0;
    renderer.lastFacing = 'right';
    renderer.lastAnimatorTime = performance.now();
  }

  // Update animator
  const now = performance.now();
  const deltaSeconds = Math.min(0.1, Math.max(0, (now - renderer.lastAnimatorTime) / 1000));
  renderer.lastAnimatorTime = now;

  // Set animation state if changed
  const targetState = currentAnimState === 'running' ? 1 :
                     currentAnimState === 'attacking' ? 2 :
                     currentAnimState === 'blocking' ? 3 :
                     currentAnimState === 'rolling' ? 4 :
                     currentAnimState === 'hurt' ? 5 :
                     currentAnimState === 'dead' ? 6 :
                     currentAnimState === 'jumping' ? 7 :
                     currentAnimState === 'doubleJumping' ? 8 :
                     currentAnimState === 'landing' ? 9 :
                     currentAnimState === 'wallSliding' ? 10 :
                     currentAnimState === 'dashing' ? 11 :
                     currentAnimState === 'chargingAttack' ? 12 : 0;

  if (targetState !== renderer.lastAnimState) {
    try {
      renderer.playerAnimator.setAnimState(targetState);
      renderer.lastAnimState = targetState;
    } catch (error) {
      console.warn('[Game] Unable to set animation state', currentAnimState, error);
    }
  }

  // Set facing direction
  const velocityMagnitude = Math.hypot(velX, velY);
  if (velocityMagnitude > 0.02) {
    const velocityDir = velX < 0 ? 'left' : 'right';
    if (velocityDir !== renderer.lastFacing) {
      renderer.playerAnimator.setFacing(velocityDir);
      renderer.lastFacing = velocityDir;
    }
  }

  // Get transform data from CharacterAnimator
  const transform = renderer.playerAnimator.update(
    deltaSeconds,
    playerWorldPos,
    { x: velX, y: velY },
    !!isGrounded
  ) || { scaleX: 1, scaleY: 1, rotation: 0, offsetX: 0, offsetY: 0 };

  // Create state object for procedural rendering
  const playerState = {
    x: playerWorldPos.x,
    y: playerWorldPos.y,
    vx: velX,
    vy: velY,
    velocityX: velX,
    velocityY: velY,
    grounded: !!isGrounded,
    rolling: !!isRolling,
    block: !!isBlocking,
    anim: currentAnimState,
    animState: animState
  };

  // Use procedural rendering instead of enhanced character drawing
  drawProceduralPlayer(renderer, playerState, screenPos, baseRadius, transform);

  ctx.restore();
}
