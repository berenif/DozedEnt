// Camera helpers

export function updateCameraBounds(renderer) {
  const playableWidth = renderer.world.width / 3;
  const playableHeight = renderer.world.height / 3;
  const offsetX = renderer.world.width / 3;
  const offsetY = renderer.world.height / 3;
  const horizontalTravel = Math.max(0, playableWidth - renderer.camera.width);
  const verticalTravel = Math.max(0, playableHeight - renderer.camera.height);

  renderer.camera.bounds.minX = offsetX;
  renderer.camera.bounds.minY = offsetY;
  renderer.camera.bounds.maxX = offsetX + horizontalTravel;
  renderer.camera.bounds.maxY = offsetY + verticalTravel;
}

export function updateCamera(renderer, targetX, targetY, deltaTime) {
  renderer.camera.targetX = targetX - renderer.camera.width / 2;
  renderer.camera.targetY = targetY - renderer.camera.height / 2;

  renderer.camera.targetX = Math.max(
    renderer.camera.bounds.minX,
    Math.min(renderer.camera.bounds.maxX, renderer.camera.targetX)
  );
  renderer.camera.targetY = Math.max(
    renderer.camera.bounds.minY,
    Math.min(renderer.camera.bounds.maxY, renderer.camera.targetY)
  );

  const smoothing = 1 - (1 - renderer.camera.smoothing) ** (deltaTime * 60);
  renderer.camera.x += (renderer.camera.targetX - renderer.camera.x) * smoothing;
  renderer.camera.y += (renderer.camera.targetY - renderer.camera.y) * smoothing;

  if (Math.abs(renderer.camera.x - renderer.camera.targetX) < 0.1) {
    renderer.camera.x = renderer.camera.targetX;
  }
  if (Math.abs(renderer.camera.y - renderer.camera.targetY) < 0.1) {
    renderer.camera.y = renderer.camera.targetY;
  }

  renderer.camera.x = Math.max(
    renderer.camera.bounds.minX,
    Math.min(renderer.camera.bounds.maxX, renderer.camera.x)
  );
  renderer.camera.y = Math.max(
    renderer.camera.bounds.minY,
    Math.min(renderer.camera.bounds.maxY, renderer.camera.y)
  );
}

