// Game Renderer - thin facade delegating to specialized modules

import { globalLODSystem } from './performance-lod-system.js';
import { globalProfiler } from './performance-profiler.js';

import { renderParallaxLayer as _renderParallaxLayer, renderBackground as _renderBackground } from './renderer/layers.js';
import { renderProjectiles as _renderProjectiles } from './renderer/projectiles.js';
import { renderLighting as _renderLighting } from './renderer/lighting.js';
import { renderPlatforms as _renderPlatforms, renderDecorations as _renderDecorations, renderWasmLandmarks as _renderWasmLandmarks, renderWasmExits as _renderWasmExits } from './renderer/world.js';

import {
  initializeEnvironment as _initializeEnvironment,
  loadEnvironmentFromWasm as _loadEnvironmentFromWasm,
  getEnvironmentTypeString as _getEnvironmentTypeString,
  getWeatherTypeFromWasm as _getWeatherTypeFromWasm,
  generateEnvironmentInWasm as _generateEnvironmentInWasm,
  generateLegacyEnvironment as _generateLegacyEnvironment,
  generateForestEnvironment as _generateForestEnvironment,
  generateSwampEnvironment as _generateSwampEnvironment,
  generateMountainEnvironment as _generateMountainEnvironment,
  generatePlainsEnvironment as _generatePlainsEnvironment,
  generateDefaultEnvironment as _generateDefaultEnvironment,
  changeBiome as _changeBiome,
  updateBiomeVisuals as _updateBiomeVisuals,
  update as _envUpdate,
  onEnvironmentalHazard as _onEnvironmentalHazard,
  interactWithObject as _interactWithObject,
  updateEnvironmentObjectState as _updateEnvironmentObjectState,
  initializeCollectibles as _initializeCollectibles,
  getCollectibleColor as _getCollectibleColor,
} from './renderer/environment.js';
import { updateCameraBounds as _updateCameraBounds, updateCamera as _updateCamera } from './renderer/camera.js';
import {
  wasmToWorld as _wasmToWorld,
  worldToWasm as _worldToWasm,
  wasmToWorldScaled as _wasmToWorldScaled,
  wasmRadiusToWorld as _wasmRadiusToWorld,
  worldRadiusToWasm as _worldRadiusToWasm,
  isWasmCoordValid as _isWasmCoordValid,
  isWorldCoordInPlayableArea as _isWorldCoordInPlayableArea,
  setPlayerPositionFromWasm as _setPlayerPositionFromWasm,
  getPlayerPositionAsWasm as _getPlayerPositionAsWasm,
  screenToWorld as _screenToWorld,
  worldToScreen as _worldToScreen,
} from './renderer/coords.js';

import {
  drawMountain as _drawMountain,
  drawBackgroundTree as _drawBackgroundTree,
  drawSwampTree as _drawSwampTree,
  drawSnowyMountain as _drawSnowyMountain,
  drawHill as _drawHill,
} from './renderer/environment-shapes.js';
import {
  drawTree as _drawTree,
  drawRock as _drawRock,
  drawBush as _drawBush,
  drawCrate as _drawCrate,
  drawBarrel as _drawBarrel,
  drawSwampTreeForeground as _drawSwampTreeForeground,
  drawLilyPad as _drawLilyPad,
  drawSnowPatch as _drawSnowPatch,
  drawGrassTuft as _drawGrassTuft,
} from './renderer/environment-objects.js';
import {
  drawCoin as _drawCoin,
  drawGem as _drawGem,
  drawPowerup as _drawPowerup,
  drawHealthPickup as _drawHealthPickup,
} from './renderer/pickups.js';
import {
  drawLandmark as _drawLandmark,
  drawExit as _drawExit,
  drawChest as _drawChest,
  drawLever as _drawLever,
  drawDoor as _drawDoor,
} from './renderer/world-interactables.js';
import {
  drawEnhancedCharacter as _drawEnhancedCharacter,
  drawCharacter as _drawCharacter,
  drawWeaponTrail as _drawWeaponTrail,
  drawShieldEffect as _drawShieldEffect,
  drawRollTrail as _drawRollTrail,
  drawWallSlideEffect as _drawWallSlideEffect,
  drawAirborneEffects as _drawAirborneEffects,
  drawWeapon as _drawWeapon,
  drawBow as _drawBow,
  drawShield as _drawShield,
  drawProceduralPlayer as _drawProceduralPlayer,
  renderPlayer as _renderPlayer,
} from './renderer/characters.js';
import {
  drawRainEffect as _drawRainEffect,
  drawSnowEffect as _drawSnowEffect,
  drawFogEffect as _drawFogEffect,
  drawWindEffect as _drawWindEffect,
  drawFallingLeaves as _drawFallingLeaves,
  drawGlowingSpores as _drawGlowingSpores,
  drawShimmeringCold as _drawShimmeringCold,
  drawFloatingDust as _drawFloatingDust,
} from './renderer/weather-effects.js';
import { drawHealthBar as _drawHealthBar, drawStaminaBar as _drawStaminaBar, drawMiniMap as _drawMiniMap } from './renderer/ui-bars.js';

