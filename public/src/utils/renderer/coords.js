// WASM/world/screen coordinate helpers

export function wasmToWorld(renderer, wasmX, wasmY) {
  const nx = Number.isFinite(wasmX) ? Math.max(0, Math.min(1, wasmX)) : 0.5;
  const ny = Number.isFinite(wasmY) ? Math.max(0, Math.min(1, wasmY)) : 0.5;
  const playableWidth = renderer.world.width / 3;
  const playableHeight = renderer.world.height / 3;
  const offsetX = renderer.world.width / 3;
  const offsetY = renderer.world.height / 3;
  return { x: offsetX + nx * playableWidth, y: offsetY + ny * playableHeight };
}

export function worldToWasm(renderer, worldX, worldY) {
  const playableWidth = renderer.world.width / 3;
  const playableHeight = renderer.world.height / 3;
  const offsetX = renderer.world.width / 3;
  const offsetY = renderer.world.height / 3;
  const wx = Math.max(0, Math.min(1, (worldX - offsetX) / playableWidth));
  const wy = Math.max(0, Math.min(1, (worldY - offsetY) / playableHeight));
  return { x: wx, y: wy };
}

export function wasmToWorldScaled(renderer, wasmX, wasmY, scale = 1.0) {
  const worldPos = wasmToWorld(renderer, wasmX, wasmY);
  return { x: worldPos.x * scale, y: worldPos.y * scale };
}

export function wasmRadiusToWorld(renderer, wasmRadius) {
  return wasmRadius * (renderer.world.width / 3);
}

export function worldRadiusToWasm(renderer, worldRadius) {
  return worldRadius / (renderer.world.width / 3);
}

export function isWasmCoordValid(wasmX, wasmY) {
  return wasmX >= 0 && wasmX <= 1 && wasmY >= 0 && wasmY <= 1;
}

export function isWorldCoordInPlayableArea(renderer, worldX, worldY) {
  const wasmCoord = worldToWasm(renderer, worldX, worldY);
  return isWasmCoordValid(wasmCoord.x, wasmCoord.y);
}

export function setPlayerPositionFromWasm(renderer, wasmX, wasmY) {
  const worldPos = wasmToWorld(renderer, wasmX, wasmY);
  renderer.setPlayerPosition(worldPos.x, worldPos.y);
}

export function getPlayerPositionAsWasm(renderer) {
  return worldToWasm(renderer, renderer.player.x, renderer.player.y);
}

export function screenToWorld(renderer, screenX, screenY) {
  return {
    x: screenX + renderer.camera.x - renderer.canvas.width / 2,
    y: screenY + renderer.camera.y - renderer.canvas.height / 2,
  };
}

export function worldToScreen(renderer, worldX, worldY) {
  return {
    x: worldX - renderer.camera.x + renderer.canvas.width / 2,
    y: worldY - renderer.camera.y + renderer.canvas.height / 2,
  };
}

