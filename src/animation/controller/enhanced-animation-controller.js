/**
 * Enhanced Animation Controller - Advanced animation state management
 * Features smooth transitions, IK integration, and particle effect coordination
 */

export class EnhancedAnimationController {
  constructor(visualEffectsManager, audioManager) {
    this.visualEffectsManager = visualEffectsManager;
    this.audioManager = audioManager;
    
    // Animation state machine
    this.stateMachine = {
      currentState: 'idle',
      previousState: null,
      transitionTime: 0,
      transitionDuration: 0.2,
      stateTime: 0,
      blendFactor: 0
    };
    
    // Animation states with enhanced data
    this.animationStates = {
      idle: {
        loops: true,
        duration: 2.0,
        transitions: ['moving', 'attacking', 'blocking', 'rolling', 'hurt'],
        effects: {
          particles: null,
          sound: null,
          camera: null
        },
        ik: {
          enabled: false
        }
      },
      moving: {
        loops: true,
        duration: 0.6,
        transitions: ['idle', 'attacking', 'blocking', 'rolling', 'hurt'],
        effects: {
          particles: 'dust',
          sound: 'footsteps',
          camera: null
        },
        ik: {
          enabled: true,
          footPlacement: true
        }
      },
      attacking: {
        loops: false,
        duration: 0.4,
        transitions: ['idle', 'moving', 'combo'],
        effects: {
          particles: 'attack_trail',
          sound: 'sword_swing',
          camera: 'attack_zoom'
        },
        ik: {
          enabled: true,
          weaponTracking: true
        },
        subStates: {
          windup: { duration: 0.1, frame: [0, 0.25] },
          active: { duration: 0.15, frame: [0.25, 0.625] },
          recovery: { duration: 0.15, frame: [0.625, 1.0] }
        }
      },
      heavyAttacking: {
        loops: false,
        duration: 0.6,
        transitions: ['idle', 'moving'],
        effects: {
          particles: 'heavy_attack_trail',
          sound: 'heavy_swing',
          camera: 'heavy_attack_zoom'
        },
        ik: {
          enabled: true,
          weaponTracking: true,
          anticipation: true
        },
        subStates: {
          anticipation: { duration: 0.15, frame: [0, 0.25] },
          windup: { duration: 0.15, frame: [0.25, 0.5] },
          active: { duration: 0.2, frame: [0.5, 0.8] },
          recovery: { duration: 0.1, frame: [0.8, 1.0] }
        }
      },
      specialAttacking: {
        loops: false,
        duration: 0.8,
        transitions: ['idle', 'moving'],
        effects: {
          particles: 'special_aura',
          sound: 'special_charge',
          camera: 'special_zoom'
        },
        ik: {
          enabled: true,
          fullBody: true,
          specialPose: true
        },
        subStates: {
          charge: { duration: 0.3, frame: [0, 0.375] },
          release: { duration: 0.3, frame: [0.375, 0.75] },
          recovery: { duration: 0.2, frame: [0.75, 1.0] }
        }
      },
      blocking: {
        loops: true,
        duration: 1.0,
        transitions: ['idle', 'moving', 'parrying', 'hurt'],
        effects: {
          particles: null,
          sound: null,
          camera: null
        },
        ik: {
          enabled: true,
          defensivePose: true
        }
      },
      parrying: {
        loops: false,
        duration: 0.3,
        transitions: ['idle', 'moving', 'attacking'],
        effects: {
          particles: 'parry_spark',
          sound: 'parry',
          camera: 'parry_flash'
        },
        ik: {
          enabled: true,
          perfectTiming: true
        }
      },
      rolling: {
        loops: false,
        duration: 0.5,
        transitions: ['idle', 'moving'],
        effects: {
          particles: 'roll_dust',
          sound: 'roll',
          camera: 'roll_follow'
        },
        ik: {
          enabled: false // Disable IK during roll
        },
        subStates: {
          startup: { duration: 0.1, frame: [0, 0.2] },
          active: { duration: 0.3, frame: [0.2, 0.8] },
          recovery: { duration: 0.1, frame: [0.8, 1.0] }
        }
      },
      hurt: {
        loops: false,
        duration: 0.4,
        transitions: ['idle', 'moving', 'dead'],
        effects: {
          particles: 'blood_spray',
          sound: 'hurt_grunt',
          camera: 'hurt_shake'
        },
        ik: {
          enabled: false
        }
      },
      dead: {
        loops: false,
        duration: 2.0,
        transitions: [],
        effects: {
          particles: 'death_effect',
          sound: 'death_sound',
          camera: 'death_zoom'
        },
        ik: {
          enabled: false
        }
      }
    };
    
    // IK System
    this.ikSystem = {
      enabled: true,
      chains: {
        leftArm: {
          joints: ['shoulder_l', 'elbow_l', 'wrist_l'],
          target: { x: 0, y: 0, z: 0 },
          enabled: false
        },
        rightArm: {
          joints: ['shoulder_r', 'elbow_r', 'wrist_r'],
          target: { x: 0, y: 0, z: 0 },
          enabled: false
        },
        leftLeg: {
          joints: ['hip_l', 'knee_l', 'ankle_l'],
          target: { x: 0, y: 0, z: 0 },
          enabled: false
        },
        rightLeg: {
          joints: ['hip_r', 'knee_r', 'ankle_r'],
          target: { x: 0, y: 0, z: 0 },
          enabled: false
        }
      },
      constraints: {
        maxIterations: 10,
        tolerance: 0.01,
        damping: 0.1
      }
    };
    
    // Animation blending
    this.blendTree = {
      layers: new Map(),
      weights: new Map(),
      masks: new Map()
    };
    
    // Event system
    this.eventCallbacks = new Map();
    
    // Performance tracking
    this.performance = {
      frameTime: 0,
      ikTime: 0,
      blendTime: 0,
      effectsTime: 0
    };
    
    this.init();
  }
  
