/**
 * Visual Effects Manager - Comprehensive visual effects system
 * Handles screen shake, camera effects, particle systems, and phase transitions
 */

export class VisualEffectsManager {
  constructor(canvas, gameStateManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameStateManager = gameStateManager;
    
    // Screen effects
    this.screenShake = {
      intensity: 0,
      duration: 0,
      frequency: 30,
      offset: { x: 0, y: 0 }
    };
    
    // Camera effects
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      targetZoom: 1,
      rotation: 0,
      targetRotation: 0,
      smoothing: 0.1
    };
    
    // Flash effects
    this.flashEffect = {
      active: false,
      color: '#ffffff',
      opacity: 0,
      duration: 0,
      fadeSpeed: 2
    };
    
    // Slow motion effects
    this.slowMotion = {
      active: false,
      factor: 1.0,
      targetFactor: 1.0,
      duration: 0,
      smoothing: 0.05
    };
    
    // Particle systems
    this.particleSystems = new Map();
    
    // Phase transition effects
    this.phaseTransition = {
      active: false,
      type: 'fade',
      progress: 0,
      duration: 1000,
      fromPhase: null,
      toPhase: null
    };
    
    // Combat effects
    this.combatEffects = [];
    
    // Environmental effects
    this.environmentalEffects = {
      fog: { active: false, density: 0, color: '#888888' },
      rain: { active: false, intensity: 0, drops: [] },
      snow: { active: false, intensity: 0, flakes: [] },
      wind: { active: false, strength: 0, direction: 0 }
    };
    
