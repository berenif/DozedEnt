// Wolf Character Class - Realistic wolf appearance and animations
// Implements proper wolf visuals with ears, snout, tail, and fur texture

import WolfAnimationSystem from '../animation/enemy/wolf-animation.js';

import { getWolfSize, getWolfColors, getPackRole, getWolfTypeFromWasm } from './wolf/data.js';
import {
  update,
  updateLungeAttack,
  startLungeCharge,
  executeLunge,
  cancelLungeCharge,
  endLunge,
  getDistanceTo,
  setState,
  moveTowards,
  attack,
  takeDamage,
  howl,
  updatePackFormation
} from './wolf/behavior.js';
import {
  render,
  drawShadow,
  drawTail,
  drawHindLegs,
  drawBody,
  drawFrontLegs,
  drawNeck,
  drawHead,
  drawEars,
  drawEye,
  drawTeeth,
  drawFurTexture,
  drawLungeEffect,
  drawHealthBar
} from './wolf/rendering.js';

export class WolfCharacter {
  constructor(x, y, type = 'normal', wasmModule = null, id = -1, wasmIndex = -1) {
    this.id = id;
    this.wasmIndex = wasmIndex;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.acceleration = { x: 0, y: 0 };

    this.width = 80;
    this.height = 60;
    this.facing = 1;

    this.type = type;
    this.size = this.getWolfSize();

    this.state = 'idle';
    this.animationFrame = 0;
    this.animationTime = 0;
    this.animationSpeed = 0.1;
    this.howlCooldown = 0;
    this.lastHowlTime = 0;
    this.packFormationOffset = { x: 0, y: 0 };
    this.packFormationAngle = 0;

    this.lungeState = {
      active: false,
      charging: false,
      chargeTime: 0,
      maxChargeTime: 800,
      lungeSpeed: 800,
      lungeDistance: 200,
      cooldown: 2000,
      lastLungeTime: 0,
      startPosition: null,
      targetPosition: null,
      lungeProgress: 0,
      lungeDuration: 350
    };

    this.health = 100;
    this.maxHealth = 100;
    this.damage = 15;
    this.attackRange = 50;
    this.detectionRange = 300;

    this.colors = this.getWolfColors();
    this.isAlpha = this.type === 'alpha';
    this.packRole = this.getPackRole();
    this.packId = null;

    this.furPattern = Math.random();
    this.tailPosition = 0;
    this.earRotation = 0;
    this.breathingOffset = 0;

    this.wasmModule = wasmModule;
    this.speed = 120;
    this.friction = 0.9;

    this.animationSystem = new WolfAnimationSystem();
  }
}

Object.assign(WolfCharacter.prototype, {
  getWolfSize,
  getWolfColors,
  getPackRole,
  getWolfTypeFromWasm,
  update,
  updateLungeAttack,
  startLungeCharge,
  executeLunge,
  cancelLungeCharge,
  endLunge,
  getDistanceTo,
  setState,
  moveTowards,
  attack,
  takeDamage,
  howl,
  updatePackFormation,
  render,
  drawShadow,
  drawTail,
  drawHindLegs,
  drawBody,
  drawFrontLegs,
  drawNeck,
  drawHead,
  drawEars,
  drawEye,
  drawTeeth,
  drawFurTexture,
  drawLungeEffect,
  drawHealthBar
});

export default WolfCharacter;
