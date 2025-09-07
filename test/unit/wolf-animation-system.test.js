import { expect } from 'chai';
import sinon from 'sinon';
import { WolfAnimationSystem } from '../../src/animation/wolf-animation.js';

describe('WolfAnimationSystem', () => {
  let animationSystem;
  let mockWasmModule;

  beforeEach(() => {
    // Create a mock WASM module
    mockWasmModule = {
      get_wolf_animation_frame: sinon.stub().returns(0),
      get_wolf_animation_time: sinon.stub().returns(0),
      get_wolf_state: sinon.stub().returns(0), // idle state
      get_wolf_x: sinon.stub().returns(0.5),
      get_wolf_y: sinon.stub().returns(0.5),
      get_wolf_velocity_x: sinon.stub().returns(0),
      get_wolf_velocity_y: sinon.stub().returns(0),
      get_wolf_facing: sinon.stub().returns(1),
      get_wolf_lunge_state: sinon.stub().returns(0),
      get_wolf_pack_formation_x: sinon.stub().returns(0),
      get_wolf_pack_formation_y: sinon.stub().returns(0),
      get_wolf_pack_formation_angle: sinon.stub().returns(0),
      get_wolf_emotion_state: sinon.stub().returns(0),
      get_wolf_ai_state: sinon.stub().returns(0),
      get_wolf_memory_count: sinon.stub().returns(0),
      get_wolf_terrain_awareness: sinon.stub().returns(0),
      get_wolf_communication_state: sinon.stub().returns(0),
      get_wolf_adaptive_difficulty: sinon.stub().returns(1.0),
      get_wolf_performance_metrics: sinon.stub().returns(0)
    };

    animationSystem = new WolfAnimationSystem();
    animationSystem.setWasmModule(mockWasmModule);
  });

  describe('Constructor', () => {
    it('should create animation system with default properties', () => {
      expect(animationSystem.animations).to.be.an('object');
      expect(animationSystem.proceduralAnimations).to.be.an('object');
      expect(animationSystem.particleEffects).to.be.an('object');
      expect(animationSystem._dt).to.equal(0);
      expect(animationSystem.wasmModule).to.equal(mockWasmModule);
    });

    it('should initialize animations', () => {
      expect(animationSystem.animations).to.have.property('idle');
      expect(animationSystem.animations).to.have.property('walk');
      expect(animationSystem.animations).to.have.property('run');
      expect(animationSystem.animations).to.have.property('attack');
      expect(animationSystem.animations).to.have.property('howl');
      expect(animationSystem.animations).to.have.property('hurt');
      expect(animationSystem.animations).to.have.property('death');
    });

    it('should initialize procedural animations', () => {
      expect(animationSystem.proceduralAnimations).to.have.property('breathing');
      expect(animationSystem.proceduralAnimations).to.have.property('tailWag');
      expect(animationSystem.proceduralAnimations).to.have.property('earTwitch');
      expect(animationSystem.proceduralAnimations).to.have.property('eyeBlink');
    });

    it('should initialize particle effects', () => {
      expect(animationSystem.particleEffects).to.have.property('footsteps');
      expect(animationSystem.particleEffects).to.have.property('breath');
      expect(animationSystem.particleEffects).to.have.property('fur');
      expect(animationSystem.particleEffects).to.have.property('blood');
    });
  });

  describe('WASM Integration', () => {
    it('should set WASM module', () => {
      const newWasmModule = { test: 'module' };
      animationSystem.setWasmModule(newWasmModule);
      expect(animationSystem.wasmModule).to.equal(newWasmModule);
    });

    it('should sync with WASM module', () => {
      animationSystem.syncWithWasm();
      expect(mockWasmModule.get_wolf_animation_frame.called).to.be.true;
      expect(mockWasmModule.get_wolf_animation_time.called).to.be.true;
      expect(mockWasmModule.get_wolf_state.called).to.be.true;
    });

    it('should handle missing WASM module gracefully', () => {
      animationSystem.setWasmModule(null);
      expect(() => animationSystem.syncWithWasm()).to.not.throw();
    });
  });

  describe('Animation Management', () => {
    it('should get animation by name', () => {
      const idleAnim = animationSystem.getAnimation('idle');
      expect(idleAnim).to.exist;
      expect(idleAnim.name).to.equal('idle');
    });

    it('should return null for non-existent animation', () => {
      const anim = animationSystem.getAnimation('nonexistent');
      expect(anim).to.be.null;
    });

    it('should play animation by name', () => {
      const spy = sinon.spy(animationSystem.animations.idle, 'play');
      animationSystem.playAnimation('idle');
      expect(spy.called).to.be.true;
    });

    it('should stop current animation', () => {
      animationSystem.playAnimation('idle');
      animationSystem.stopAnimation();
      expect(animationSystem.currentAnimation).to.be.null;
    });

    it('should pause current animation', () => {
      animationSystem.playAnimation('idle');
      animationSystem.pauseAnimation();
      expect(animationSystem.animations.idle.isPlaying).to.be.false;
    });

    it('should resume current animation', () => {
      animationSystem.playAnimation('idle');
      animationSystem.pauseAnimation();
      animationSystem.resumeAnimation();
      expect(animationSystem.animations.idle.isPlaying).to.be.true;
    });
  });

  describe('Procedural Animations', () => {
    it('should update procedural animations', () => {
      const breathingAnim = animationSystem.proceduralAnimations.breathing;
      const spy = sinon.spy(breathingAnim, 'update');
      
      animationSystem.updateProceduralAnimations(16);
      expect(spy.called).to.be.true;
    });

    it('should add procedural animation', () => {
      const updateFunc = sinon.stub();
      animationSystem.addProceduralAnimation('test', updateFunc, { duration: 1000 });
      
      expect(animationSystem.proceduralAnimations.test).to.exist;
      expect(animationSystem.proceduralAnimations.test.update).to.equal(updateFunc);
    });

    it('should remove procedural animation', () => {
      animationSystem.addProceduralAnimation('test', sinon.stub(), { duration: 1000 });
      animationSystem.removeProceduralAnimation('test');
      
      expect(animationSystem.proceduralAnimations.test).to.be.undefined;
    });
  });

  describe('Particle Effects', () => {
    it('should update particle effects', () => {
      const footstepsEffect = animationSystem.particleEffects.footsteps;
      const spy = sinon.spy(footstepsEffect, 'update');
      
      animationSystem.updateParticleEffects(16);
      expect(spy.called).to.be.true;
    });

    it('should add particle effect', () => {
      const particleSystem = { update: sinon.stub(), render: sinon.stub() };
      animationSystem.addParticleEffect('test', particleSystem);
      
      expect(animationSystem.particleEffects.test).to.equal(particleSystem);
    });

    it('should remove particle effect', () => {
      const particleSystem = { update: sinon.stub(), render: sinon.stub() };
      animationSystem.addParticleEffect('test', particleSystem);
      animationSystem.removeParticleEffect('test');
      
      expect(animationSystem.particleEffects.test).to.be.undefined;
    });

    it('should trigger particle effect', () => {
      const footstepsEffect = animationSystem.particleEffects.footsteps;
      const spy = sinon.spy(footstepsEffect, 'trigger');
      
      animationSystem.triggerParticleEffect('footsteps', { x: 100, y: 200 });
      expect(spy.calledWith({ x: 100, y: 200 })).to.be.true;
    });
  });

  describe('State-Based Animations', () => {
    it('should update animation based on wolf state', () => {
      mockWasmModule.get_wolf_state.returns(1); // walking state
      animationSystem.updateStateAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });

    it('should handle state transitions', () => {
      mockWasmModule.get_wolf_state.returns(0); // idle
      animationSystem.updateStateAnimation();
      
      mockWasmModule.get_wolf_state.returns(1); // walking
      animationSystem.updateStateAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });

    it('should handle lunge state', () => {
      mockWasmModule.get_wolf_lunge_state.returns(1); // charging
      animationSystem.updateLungeAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });

    it('should handle pack formation animations', () => {
      mockWasmModule.get_wolf_pack_formation_x.returns(50);
      mockWasmModule.get_wolf_pack_formation_y.returns(30);
      mockWasmModule.get_wolf_pack_formation_angle.returns(Math.PI / 4);
      
      animationSystem.updatePackFormationAnimation();
      expect(animationSystem.packFormationOffset.x).to.equal(50);
      expect(animationSystem.packFormationOffset.y).to.equal(30);
      expect(animationSystem.packFormationAngle).to.equal(Math.PI / 4);
    });
  });

  describe('Emotion-Based Animations', () => {
    it('should update emotion animations', () => {
      mockWasmModule.get_wolf_emotion_state.returns(1); // aggressive
      animationSystem.updateEmotionAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });

    it('should handle different emotion states', () => {
      mockWasmModule.get_wolf_emotion_state.returns(0); // neutral
      animationSystem.updateEmotionAnimation();
      
      mockWasmModule.get_wolf_emotion_state.returns(1); // aggressive
      animationSystem.updateEmotionAnimation();
      
      mockWasmModule.get_wolf_emotion_state.returns(2); // fearful
      animationSystem.updateEmotionAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });
  });

  describe('AI-Based Animations', () => {
    it('should update AI-based animations', () => {
      mockWasmModule.get_wolf_ai_state.returns(1); // hunting state
      animationSystem.updateAIAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });

    it('should handle different AI states', () => {
      mockWasmModule.get_wolf_ai_state.returns(0); // idle
      animationSystem.updateAIAnimation();
      
      mockWasmModule.get_wolf_ai_state.returns(1); // hunting
      animationSystem.updateAIAnimation();
      
      mockWasmModule.get_wolf_ai_state.returns(2); // patrolling
      animationSystem.updateAIAnimation();
      
      expect(animationSystem.currentAnimation).to.exist;
    });
  });

  describe('Memory-Based Animations', () => {
    it('should update memory-based animations', () => {
      mockWasmModule.get_wolf_memory_count.returns(5);
      animationSystem.updateMemoryAnimation();
      
      expect(animationSystem.memoryCount).to.equal(5);
    });

    it('should handle memory-based behavior changes', () => {
      mockWasmModule.get_wolf_memory_count.returns(0);
      animationSystem.updateMemoryAnimation();
      
      mockWasmModule.get_wolf_memory_count.returns(10);
      animationSystem.updateMemoryAnimation();
      
      expect(animationSystem.memoryCount).to.equal(10);
    });
  });

  describe('Terrain Awareness', () => {
    it('should update terrain-aware animations', () => {
      mockWasmModule.get_wolf_terrain_awareness.returns(1); // aware
      animationSystem.updateTerrainAwarenessAnimation();
      
      expect(animationSystem.terrainAware).to.be.true;
    });

    it('should handle different terrain awareness levels', () => {
      mockWasmModule.get_wolf_terrain_awareness.returns(0); // unaware
      animationSystem.updateTerrainAwarenessAnimation();
      
      mockWasmModule.get_wolf_terrain_awareness.returns(1); // aware
      animationSystem.updateTerrainAwarenessAnimation();
      
      mockWasmModule.get_wolf_terrain_awareness.returns(2); // highly aware
      animationSystem.updateTerrainAwarenessAnimation();
      
      expect(animationSystem.terrainAware).to.be.true;
    });
  });

  describe('Communication Animations', () => {
    it('should update communication animations', () => {
      mockWasmModule.get_wolf_communication_state.returns(1); // communicating
      animationSystem.updateCommunicationAnimation();
      
      expect(animationSystem.communicationState).to.equal(1);
    });

    it('should handle different communication states', () => {
      mockWasmModule.get_wolf_communication_state.returns(0); // silent
      animationSystem.updateCommunicationAnimation();
      
      mockWasmModule.get_wolf_communication_state.returns(1); // communicating
      animationSystem.updateCommunicationAnimation();
      
      mockWasmModule.get_wolf_communication_state.returns(2); // howling
      animationSystem.updateCommunicationAnimation();
      
      expect(animationSystem.communicationState).to.equal(2);
    });
  });

  describe('Adaptive Difficulty', () => {
    it('should update adaptive difficulty animations', () => {
      mockWasmModule.get_wolf_adaptive_difficulty.returns(1.5);
      animationSystem.updateAdaptiveDifficultyAnimation();
      
      expect(animationSystem.adaptiveDifficulty).to.equal(1.5);
    });

    it('should handle different difficulty levels', () => {
      mockWasmModule.get_wolf_adaptive_difficulty.returns(0.5); // easy
      animationSystem.updateAdaptiveDifficultyAnimation();
      
      mockWasmModule.get_wolf_adaptive_difficulty.returns(1.0); // normal
      animationSystem.updateAdaptiveDifficultyAnimation();
      
      mockWasmModule.get_wolf_adaptive_difficulty.returns(2.0); // hard
      animationSystem.updateAdaptiveDifficultyAnimation();
      
      expect(animationSystem.adaptiveDifficulty).to.equal(2.0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should update performance metrics', () => {
      mockWasmModule.get_wolf_performance_metrics.returns(100);
      animationSystem.updatePerformanceMetrics();
      
      expect(animationSystem.performanceMetrics).to.equal(100);
    });

    it('should track animation performance', () => {
      const startTime = performance.now();
      animationSystem.update(16);
      const endTime = performance.now();
      
      expect(endTime - startTime).to.be.lessThan(10); // Should be fast
    });
  });

  describe('Main Update Loop', () => {
    it('should update all systems', () => {
      const stateSpy = sinon.spy(animationSystem, 'updateStateAnimation');
      const proceduralSpy = sinon.spy(animationSystem, 'updateProceduralAnimations');
      const particleSpy = sinon.spy(animationSystem, 'updateParticleEffects');
      
      animationSystem.update(16);
      
      expect(stateSpy.called).to.be.true;
      expect(proceduralSpy.called).to.be.true;
      expect(particleSpy.called).to.be.true;
    });

    it('should sync with WASM on update', () => {
      const syncSpy = sinon.spy(animationSystem, 'syncWithWasm');
      animationSystem.update(16);
      
      expect(syncSpy.called).to.be.true;
    });

    it('should update delta time', () => {
      animationSystem.update(16);
      expect(animationSystem._dt).to.equal(16);
    });
  });

  describe('Rendering', () => {
    let mockContext;

    beforeEach(() => {
      mockContext = {
        save: sinon.stub(),
        restore: sinon.stub(),
        translate: sinon.stub(),
        rotate: sinon.stub(),
        scale: sinon.stub(),
        beginPath: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        stroke: sinon.stub(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1
      };
    });

    it('should render current animation', () => {
      animationSystem.playAnimation('idle');
      expect(() => animationSystem.render(mockContext)).to.not.throw();
    });

    it('should render procedural animations', () => {
      expect(() => animationSystem.renderProceduralAnimations(mockContext)).to.not.throw();
    });

    it('should render particle effects', () => {
      expect(() => animationSystem.renderParticleEffects(mockContext)).to.not.throw();
    });

    it('should render all systems', () => {
      animationSystem.playAnimation('idle');
      expect(() => animationSystem.renderAll(mockContext)).to.not.throw();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing WASM module gracefully', () => {
      animationSystem.setWasmModule(null);
      expect(() => animationSystem.update(16)).to.not.throw();
    });

    it('should handle WASM function errors', () => {
      mockWasmModule.get_wolf_state.throws(new Error('WASM error'));
      expect(() => animationSystem.updateStateAnimation()).to.not.throw();
    });

    it('should handle invalid animation names', () => {
      expect(() => animationSystem.playAnimation('invalid')).to.not.throw();
    });

    it('should handle null context in rendering', () => {
      expect(() => animationSystem.render(null)).to.not.throw();
    });
  });

  describe('Performance', () => {
    it('should update efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        animationSystem.update(16);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 updates in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should render efficiently', () => {
      const mockContext = {
        save: sinon.stub(),
        restore: sinon.stub(),
        translate: sinon.stub(),
        rotate: sinon.stub(),
        scale: sinon.stub(),
        beginPath: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        stroke: sinon.stub(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1
      };

      animationSystem.playAnimation('idle');
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        animationSystem.render(mockContext);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 renders in less than 50ms
      expect(duration).to.be.lessThan(50);
    });
  });
});
