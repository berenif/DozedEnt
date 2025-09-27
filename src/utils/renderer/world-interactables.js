// Interactable/world marker drawings

export function drawLandmark(renderer, x, y, index) {
  const ctx = renderer.ctx;
  ctx.save();

  // Pulsing glow effect
  const time = Date.now() / 1000;
  const pulse = 0.8 + 0.2 * Math.sin(time * 2 + index);

  // Glow
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 20 * pulse;

  // Main landmark body (crystal/obelisk style)
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.moveTo(x, y - 30);
  ctx.lineTo(x - 15, y);
  ctx.lineTo(x - 8, y + 20);
  ctx.lineTo(x + 8, y + 20);
  ctx.lineTo(x + 15, y);
  ctx.closePath();
  ctx.fill();

  // Inner light
  ctx.fillStyle = '#FFFF99';
  ctx.beginPath();
  ctx.moveTo(x, y - 25);
  ctx.lineTo(x - 10, y - 5);
  ctx.lineTo(x - 5, y + 15);
  ctx.lineTo(x + 5, y + 15);
  ctx.lineTo(x + 10, y - 5);
  ctx.closePath();
  ctx.fill();

  // Reset shadow
  ctx.shadowBlur = 0;

  ctx.restore();
}

export function drawExit(renderer, x, y, index) {
  const ctx = renderer.ctx;
  ctx.save();

  // Portal effect
  const time = Date.now() / 1000;
  const rotation = time + index * Math.PI / 2;

  // Portal ring
  ctx.strokeStyle = '#00FFFF';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#00FFFF';
  ctx.shadowBlur = 15;

  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.stroke();

  // Inner swirl
  ctx.strokeStyle = '#0099FF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const angle = rotation + i * (Math.PI * 2 / 3);
    const radius = 15;
    ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    ctx.arc(x, y, radius, angle, angle + Math.PI / 2);
  }
  ctx.stroke();

  // Center core
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow
  ctx.shadowBlur = 0;

  ctx.restore();
}

export function drawChest(renderer, chest) {
  const ctx = renderer.ctx;
  // Chest body
  ctx.fillStyle = chest.opened ? '#654321' : '#8b6914';
  ctx.fillRect(chest.x, chest.y, chest.width, chest.height);

  // Chest lid
  if (!chest.opened) {
    ctx.fillStyle = '#a0742c';
    ctx.fillRect(chest.x, chest.y, chest.width, chest.height * 0.4);

    // Lock
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(
      chest.x + chest.width * 0.4,
      chest.y + chest.height * 0.3,
      chest.width * 0.2,
      chest.height * 0.2
    );
  }

  // Decorative bands
  ctx.strokeStyle = '#4a3c28';
  ctx.lineWidth = 2;
  ctx.strokeRect(chest.x, chest.y, chest.width, chest.height);
}

export function drawLever(renderer, lever) {
  const ctx = renderer.ctx;
  // Base
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(
    lever.x,
    lever.y + lever.height * 0.7,
    lever.width,
    lever.height * 0.3
  );

  // Handle
  ctx.save();
  ctx.translate(lever.x + lever.width / 2, lever.y + lever.height * 0.7);
  ctx.rotate(lever.activated ? Math.PI / 4 : -Math.PI / 4);

  ctx.fillStyle = '#8b4513';
  ctx.fillRect(-2, -lever.height * 0.6, 4, lever.height * 0.6);

  // Handle grip
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(0, -lever.height * 0.6, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawDoor(renderer, door) {
  const ctx = renderer.ctx;
  // Door frame
  ctx.strokeStyle = '#4a3c28';
  ctx.lineWidth = 5;
  ctx.strokeRect(door.x, door.y, door.width, door.height);

  // Door
  ctx.fillStyle = door.locked ? '#8b6914' : 'rgba(139, 105, 20, 0.5)';
  ctx.fillRect(door.x, door.y, door.width, door.height);

  // Door handle
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(
    door.x + door.width * 0.8,
    door.y + door.height / 2,
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // Lock indicator
  if (door.locked) {
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LOCK', door.x + door.width / 2, door.y + door.height / 2);
  }
}