  /**
   * Initialize animation controller
   */
  init() {
    this.setupBlendTree();
    this.setupEventHandlers();
    this.initializeIK();
  }
  
  /**
   * Setup animation blend tree
   */
  setupBlendTree() {
    // Create blend layers for different animation types
    this.blendTree.layers.set('base', {
      weight: 1.0,
      animations: new Map(),
      mask: null
    });
    
    this.blendTree.layers.set('upper_body', {
      weight: 0.0,
      animations: new Map(),
      mask: 'upper_body_mask'
    });
    
    this.blendTree.layers.set('additive', {
      weight: 0.0,
      animations: new Map(),
      mask: null,
      blendMode: 'additive'
    });
  }
  
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Animation event types
    this.eventCallbacks.set('stateEnter', []);
    this.eventCallbacks.set('stateExit', []);
    this.eventCallbacks.set('animationEvent', []);
    this.eventCallbacks.set('hitFrame', []);
    this.eventCallbacks.set('footstep', []);
  }
  
  /**
   * Initialize IK system
   */
  initializeIK() {
    // Setup IK chain constraints
    Object.values(this.ikSystem.chains).forEach(chain => {
      chain.originalPositions = chain.joints.map(() => ({ x: 0, y: 0, z: 0 }));
      chain.currentPositions = chain.joints.map(() => ({ x: 0, y: 0, z: 0 }));
    });
  }
  
  /**
   * Update animation system
   */
  update(deltaTime, gameState) {
    const startTime = performance.now();
    
    // Update state machine
    this.updateStateMachine(deltaTime, gameState);
    
    // Update animation blending
    this.updateBlending(deltaTime);
    
    // Update IK system
    if (this.ikSystem.enabled) {
      this.updateIK(deltaTime, gameState);
    }
    
    // Update effects coordination
    this.updateEffectsCoordination(deltaTime);
    
    // Track performance
    this.performance.frameTime = performance.now() - startTime;
  }
  
  /**
   * Update animation state machine
   */
  updateStateMachine(deltaTime, gameState) {
    const currentStateData = this.animationStates[this.stateMachine.currentState];
    
    // Update state time
    this.stateMachine.stateTime += deltaTime;
    
    // Handle state transitions
    if (this.stateMachine.transitionTime > 0) {
      this.stateMachine.transitionTime -= deltaTime;
      this.stateMachine.blendFactor = 1 - (this.stateMachine.transitionTime / this.stateMachine.transitionDuration);
      
      if (this.stateMachine.transitionTime <= 0) {
        this.completeTransition();
      }
    }
    
    // Check for automatic state transitions
    this.checkAutomaticTransitions(gameState);
    
    // Update sub-states
    if (currentStateData.subStates) {
      this.updateSubStates(deltaTime, currentStateData);
    }
    
    // Trigger animation events
    this.checkAnimationEvents(currentStateData, deltaTime);
  }
  
  /**
   * Update animation blending
   */
  updateBlending(deltaTime) {
    const startTime = performance.now();
    
    // Update blend weights
    this.blendTree.layers.forEach((layer) => {
      layer.animations.forEach((animation) => {
        // Smooth weight transitions
        const targetWeight = animation.targetWeight || 0;
        const weightDiff = targetWeight - animation.weight;
        animation.weight += weightDiff * animation.blendSpeed * deltaTime;
      });
    });
    
    this.performance.blendTime = performance.now() - startTime;
  }
  
  /**
   * Update IK system
   */
  updateIK(deltaTime, gameState) {
    const startTime = performance.now();
    
    const currentStateData = this.animationStates[this.stateMachine.currentState];
    const ikConfig = currentStateData.ik;
    
    if (!ikConfig.enabled) {
      this.performance.ikTime = performance.now() - startTime;
      return;
    }
    
    // Update IK targets based on state
    this.updateIKTargets(gameState, ikConfig);
    
    // Solve IK chains
    Object.entries(this.ikSystem.chains).forEach(([, chain]) => {
      if (chain.enabled) {
        this.solveIKChain(chain);
      }
    });
    
    this.performance.ikTime = performance.now() - startTime;
  }
  
  /**
   * Update effects coordination
   */
  updateEffectsCoordination() {
    const startTime = performance.now();
    
    const currentStateData = this.animationStates[this.stateMachine.currentState];
    const effects = currentStateData.effects;
    
    // Coordinate particle effects
    if (effects.particles && this.visualEffectsManager) {
      this.coordinateParticleEffects(effects.particles);
    }
    
    // Coordinate audio effects
    if (effects.sound && this.audioManager) {
      this.coordinateAudioEffects(effects.sound);
    }
    
    // Coordinate camera effects
    if (effects.camera && this.visualEffectsManager) {
      this.coordinateCameraEffects(effects.camera);
    }
    
    this.performance.effectsTime = performance.now() - startTime;
  }
  
  /**
   * Transition to new animation state
   */
  transitionToState(newState, transitionDuration = null) {
    if (newState === this.stateMachine.currentState) {return;}
    
    const currentStateData = this.animationStates[this.stateMachine.currentState];
    const newStateData = this.animationStates[newState];
    
    if (!newStateData) {
      console.warn(`Animation state '${newState}' not found`);
      return;
    }
    
    // Check if transition is allowed
    if (!currentStateData.transitions.includes(newState)) {
      console.warn(`Transition from '${this.stateMachine.currentState}' to '${newState}' not allowed`);
      return;
    }
    
    // Trigger state exit event
    this.triggerEvent('stateExit', {
      state: this.stateMachine.currentState,
      stateTime: this.stateMachine.stateTime
    });
    
    // Setup transition
    this.stateMachine.previousState = this.stateMachine.currentState;
    this.stateMachine.currentState = newState;
    this.stateMachine.transitionDuration = transitionDuration || this.stateMachine.transitionDuration;
    this.stateMachine.transitionTime = this.stateMachine.transitionDuration;
    this.stateMachine.stateTime = 0;
    this.stateMachine.blendFactor = 0;
    
    // Trigger state enter event
    this.triggerEvent('stateEnter', {
      state: newState,
      previousState: this.stateMachine.previousState
    });
    
    // Setup state-specific effects
    this.setupStateEffects(newStateData);
  }
  
  /**
   * Complete state transition
   */
  completeTransition() {
    this.stateMachine.transitionTime = 0;
    this.stateMachine.blendFactor = 1;
    this.stateMachine.previousState = null;
  }
  
  /**
   * Check for automatic state transitions
   */
  checkAutomaticTransitions(gameState) {
    const currentStateData = this.animationStates[this.stateMachine.currentState];
    
    // Check for state completion (non-looping animations)
    if (!currentStateData.loops && this.stateMachine.stateTime >= currentStateData.duration) {
      // Transition to appropriate next state
      switch (this.stateMachine.currentState) {
        case 'attacking':
        case 'heavyAttacking':
        case 'specialAttacking':
          this.transitionToState(gameState.isMoving ? 'moving' : 'idle');
          break;
        case 'rolling':
          this.transitionToState(gameState.isMoving ? 'moving' : 'idle');
          break;
        case 'hurt':
          if (gameState.health <= 0) {
            this.transitionToState('dead');
          } else {
            this.transitionToState('idle');
          }
          break;
        case 'parrying':
          this.transitionToState('idle');
          break;
      }
    }
  }
  
  /**
   * Update sub-states within main states
   */
  updateSubStates(deltaTime, stateData) {
    const normalizedTime = this.stateMachine.stateTime / stateData.duration;
    
    Object.entries(stateData.subStates).forEach(([subStateName, subStateData]) => {
      const [startFrame, endFrame] = subStateData.frame;
      
      if (normalizedTime >= startFrame && normalizedTime <= endFrame) {
        // Trigger sub-state specific events
        this.triggerEvent('subStateActive', {
          state: this.stateMachine.currentState,
          subState: subStateName,
          normalizedTime: (normalizedTime - startFrame) / (endFrame - startFrame)
        });
      }
    });
  }
  
  /**
   * Check for animation events at specific frames
   */
  checkAnimationEvents(stateData, deltaTime) {
    // Calculate normalized time for frame events
    
    // Define frame events for different states
    const frameEvents = {
      attacking: [
        { frame: 0.4, event: 'hitFrame', data: { type: 'light' } },
        { frame: 0.1, event: 'footstep', data: { foot: 'right' } }
      ],
      heavyAttacking: [
        { frame: 0.6, event: 'hitFrame', data: { type: 'heavy' } },
        { frame: 0.2, event: 'footstep', data: { foot: 'left' } }
      ],
      moving: [
        { frame: 0.25, event: 'footstep', data: { foot: 'left' } },
        { frame: 0.75, event: 'footstep', data: { foot: 'right' } }
      ]
    };
    
    const events = frameEvents[this.stateMachine.currentState];
    if (events) {
      events.forEach(eventData => {
        const frameTime = eventData.frame * stateData.duration;
        // Check if we crossed the frame time since last update
        
        if (this.stateMachine.stateTime >= frameTime && 
            this.stateMachine.stateTime - deltaTime < frameTime) {
          this.triggerEvent(eventData.event, eventData.data);
        }
      });
    }
  }
  
  /**
   * Update IK targets based on game state
   */
  updateIKTargets(gameState, ikConfig) {
    // Weapon tracking for combat states
    if (ikConfig.weaponTracking && gameState.weapon) {
      this.ikSystem.chains.rightArm.target = gameState.weapon.targetPosition;
      this.ikSystem.chains.rightArm.enabled = true;
    }
    
    // Foot placement for moving states
    if (ikConfig.footPlacement) {
      // Ground adaptation
      this.ikSystem.chains.leftLeg.target.y = gameState.groundHeight?.left || 0;
      this.ikSystem.chains.rightLeg.target.y = gameState.groundHeight?.right || 0;
      this.ikSystem.chains.leftLeg.enabled = true;
      this.ikSystem.chains.rightLeg.enabled = true;
    }
    
    // Defensive pose for blocking
    if (ikConfig.defensivePose) {
      this.ikSystem.chains.leftArm.target = gameState.blockDirection || { x: 0, y: 1, z: 0.5 };
      this.ikSystem.chains.leftArm.enabled = true;
    }
  }
  
  /**
   * Solve IK chain using FABRIK algorithm
   */
  solveIKChain(chain) {
    const { joints, target, currentPositions } = chain;
    const { maxIterations, tolerance } = this.ikSystem.constraints;
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      // Forward pass
      currentPositions[currentPositions.length - 1] = { ...target };
      
      for (let i = currentPositions.length - 2; i >= 0; i--) {
        const direction = this.normalize(this.subtract(currentPositions[i], currentPositions[i + 1]));
        const distance = this.getJointDistance(joints[i], joints[i + 1]);
        currentPositions[i] = this.add(currentPositions[i + 1], this.scale(direction, distance));
      }
      
      // Backward pass
      currentPositions[0] = { ...chain.originalPositions[0] };
      
      for (let i = 1; i < currentPositions.length; i++) {
        const direction = this.normalize(this.subtract(currentPositions[i], currentPositions[i - 1]));
        const distance = this.getJointDistance(joints[i - 1], joints[i]);
        currentPositions[i] = this.add(currentPositions[i - 1], this.scale(direction, distance));
      }
      
      // Check convergence
      const endEffectorDistance = this.distance(currentPositions[currentPositions.length - 1], target);
      if (endEffectorDistance < tolerance) {
        break;
      }
    }
  }
  
  /**
   * Setup state-specific effects
   */
  setupStateEffects(stateData) {
    const effects = stateData.effects;
    
    // Setup particle effects
    if (effects.particles && this.visualEffectsManager) {
      this.visualEffectsManager.enableEffect(effects.particles);
    }
    
    // Setup audio effects
    if (effects.sound && this.audioManager) {
      this.audioManager.playStateAudio(effects.sound);
    }
    
    // Setup camera effects
    if (effects.camera && this.visualEffectsManager) {
      this.visualEffectsManager.applyCameraEffect(effects.camera);
    }
  }
  
  /**
   * Coordinate particle effects with animation
   */
  coordinateParticleEffects(particleType) {
    const normalizedTime = this.stateMachine.stateTime / this.animationStates[this.stateMachine.currentState].duration;
    
    switch (particleType) {
      case 'attack_trail':
        if (normalizedTime >= 0.2 && normalizedTime <= 0.7) {
          this.visualEffectsManager.spawnAttackTrail();
        }
        break;
      case 'dust':
        if (this.stateMachine.currentState === 'moving') {
          this.visualEffectsManager.spawnMovementDust();
        }
        break;
      case 'roll_dust':
        if (normalizedTime >= 0.1 && normalizedTime <= 0.9) {
          this.visualEffectsManager.spawnRollDust();
        }
        break;
    }
  }
  
  /**
   * Coordinate audio effects with animation
   */
  coordinateAudioEffects() {
    // Audio coordination is handled by the enhanced audio manager
    // This method can trigger specific timing-based audio events
  }
  
  /**
   * Coordinate camera effects with animation
   */
  coordinateCameraEffects(cameraType) {
    const normalizedTime = this.stateMachine.stateTime / this.animationStates[this.stateMachine.currentState].duration;
    
    switch (cameraType) {
      case 'attack_zoom':
        if (normalizedTime >= 0.2 && normalizedTime <= 0.4) {
          this.visualEffectsManager.setCameraZoom(1.1);
        }
        break;
      case 'heavy_attack_zoom':
        if (normalizedTime >= 0.3 && normalizedTime <= 0.6) {
          this.visualEffectsManager.setCameraZoom(1.2);
        }
        break;
    }
  }
  
  /**
   * Add event listener
   */
  addEventListener(eventType, callback) {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType).push(callback);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(eventType, callback) {
    if (this.eventCallbacks.has(eventType)) {
      const callbacks = this.eventCallbacks.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  /**
   * Trigger animation event
   */
  triggerEvent(eventType, data) {
    if (this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in animation event callback:`, error);
        }
      });
    }
  }
  
  /**
   * Vector math utilities
   */
  add(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z };
  }
  
  subtract(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y, z: v1.z - v2.z };
  }
  
  scale(v, s) {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  }
  
  normalize(v) {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return length > 0 ? { x: v.x / length, y: v.y / length, z: v.z / length } : { x: 0, y: 0, z: 0 };
  }
  
  distance(v1, v2) {
    const diff = this.subtract(v1, v2);
    return Math.sqrt(diff.x * diff.x + diff.y * diff.y + diff.z * diff.z);
  }
  
  getJointDistance(joint1, joint2) {
    // Return predefined joint distances
    const jointDistances = {
      'shoulder_l-elbow_l': 25,
      'elbow_l-wrist_l': 20,
      'shoulder_r-elbow_r': 25,
      'elbow_r-wrist_r': 20,
      'hip_l-knee_l': 30,
      'knee_l-ankle_l': 28,
      'hip_r-knee_r': 30,
      'knee_r-ankle_r': 28
    };
    
    return jointDistances[`${joint1}-${joint2}`] || 20;
  }
  
  /**
   * Get current animation state
   */
  getCurrentState() {
    return {
      state: this.stateMachine.currentState,
      stateTime: this.stateMachine.stateTime,
      blendFactor: this.stateMachine.blendFactor,
      isTransitioning: this.stateMachine.transitionTime > 0
    };
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performance };
  }
  
  /**
   * Force state change (for debugging)
   */
  forceState(stateName) {
    if (this.animationStates[stateName]) {
      this.stateMachine.currentState = stateName;
      this.stateMachine.stateTime = 0;
      this.stateMachine.transitionTime = 0;
      this.stateMachine.blendFactor = 1;
    }
  }
  
  /**
   * Cleanup
   */
  destroy() {
    // Clear all event callbacks
    this.eventCallbacks.clear();
    
    // Clear blend tree
    this.blendTree.layers.clear();
    this.blendTree.weights.clear();
    this.blendTree.masks.clear();
    
    // Reset state machine
    this.stateMachine.currentState = 'idle';
    this.stateMachine.stateTime = 0;
  }
}