export class GameRenderer {
  constructor(ctx, canvas, initialBiome = 0) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.currentBiome = initialBiome;
    this.world = { width: 3840, height: 2160, tileSize: 32 };
    this.camera = {
      x: 0, y: 0, targetX: 0, targetY: 0,
      width: canvas.width, height: canvas.height,
      zoom: 1.0, smoothing: 0.1,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };
    this.updateCameraBounds();
    this.lodSystem = globalLODSystem;
    this.profiler = globalProfiler;
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.player = {
      x: this.world.width / 2, y: this.world.height / 2,
      width: 48, height: 64,
      velocityX: 0, velocityY: 0,
      maxSpeed: 500, acceleration: 2000, friction: 0.85,
      facing: 1, state: 'idle',
      health: 100, maxHealth: 100,
      stamina: 100, maxStamina: 100,
      animationFrame: 0, animationTime: 0,
      color: '#4a90e2', weaponAngle: 0,
      isGrounded: true, jumpPower: -800, gravity: 2000,
    };
    this.useExternalPlayer = false;
    this.weather = { type: 'clear', intensity: 0, particles: [] };
    this.enemies = [];
    this.initializeEnemies();
    this.platforms = [];
    this.decorations = [];
    this.interactables = [];
    this.initializeEnvironment();
    this.projectiles = [];
    this.collectibles = [];
    this.initializeCollectibles();
    this.backgroundLayers = [];
    this.foregroundEffects = [];
    this.spatialGrid = new Map();
    this.lights = [];
    this.ambientLight = 0.3;
  }

  initializeEnemies() { /* managed externally; keep placeholder */ }

  // Camera
  updateCameraBounds() { return _updateCameraBounds(this); }
  updateCamera(targetX, targetY, deltaTime) { return _updateCamera(this, targetX, targetY, deltaTime); }

  // Environment
  initializeEnvironment(wasmModule = null) { return _initializeEnvironment(this, wasmModule); }
  loadEnvironmentFromWasm(wasmModule) { return _loadEnvironmentFromWasm(this, wasmModule); }
  getEnvironmentTypeString(typeEnum) { return _getEnvironmentTypeString(typeEnum); }
  getWeatherTypeFromWasm(wasmModule) { return _getWeatherTypeFromWasm(wasmModule); }
  generateEnvironmentInWasm(wasmModule, biomeType, seed = null) { return _generateEnvironmentInWasm(this, wasmModule, biomeType, seed); }
  generateLegacyEnvironment() { return _generateLegacyEnvironment(this); }
  generateForestEnvironment() { return _generateForestEnvironment(this); }
  generateSwampEnvironment() { return _generateSwampEnvironment(this); }
  generateMountainEnvironment() { return _generateMountainEnvironment(this); }
  generatePlainsEnvironment() { return _generatePlainsEnvironment(this); }
  generateDefaultEnvironment() { return _generateDefaultEnvironment(this); }
  changeBiome(newBiome, wasmModule = null, seed = null) { return _changeBiome(this, newBiome, wasmModule, seed); }
  updateBiomeVisuals() { return _updateBiomeVisuals(this); }
  update(deltaTime, wasmModule = null) { return _envUpdate(this, deltaTime, wasmModule); }
  onEnvironmentalHazard(hazard) { return _onEnvironmentalHazard(this, hazard); }
  interactWithObject(objectIndex, wasmModule) { return _interactWithObject(this, objectIndex, wasmModule); }
  updateEnvironmentObjectState(objectIndex, wasmModule) { return _updateEnvironmentObjectState(this, objectIndex, wasmModule); }
  initializeCollectibles() { return _initializeCollectibles(this); }
  getCollectibleColor(type) { return _getCollectibleColor(type); }

  // Render pipeline
  renderWithCameraFollow(followPlayer = true) {
    if (followPlayer) this.updateCamera(this.player.x, this.player.y, 1 / 60);
    this.ctx.save();
    const offsetX = -this.camera.x + this.canvas.width / 2;
    const offsetY = -this.camera.y + this.canvas.height / 2;
    this.ctx.translate(offsetX, offsetY);
    this.renderBackground();
    this.renderPlatforms();
    this.renderDecorations();
    this.renderCollectibles();
    this.renderInteractables();
    this.renderEnemies();
    if (!this.useExternalPlayer) this.renderPlayer();
    this.renderProjectiles();
    this.renderLighting();
    this.renderWeather();
    this.ctx.restore();
    this.renderUI();
  }

  render() {
    this.profiler.beginFrame();
    this.profiler.beginRender();
    const frameStart = performance.now();
    try {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.updateCamera(this.player.x, this.player.y, 1 / 60);
      this.renderBackground();
      this.renderPlatforms();
      this.renderDecorations();
      this.renderEnemies();
      this.renderPlayer();
      this.renderUI();
    } catch (error) {
      console.error('Render error:', error);
    } finally {
      this.profiler.endRender();
      const frameTime = performance.now() - frameStart;
      this.lastFrameTime = frameTime;
      this.frameCount++;
      this.lodSystem.updatePerformanceMetrics(frameTime);
      this.profiler.endFrame();
    }
  }

  renderBackground() { return _renderBackground(this); }
  renderParallaxLayer(scrollFactor, renderFunc) { return _renderParallaxLayer(this, scrollFactor, renderFunc); }
  renderPlatforms() { return _renderPlatforms(this); }
  renderDecorations() { return _renderDecorations(this); }
  renderWasmLandmarks() { return _renderWasmLandmarks(this); }
  renderWasmExits() { return _renderWasmExits(this); }
  renderEnemies() { /* optional external */ }
  renderPlayer() { return _renderPlayer(this); }
  renderProjectiles() { return _renderProjectiles(this); }
  renderLighting() { return _renderLighting(this); }
  renderWeather() {
    switch (this.currentBiome) {
      case 0: this.weather.type = 'rain'; this.weather.intensity = 0.2; this.drawFallingLeaves(0.3); break;
      case 1: this.weather.type = 'fog'; this.weather.intensity = 0.6; if (Math.random() < 0.01) this.drawRainEffect(0.3); this.drawGlowingSpores(0.4); break;
      case 2: this.weather.type = 'snow'; this.weather.intensity = 0.7; this.drawWindEffect(0.1); this.drawShimmeringCold(0.2); break;
      case 3: this.weather.type = 'clear'; this.weather.intensity = 0; this.drawWindEffect(0.2); this.drawFloatingDust(0.3); break;
      default: this.weather.type = 'clear'; this.weather.intensity = 0; break;
    }
    if (this.weather.type === 'rain') this.drawRainEffect(this.weather.intensity);
    else if (this.weather.type === 'snow') this.drawSnowEffect(this.weather.intensity);
    else if (this.weather.type === 'fog') this.drawFogEffect(this.weather.intensity);
  }
  renderUI() {
    this.drawHealthBar(20, 20, 200, 20, this.player.health, this.player.maxHealth);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    const biomeNames = ['Forest', 'Swamp', 'Mountains', 'Plains'];
    this.ctx.fillText(`Biome: ${biomeNames[this.currentBiome] || 'Unknown'}`, 20, 80);
    this.drawStaminaBar(20, 50, 200, 15, this.player.stamina, this.player.maxStamina);
    this.drawMiniMap(this.canvas.width - 160, 20, 140, 100);
  }

  // Collectibles
  renderCollectibles() {
    const time = Date.now() / 1000;
    this.collectibles.forEach((item) => {
      if (item.collected) return;
      const floatY = Math.sin(time * 2 + item.animationTime) * 5;
      this.ctx.shadowColor = item.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fillStyle = item.color;
      switch (item.type) {
        case 'coin': this.drawCoin(item.x, item.y + floatY, item.width); break;
        case 'gem': this.drawGem(item.x, item.y + floatY, item.width); break;
        case 'powerup': this.drawPowerup(item.x, item.y + floatY, item.width, item.effect); break;
        case 'health': this.drawHealthPickup(item.x, item.y + floatY, item.width); break;
      }
      this.ctx.shadowBlur = 0;
    });
  }

  // Interactables wrappers
  renderInteractables() { this.renderWasmLandmarks(); this.renderWasmExits(); this.interactables.forEach((obj) => { switch (obj.type) { case 'chest': this.drawChest(obj); break; case 'lever': this.drawLever(obj); break; case 'door': this.drawDoor(obj); break; } }); }
  drawLandmark(x, y, index) { return _drawLandmark(this, x, y, index); }
  drawExit(x, y, index) { return _drawExit(this, x, y, index); }
  drawChest(chest) { return _drawChest(this, chest); }
  drawLever(lever) { return _drawLever(this, lever); }
  drawDoor(door) { return _drawDoor(this, door); }

  // Shapes/objects
  drawMountain(x, y, width, height) { return _drawMountain(this, x, y, width, height); }
  drawBackgroundTree(x, y, width, height) { return _drawBackgroundTree(this, x, y, width, height); }
  drawSwampTree(x, y, width, height) { return _drawSwampTree(this, x, y, width, height); }
  drawSnowyMountain(x, y, width, height) { return _drawSnowyMountain(this, x, y, width, height); }
  drawHill(x, y, width, height) { return _drawHill(this, x, y, width, height); }
  drawTree(x, y, width, height, detailed = true) { return _drawTree(this, x, y, width, height, detailed); }
  drawRock(x, y, width, height, detailed = true) { return _drawRock(this, x, y, width, height, detailed); }
  drawBush(x, y, width, height) { return _drawBush(this, x, y, width, height); }
  drawCrate(x, y, width, height) { return _drawCrate(this, x, y, width, height); }
  drawBarrel(x, y, width, height) { return _drawBarrel(this, x, y, width, height); }
  drawSwampTreeForeground(x, y, width, height) { return _drawSwampTreeForeground(this, x, y, width, height); }
  drawLilyPad(x, y, size) { return _drawLilyPad(this, x, y, size); }
  drawSnowPatch(x, y, width, height) { return _drawSnowPatch(this, x, y, width, height); }
  drawGrassTuft(x, y, width, height) { return _drawGrassTuft(this, x, y, width, height); }

  // Pickups
  drawCoin(x, y, size) { return _drawCoin(this, x, y, size); }
  drawGem(x, y, size) { return _drawGem(this, x, y, size); }
  drawPowerup(x, y, size) { return _drawPowerup(this, x, y, size); }
  drawHealthPickup(x, y, size) { return _drawHealthPickup(this, x, y, size); }

  // Characters/effects
  drawProceduralPlayer(state, position, baseRadius, transform) { return _drawProceduralPlayer(this, state, position, baseRadius, transform); }
  drawEnhancedCharacter(x, y, width, height, color, facing, state, stateTimer, effects) { return _drawEnhancedCharacter(this, x, y, width, height, color, facing, state, stateTimer, effects); }
  drawCharacter(x, y, width, height, color, facing, state, _frame) { return _drawCharacter(this, x, y, width, height, color, facing, state, _frame); }
  drawWeaponTrail(pos, facing, stateTimer) { return _drawWeaponTrail(this, pos, facing, stateTimer); }
  drawShieldEffect(pos, facing) { return _drawShieldEffect(this, pos, facing); }
  drawRollTrail(pos, velX, velY) { return _drawRollTrail(this, pos, velX, velY); }
  drawWallSlideEffect(pos, facing) { return _drawWallSlideEffect(this, pos, facing); }
  drawAirborneEffects(pos, jumpCount, velY) { return _drawAirborneEffects(this, pos, jumpCount, velY); }
  drawWeapon(character) { return _drawWeapon(this, character); }
  drawBow(archer) { return _drawBow(this, archer); }
  drawShield(character) { return _drawShield(this, character); }

  // Lighting/particles
  drawRainEffect(intensity) { return _drawRainEffect(this, intensity); }
  drawSnowEffect(intensity) { return _drawSnowEffect(this, intensity); }
  drawFogEffect(intensity) { return _drawFogEffect(this, intensity); }
  drawWindEffect(intensity) { return _drawWindEffect(this, intensity); }
  drawFallingLeaves(intensity) { return _drawFallingLeaves(this, intensity); }
  drawGlowingSpores(intensity) { return _drawGlowingSpores(this, intensity); }
  drawShimmeringCold(intensity) { return _drawShimmeringCold(this, intensity); }
  drawFloatingDust(intensity) { return _drawFloatingDust(this, intensity); }

  // UI
  drawHealthBar(x, y, width, height, current, max) { return _drawHealthBar(this, x, y, width, height, current, max); }
  drawStaminaBar(x, y, width, height, current, max) { return _drawStaminaBar(this, x, y, width, height, current, max); }
  drawMiniMap(x, y, width, height) { return _drawMiniMap(this, x, y, width, height); }

  // Utilities
  blendColors(color1, color2, ratio) { const c1 = this.hexToRgb(color1); const c2 = this.hexToRgb(color2); const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio); const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio); const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio); return `rgb(${r}, ${g}, ${b})`; }
  hexToRgb(hex) { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 74, g: 144, b: 226 }; }

  // WASM/world/screen coords
  wasmToWorld(wasmX, wasmY) { return _wasmToWorld(this, wasmX, wasmY); }
  worldToWasm(worldX, worldY) { return _worldToWasm(this, worldX, worldY); }
  wasmToWorldScaled(wasmX, wasmY, scale = 1.0) { return _wasmToWorldScaled(this, wasmX, wasmY, scale); }
  wasmRadiusToWorld(wasmRadius) { return _wasmRadiusToWorld(this, wasmRadius); }
  worldRadiusToWasm(worldRadius) { return _worldRadiusToWasm(this, worldRadius); }
  isWasmCoordValid(wasmX, wasmY) { return _isWasmCoordValid(wasmX, wasmY); }
  isWorldCoordInPlayableArea(worldX, worldY) { return _isWorldCoordInPlayableArea(this, worldX, worldY); }
  setPlayerPositionFromWasm(wasmX, wasmY) { return _setPlayerPositionFromWasm(this, wasmX, wasmY); }
  getPlayerPositionAsWasm() { return _getPlayerPositionAsWasm(this); }
  screenToWorld(screenX, screenY) { return _screenToWorld(this, screenX, screenY); }
  worldToScreen(worldX, worldY) { return _worldToScreen(this, worldX, worldY); }

  // Basic interactions
  performAttack() { this.player.state = 'attacking'; return true; }
  performBlock(active) { if (active && this.player.state !== 'blocking') { this.player.state = 'blocking'; return true; } if (!active && this.player.state === 'blocking') { this.player.state = 'idle'; return false; } return this.player.state === 'blocking'; }
  getPlayerPosition() { return { x: this.player.x, y: this.player.y }; }
  setPlayerPosition(x, y) { this.player.x = Math.max(0, Math.min(this.world.width, x)); this.player.y = Math.max(0, Math.min(this.world.height, y)); this.player.velocityX = 0; this.player.velocityY = 0; }
  getCameraPosition() { return { x: this.camera.x, y: this.camera.y }; }
}

export default GameRenderer

