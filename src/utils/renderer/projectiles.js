// Projectiles rendering

export function renderProjectiles(renderer) {
  const ctx = renderer.ctx;
  renderer.projectiles.forEach((proj) => {
    ctx.save();

    const gradient = ctx.createLinearGradient(
      proj.x - proj.velocityX * 0.1,
      proj.y - proj.velocityY * 0.1,
      proj.x,
      proj.y
    );
    gradient.addColorStop(0, 'rgba(255, 200, 100, 0)');
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0.8)');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = proj.size;
    ctx.beginPath();
    ctx.moveTo(
      proj.x - proj.velocityX * 0.1,
      proj.y - proj.velocityY * 0.1
    );
    ctx.lineTo(proj.x, proj.y);
    ctx.stroke();

    ctx.fillStyle = proj.color || '#ffaa00';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