    this.init();
  }
  
  /**
   * Initialize visual effects system
   */
  init() {
    this.setupParticleSystems();
    this.setupPostProcessing();
    this.bindGameEvents();
  }
  
  /**
   * Setup particle systems
   */
  setupParticleSystems() {
    // Combat particle systems
    this.particleSystems.set('hit', {
      particles: [],
      maxParticles: 50,
      spawn: this.createHitParticles.bind(this)
    });
    
    this.particleSystems.set('block', {
      particles: [],
      maxParticles: 30,
      spawn: this.createBlockParticles.bind(this)
    });
    
    this.particleSystems.set('roll', {
      particles: [],
      maxParticles: 20,
      spawn: this.createRollParticles.bind(this)
    });
    
    this.particleSystems.set('special', {
      particles: [],
      maxParticles: 100,
      spawn: this.createSpecialParticles.bind(this)
    });
    
    // Environmental particle systems
    this.particleSystems.set('ambient', {
      particles: [],
      maxParticles: 200,
      spawn: this.createAmbientParticles.bind(this)
    });
  }
  
  /**
   * Setup post-processing pipeline
   */
  setupPostProcessing() {
    // Create off-screen canvas for post-processing
    this.postProcessCanvas = document.createElement('canvas');
    this.postProcessCanvas.width = this.canvas.width;
    this.postProcessCanvas.height = this.canvas.height;
    this.postProcessCtx = this.postProcessCanvas.getContext('2d');
  }
  
  /**
   * Bind to game events for automatic effect triggers
   */
  bindGameEvents() {
    // Listen for combat events
    window.addEventListener('playerAttack', (event) => {
      this.triggerCombatEffect('attack', event.detail);
    });
    
    window.addEventListener('playerHit', (event) => {
      this.triggerCombatEffect('hit', event.detail);
    });
    
    window.addEventListener('playerBlock', (event) => {
      this.triggerCombatEffect('block', event.detail);
    });
    
    window.addEventListener('playerRoll', (event) => {
      this.triggerCombatEffect('roll', event.detail);
    });
    
    // Listen for phase transitions
    window.addEventListener('phaseTransition', (event) => {
      this.startPhaseTransition(event.detail.from, event.detail.to);
    });
  }
  
  /**
   * Update all visual effects
   */
  update(deltaTime) {
    this.updateScreenShake(deltaTime);
    this.updateCamera(deltaTime);
    this.updateFlashEffect(deltaTime);
    this.updateSlowMotion(deltaTime);
    this.updateParticleSystems(deltaTime);
    this.updatePhaseTransition(deltaTime);
    this.updateCombatEffects(deltaTime);
    this.updateEnvironmentalEffects(deltaTime);
  }
  
  /**
   * Render all visual effects
   */
  render() {
    // Save current transform
    this.ctx.save();
    
    // Apply camera transform
    this.applyCameraTransform();
    
    // Apply screen shake
    this.applyScreenShake();
    
    // Render particle systems
    this.renderParticleSystems();
    
    // Render combat effects
    this.renderCombatEffects();
    
    // Render environmental effects
    this.renderEnvironmentalEffects();
    
    // Restore transform
    this.ctx.restore();
    
    // Apply post-processing effects
    this.applyPostProcessing();
    
    // Render UI effects (flash, phase transitions)
    this.renderUIEffects();
  }
  
  /**
   * Update screen shake
   */
  updateScreenShake(deltaTime) {
    if (this.screenShake.duration > 0) {
      this.screenShake.duration = Math.max(0, this.screenShake.duration - deltaTime);
      
      if (this.screenShake.duration > 0) {
        const time = performance.now() * 0.001;
        const intensity = this.screenShake.intensity * (this.screenShake.duration / 1000);
        
        this.screenShake.offset.x = Math.sin(time * this.screenShake.frequency) * intensity;
        this.screenShake.offset.y = Math.cos(time * this.screenShake.frequency * 1.3) * intensity;
      } else {
        this.screenShake.offset.x = 0;
        this.screenShake.offset.y = 0;
      }
    }
  }
  
  /**
   * Update camera effects
   */
  updateCamera(deltaTime) {
    // Smooth camera zoom
    const zoomDiff = this.camera.targetZoom - this.camera.zoom;
    this.camera.zoom += zoomDiff * this.camera.smoothing;
    
    // Smooth camera rotation
    const rotationDiff = this.camera.targetRotation - this.camera.rotation;
    this.camera.rotation += rotationDiff * this.camera.smoothing;
  }
  
  /**
   * Update flash effect
   */
  updateFlashEffect(deltaTime) {
    if (this.flashEffect.active) {
      this.flashEffect.duration -= deltaTime;
      
      if (this.flashEffect.duration <= 0) {
        this.flashEffect.opacity = Math.max(0, this.flashEffect.opacity - this.flashEffect.fadeSpeed * deltaTime);
        
        if (this.flashEffect.opacity <= 0) {
          this.flashEffect.active = false;
        }
      }
    }
  }
  
  /**
   * Update slow motion effect
   */
  updateSlowMotion(deltaTime) {
    if (this.slowMotion.active) {
      this.slowMotion.duration -= deltaTime;
      
      if (this.slowMotion.duration <= 0) {
        this.slowMotion.targetFactor = 1.0;
        this.slowMotion.active = false;
      }
    }
    
    // Smooth slow motion transition
    const factorDiff = this.slowMotion.targetFactor - this.slowMotion.factor;
    this.slowMotion.factor += factorDiff * this.slowMotion.smoothing;
  }
  
  /**
   * Update particle systems
   */
  updateParticleSystems(deltaTime) {
    this.particleSystems.forEach((system) => {
      // Update existing particles
      system.particles = system.particles.filter(particle => {
        particle.life -= deltaTime;
        
        if (particle.life <= 0) return false;
        
        // Update particle physics
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.vx *= particle.friction;
        particle.vy *= particle.friction;
        particle.vy += particle.gravity * deltaTime;
        
        // Update visual properties
        particle.opacity = particle.life / particle.maxLife;
        particle.scale = particle.baseScale * (1 + (1 - particle.opacity) * particle.scaleGrowth);
        
        return true;
      });
    });
  }
  
  /**
   * Update phase transition
   */
  updatePhaseTransition(deltaTime) {
    if (this.phaseTransition.active) {
      this.phaseTransition.progress += deltaTime / this.phaseTransition.duration;
      
      if (this.phaseTransition.progress >= 1) {
        this.phaseTransition.active = false;
        this.phaseTransition.progress = 1;
      }
    }
  }
  
  /**
   * Update combat effects
   */
  updateCombatEffects(deltaTime) {
    this.combatEffects = this.combatEffects.filter(effect => {
      effect.life -= deltaTime;
      
      if (effect.life <= 0) return false;
      
      // Update effect-specific properties
      if (effect.update) {
        effect.update(deltaTime);
      }
      
      return true;
    });
  }
  
  /**
   * Update environmental effects
   */
  updateEnvironmentalEffects(deltaTime) {
    // Update rain
    if (this.environmentalEffects.rain.active) {
      this.updateRainEffect(deltaTime);
    }
    
    // Update snow
    if (this.environmentalEffects.snow.active) {
      this.updateSnowEffect(deltaTime);
    }
    
    // Update fog
    if (this.environmentalEffects.fog.active) {
      this.updateFogEffect(deltaTime);
    }
  }
  
  /**
   * Apply camera transform
   */
  applyCameraTransform() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.rotate(this.camera.rotation);
    this.ctx.translate(-centerX - this.camera.x, -centerY - this.camera.y);
  }
  
  /**
   * Apply screen shake
   */
  applyScreenShake() {
    this.ctx.translate(this.screenShake.offset.x, this.screenShake.offset.y);
  }
  
  /**
   * Render particle systems
   */
  renderParticleSystems() {
    this.particleSystems.forEach((system) => {
      system.particles.forEach(particle => {
        this.ctx.save();
        
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.translate(particle.x, particle.y);
        this.ctx.scale(particle.scale, particle.scale);
        this.ctx.rotate(particle.rotation);
        
        // Render particle based on type
        switch (particle.type) {
          case 'circle':
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            break;
            
          case 'spark':
            this.ctx.strokeStyle = particle.color;
            this.ctx.lineWidth = particle.size;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(-particle.length / 2, 0);
            this.ctx.lineTo(particle.length / 2, 0);
            this.ctx.stroke();
            break;
            
          case 'star':
            this.renderStar(particle);
            break;
        }
        
        this.ctx.restore();
      });
    });
  }
  
  /**
   * Render combat effects
   */
  renderCombatEffects() {
    this.combatEffects.forEach(effect => {
      if (effect.render) {
        effect.render(this.ctx);
      }
    });
  }
  
  /**
   * Render environmental effects
   */
  renderEnvironmentalEffects() {
    // Render fog
    if (this.environmentalEffects.fog.active) {
      this.renderFogEffect();
    }
    
    // Render rain
    if (this.environmentalEffects.rain.active) {
      this.renderRainEffect();
    }
    
    // Render snow
    if (this.environmentalEffects.snow.active) {
      this.renderSnowEffect();
    }
  }
  
  /**
   * Apply post-processing effects
   */
  applyPostProcessing() {
    // Copy main canvas to post-process canvas
    this.postProcessCtx.clearRect(0, 0, this.postProcessCanvas.width, this.postProcessCanvas.height);
    this.postProcessCtx.drawImage(this.canvas, 0, 0);
    
    // Apply effects based on game state
    if (this.slowMotion.factor < 1.0) {
      this.applySlowMotionEffect();
    }
    
    // Copy back to main canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.postProcessCanvas, 0, 0);
  }
  
  /**
   * Render UI effects (overlays)
   */
  renderUIEffects() {
    // Flash effect
    if (this.flashEffect.active && this.flashEffect.opacity > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = this.flashEffect.opacity;
      this.ctx.fillStyle = this.flashEffect.color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
    
    // Phase transition
    if (this.phaseTransition.active) {
      this.renderPhaseTransition();
    }
  }
  
  /**
   * Trigger screen shake
   */
  triggerScreenShake(intensity, duration) {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    this.screenShake.duration = Math.max(this.screenShake.duration, duration);
  }
  
  /**
   * Trigger flash effect
   */
  triggerFlash(color = '#ffffff', intensity = 0.8, duration = 200) {
    this.flashEffect.active = true;
    this.flashEffect.color = color;
    this.flashEffect.opacity = intensity;
    this.flashEffect.duration = duration;
  }
  
  /**
   * Trigger slow motion effect
   */
  triggerSlowMotion(factor = 0.3, duration = 1000) {
    this.slowMotion.active = true;
    this.slowMotion.targetFactor = factor;
    this.slowMotion.duration = duration;
  }
  
  /**
   * Set camera target
   */
  setCameraTarget(x, y, zoom = 1, rotation = 0) {
    this.camera.x = x;
    this.camera.y = y;
    this.camera.targetZoom = zoom;
    this.camera.targetRotation = rotation;
  }
  
  /**
   * Trigger combat effect
   */
  triggerCombatEffect(type, data) {
    switch (type) {
      case 'attack':
        this.triggerAttackEffect(data);
        break;
      case 'hit':
        this.triggerHitEffect(data);
        break;
      case 'block':
        this.triggerBlockEffect(data);
        break;
      case 'roll':
        this.triggerRollEffect(data);
        break;
    }
  }
  
  /**
   * Trigger attack effect
   */
  triggerAttackEffect(data) {
    const { x, y, type } = data;
    
    // Screen shake based on attack type
    const shakeIntensity = type === 'heavy' ? 8 : 4;
    this.triggerScreenShake(shakeIntensity, 150);
    
    // Spawn attack particles
    this.spawnAttackParticles(x, y, type);
    
    // Camera zoom effect for heavy attacks
    if (type === 'heavy') {
      this.camera.targetZoom = 1.1;
      setTimeout(() => { this.camera.targetZoom = 1.0; }, 200);
    }
  }
  
  /**
   * Trigger hit effect
   */
  triggerHitEffect(data) {
    const { x, y, damage } = data;
    
    // Screen shake proportional to damage
    this.triggerScreenShake(damage * 0.5, 200);
    
    // Red flash
    this.triggerFlash('#ff0000', 0.3, 150);
    
    // Spawn hit particles
    this.spawnHitParticles(x, y, damage);
    
    // Brief slow motion for big hits
    if (damage > 50) {
      this.triggerSlowMotion(0.5, 300);
    }
  }
  
  /**
   * Trigger block effect
   */
  triggerBlockEffect(data) {
    const { x, y, perfect } = data;
    
    if (perfect) {
      // Perfect block effects
      this.triggerFlash('#00ffff', 0.4, 100);
      this.triggerScreenShake(3, 100);
      this.spawnBlockParticles(x, y, true);
    } else {
      // Normal block effects
      this.triggerScreenShake(2, 80);
      this.spawnBlockParticles(x, y, false);
    }
  }
  
  /**
   * Trigger roll effect
   */
  triggerRollEffect(data) {
    const { x, y } = data;
    
    // Spawn roll particles
    this.spawnRollParticles(x, y);
    
    // Brief camera rotation
    this.camera.targetRotation = 0.1;
    setTimeout(() => { this.camera.targetRotation = 0; }, 300);
  }
  
  /**
   * Start phase transition effect
   */
  startPhaseTransition(fromPhase, toPhase, type = 'fade') {
    this.phaseTransition.active = true;
    this.phaseTransition.type = type;
    this.phaseTransition.progress = 0;
    this.phaseTransition.fromPhase = fromPhase;
    this.phaseTransition.toPhase = toPhase;
    this.phaseTransition.duration = this.getTransitionDuration(fromPhase, toPhase);
  }
  
  /**
   * Spawn various particle effects
   */
  spawnHitParticles(x, y, damage) {
    const system = this.particleSystems.get('hit');
    const count = Math.min(20, Math.max(5, damage / 5));
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 100;
      
      system.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        opacity: 1,
        color: `hsl(${Math.random() * 60}, 100%, 60%)`,
        size: 2 + Math.random() * 3,
        type: 'circle',
        scale: 1,
        baseScale: 1,
        scaleGrowth: 0.5,
        rotation: Math.random() * Math.PI * 2,
        friction: 0.95,
        gravity: 200
      });
    }
  }
  
  spawnBlockParticles(x, y, perfect) {
    const system = this.particleSystems.get('block');
    const count = perfect ? 15 : 8;
    const color = perfect ? '#00ffff' : '#ffffff';
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      
      system.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        opacity: 1,
        color: color,
        size: 1 + Math.random() * 2,
        type: 'spark',
        length: 10 + Math.random() * 10,
        scale: 1,
        baseScale: 1,
        scaleGrowth: 0.2,
        rotation: angle,
        friction: 0.9,
        gravity: 0
      });
    }
  }
  
  spawnRollParticles(x, y) {
    const system = this.particleSystems.get('roll');
    
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40;
      
      system.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        opacity: 1,
        color: '#888888',
        size: 1 + Math.random() * 1.5,
        type: 'circle',
        scale: 1,
        baseScale: 1,
        scaleGrowth: 1,
        rotation: 0,
        friction: 0.98,
        gravity: 50
      });
    }
  }
  
  spawnAttackParticles(x, y, type) {
    const system = this.particleSystems.get('special');
    const count = type === 'heavy' ? 20 : 12;
    const colors = type === 'heavy' ? ['#ff4444', '#ff8844'] : ['#44ff44', '#88ff44'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      
      system.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        opacity: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2,
        type: 'star',
        scale: 1,
        baseScale: 1,
        scaleGrowth: 0.3,
        rotation: Math.random() * Math.PI * 2,
        friction: 0.92,
        gravity: 100
      });
    }
  }
  
  /**
   * Render star particle
   */
  renderStar(particle) {
    const spikes = 5;
    const outerRadius = particle.size;
    const innerRadius = outerRadius * 0.4;
    
    this.ctx.fillStyle = particle.color;
    this.ctx.beginPath();
    
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (i * Math.PI) / spikes;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    this.ctx.fill();
  }
  
  /**
   * Render phase transition
   */
  renderPhaseTransition() {
    const progress = this.phaseTransition.progress;
    
    switch (this.phaseTransition.type) {
      case 'fade':
        this.ctx.save();
        this.ctx.globalAlpha = Math.sin(progress * Math.PI);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        break;
        
      case 'wipe':
        const wipeWidth = this.canvas.width * progress;
        this.ctx.save();
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, wipeWidth, this.canvas.height);
        this.ctx.restore();
        break;
        
      case 'spiral':
        this.renderSpiralTransition(progress);
        break;
    }
  }
  
  /**
   * Get transition duration based on phases
   */
  getTransitionDuration(fromPhase, toPhase) {
    // Different phases might have different transition durations
    const durations = {
      'explore-fight': 800,
      'fight-choose': 1200,
      'choose-powerup': 600,
      'powerup-risk': 1000,
      'risk-escalate': 1500,
      'escalate-cashout': 1200,
      'cashout-reset': 800
    };
    
    const key = `${fromPhase}-${toPhase}`;
    return durations[key] || 1000;
  }
  
  /**
   * Apply slow motion post-processing effect
   */
  applySlowMotionEffect() {
    // Add motion blur or color tinting for slow motion
    const imageData = this.postProcessCtx.getImageData(0, 0, this.postProcessCanvas.width, this.postProcessCanvas.height);
    const data = imageData.data;
    
    // Tint blue for slow motion effect
    const tintStrength = (1 - this.slowMotion.factor) * 0.3;
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] *= (1 - tintStrength);     // Red
      data[i + 1] *= (1 - tintStrength); // Green
      data[i + 2] = Math.min(255, data[i + 2] * (1 + tintStrength)); // Blue
    }
    
    this.postProcessCtx.putImageData(imageData, 0, 0);
  }
  
  /**
   * Enable environmental effect
   */
  enableEnvironmentalEffect(type, options = {}) {
    switch (type) {
      case 'rain':
        this.environmentalEffects.rain.active = true;
        this.environmentalEffects.rain.intensity = options.intensity || 0.5;
        this.initRainEffect();
        break;
        
      case 'snow':
        this.environmentalEffects.snow.active = true;
        this.environmentalEffects.snow.intensity = options.intensity || 0.3;
        this.initSnowEffect();
        break;
        
      case 'fog':
        this.environmentalEffects.fog.active = true;
        this.environmentalEffects.fog.density = options.density || 0.2;
        this.environmentalEffects.fog.color = options.color || '#888888';
        break;
    }
  }
  
  /**
   * Disable environmental effect
   */
  disableEnvironmentalEffect(type) {
    if (this.environmentalEffects[type]) {
      this.environmentalEffects[type].active = false;
    }
  }
  
  /**
   * Initialize rain effect
   */
  initRainEffect() {
    const drops = this.environmentalEffects.rain.drops;
    const count = Math.floor(this.environmentalEffects.rain.intensity * 100);
    
    drops.length = 0; // Clear existing drops
    
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: 200 + Math.random() * 300,
        length: 10 + Math.random() * 20
      });
    }
  }
  
  /**
   * Update rain effect
   */
  updateRainEffect(deltaTime) {
    const drops = this.environmentalEffects.rain.drops;
    
    drops.forEach(drop => {
      drop.y += drop.speed * deltaTime;
      
      if (drop.y > this.canvas.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * this.canvas.width;
      }
    });
  }
  
  /**
   * Render rain effect
   */
  renderRainEffect() {
    const drops = this.environmentalEffects.rain.drops;
    
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.lineCap = 'round';
    
    drops.forEach(drop => {
      this.ctx.beginPath();
      this.ctx.moveTo(drop.x, drop.y);
      this.ctx.lineTo(drop.x, drop.y + drop.length);
      this.ctx.stroke();
    });
    
    this.ctx.restore();
  }
  
  /**
   * Get current effects state for debugging
   */
  getEffectsState() {
    return {
      screenShake: this.screenShake,
      camera: this.camera,
      flash: this.flashEffect,
      slowMotion: this.slowMotion,
      phaseTransition: this.phaseTransition,
      particleCounts: Object.fromEntries(
        Array.from(this.particleSystems.entries()).map(([key, system]) => [key, system.particles.length])
      ),
      environmental: this.environmentalEffects
    };
  }
  
  /**
   * Cleanup
   */
  destroy() {
    // Clear all particle systems
    this.particleSystems.clear();
    
    // Clear combat effects
    this.combatEffects.length = 0;
    
    // Reset all effects
    this.screenShake = { intensity: 0, duration: 0, frequency: 30, offset: { x: 0, y: 0 } };
    this.flashEffect.active = false;
    this.slowMotion.active = false;
    this.phaseTransition.active = false;
  }
}
