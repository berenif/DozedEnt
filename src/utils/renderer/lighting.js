// Lighting overlay rendering

export function renderLighting(renderer) {
  const ctx = renderer.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';

  ctx.fillStyle = `rgba(0, 0, 20, ${1 - renderer.ambientLight})`;
  ctx.fillRect(
    renderer.camera.x - renderer.canvas.width / 2,
    renderer.camera.y - renderer.canvas.height / 2,
    renderer.canvas.width,
    renderer.canvas.height
  );

  ctx.globalCompositeOperation = 'screen';

  renderer.lights.forEach((light) => {
    const gradient = ctx.createRadialGradient(
      light.x,
      light.y,
      0,
      light.x,
      light.y,
      light.radius
    );
    gradient.addColorStop(0, light.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.globalAlpha = light.intensity;
    ctx.fillRect(
      light.x - light.radius,
      light.y - light.radius,
      light.radius * 2,
      light.radius * 2
    );
  });

  ctx.restore();
}

