// Background and parallax layer rendering

export function renderParallaxLayer(renderer, scrollFactor, renderFunc) {
  const ctx = renderer.ctx;
  ctx.save();
  ctx.translate(-renderer.camera.x * scrollFactor, -renderer.camera.y * scrollFactor);
  renderFunc();
  ctx.restore();
}

export function renderBackground(renderer) {
  const ctx = renderer.ctx;
  // Biome-specific sky or base background color
  switch (renderer.currentBiome) {
    case 0: // Forest
      ctx.fillStyle = '#4CAF50';
      break;
    case 1: // Swamp
      ctx.fillStyle = '#5D4037';
      break;
    case 2: // Mountains
      ctx.fillStyle = '#78909C';
      break;
    case 3: // Plains
      ctx.fillStyle = '#8BC34A';
      break;
    default:
      ctx.fillStyle = '#87CEEB';
      break;
  }
  ctx.fillRect(
    renderer.camera.x - renderer.canvas.width / 2,
    renderer.camera.y - renderer.canvas.height / 2,
    renderer.canvas.width,
    renderer.canvas.height
  );

  // Biome-specific background elements (mountains, distant trees, etc.)
  switch (renderer.currentBiome) {
    case 0: // Forest
      renderParallaxLayer(renderer, 0.3, () => {
        ctx.fillStyle = '#388E3C';
        renderer.drawMountain(200, 400, 300, 200);
        renderer.drawMountain(500, 400, 400, 250);
        renderer.drawMountain(900, 400, 350, 180);
      });
      renderParallaxLayer(renderer, 0.5, () => {
        ctx.fillStyle = '#66BB6A';
        for (let i = 0; i < 15; i++) {
          renderer.drawBackgroundTree(i * 150 + 50, 380, 70, 120);
        }
      });
      break;
    case 1: // Swamp
      renderParallaxLayer(renderer, 0.4, () => {
        ctx.fillStyle = '#8D6E63';
        for (let i = 0; i < 10; i++) {
          renderer.drawSwampTree(i * 200 + 100, 380, 80, 150);
        }
      });
      break;
    case 2: // Mountains
      renderParallaxLayer(renderer, 0.3, () => {
        ctx.fillStyle = '#546E7A';
        renderer.drawMountain(200, 400, 350, 250);
        renderer.drawMountain(600, 400, 500, 300);
        renderer.drawMountain(1000, 400, 400, 220);
      });
      renderParallaxLayer(renderer, 0.5, () => {
        ctx.fillStyle = '#B0BEC5';
        renderer.drawSnowyMountain(300, 350, 300, 180);
        renderer.drawSnowyMountain(800, 350, 400, 220);
      });
      break;
    case 3: // Plains
      renderParallaxLayer(renderer, 0.6, () => {
        ctx.fillStyle = '#C5E1A5';
        for (let i = 0; i < 5; i++) {
          renderer.drawHill(i * 300 + 100, 450, 200, 80);
        }
      });
      break;
    default:
      renderParallaxLayer(renderer, 0.3, () => {
        ctx.fillStyle = '#607D8B';
        renderer.drawMountain(200, 400, 300, 200);
        renderer.drawMountain(500, 400, 400, 250);
        renderer.drawMountain(900, 400, 350, 180);
      });
      break;
  }
}

