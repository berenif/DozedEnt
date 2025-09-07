import { expect } from 'chai';
import sinon from 'sinon';
import { ParticleSystem, Particle, ParticleEmitter, ParticleEffect } from '../../src/utils/particle-system.js';

describe('ParticleSystem', () => {
  describe('Particle', () => {
    let particle;

    beforeEach(() => {
      particle = new Particle({
        x: 100,
        y: 200,
        velocityX: 10,
        velocityY: -5,
        life: 1000,
        size: 5,
        color: '#ff0000',
        alpha: 1.0
      });
    });

    it('should create particle with properties', () => {
      expect(particle.x).to.equal(100);
      expect(particle.y).to.equal(200);
      expect(particle.velocityX).to.equal(10);
      expect(particle.velocityY).to.equal(-5);
      expect(particle.life).to.equal(1000);
      expect(particle.maxLife).to.equal(1000);
      expect(particle.size).to.equal(5);
      expect(particle.color).to.equal('#ff0000');
      expect(particle.alpha).to.equal(1.0);
      expect(particle.alive).to.be.true;
    });

    it('should update particle position', () => {
      particle.update(16);
      
      expect(particle.x).to.equal(100 + 10 * 16);
      expect(particle.y).to.equal(200 + (-5) * 16);
    });

    it('should update particle life', () => {
      particle.update(16);
      
      expect(particle.life).to.equal(1000 - 16);
    });

    it('should mark particle as dead when life reaches zero', () => {
      particle.life = 16;
      particle.update(16);
      
      expect(particle.life).to.equal(0);
      expect(particle.alive).to.be.false;
    });

    it('should update alpha based on life', () => {
      particle.life = 500; // Half life
      particle.update(0);
      
      expect(particle.alpha).to.equal(0.5);
    });

    it('should apply gravity', () => {
      particle.gravity = 0.5;
      particle.update(16);
      
      expect(particle.velocityY).to.equal(-5 + 0.5 * 16);
    });

    it('should apply friction', () => {
      particle.friction = 0.9;
      particle.update(16);
      
      expect(particle.velocityX).to.equal(10 * 0.9);
      expect(particle.velocityY).to.equal(-5 * 0.9);
    });

    it('should update size over time', () => {
      particle.sizeVelocity = 0.1;
      particle.update(16);
      
      expect(particle.size).to.equal(5 + 0.1 * 16);
    });

    it('should update color over time', () => {
      particle.colorVelocity = { r: 0.01, g: 0.01, b: 0.01 };
      particle.update(16);
      
      expect(particle.color).to.not.equal('#ff0000');
    });

    it('should handle rotation', () => {
      particle.rotation = 0;
      particle.rotationVelocity = Math.PI / 4; // 45 degrees per second
      
      particle.update(16);
      
      expect(particle.rotation).to.equal(Math.PI / 4 * 16);
    });

    it('should handle scale', () => {
      particle.scale = 1.0;
      particle.scaleVelocity = 0.1;
      
      particle.update(16);
      
      expect(particle.scale).to.equal(1.0 + 0.1 * 16);
    });
  });

  describe('ParticleEmitter', () => {
    let emitter;

    beforeEach(() => {
      emitter = new ParticleEmitter({
        x: 100,
        y: 200,
        rate: 10, // particles per second
        burst: 5,
        spread: Math.PI / 4,
        speed: 50,
        life: 1000,
        size: 5,
        color: '#ff0000'
      });
    });

    it('should create emitter with properties', () => {
      expect(emitter.x).to.equal(100);
      expect(emitter.y).to.equal(200);
      expect(emitter.rate).to.equal(10);
      expect(emitter.burst).to.equal(5);
      expect(emitter.spread).to.equal(Math.PI / 4);
      expect(emitter.speed).to.equal(50);
      expect(emitter.life).to.equal(1000);
      expect(emitter.size).to.equal(5);
      expect(emitter.color).to.equal('#ff0000');
      expect(emitter.active).to.be.true;
      expect(emitter.particles).to.be.an('array');
    });

    it('should emit particles continuously', () => {
      emitter.update(100); // 100ms
      
      expect(emitter.particles.length).to.be.greaterThan(0);
    });

    it('should emit burst of particles', () => {
      emitter.emitBurst();
      
      expect(emitter.particles.length).to.equal(5);
    });

    it('should emit particles with random spread', () => {
      emitter.emitBurst();
      
      emitter.particles.forEach(particle => {
        const angle = Math.atan2(particle.velocityY, particle.velocityX);
        expect(angle).to.be.at.least(-Math.PI / 8);
        expect(angle).to.be.at.most(Math.PI / 8);
      });
    });

    it('should update all particles', () => {
      emitter.emitBurst();
      const initialCount = emitter.particles.length;
      
      emitter.update(16);
      
      expect(emitter.particles.length).to.equal(initialCount);
    });

    it('should remove dead particles', () => {
      emitter.emitBurst();
      emitter.particles[0].life = 0;
      emitter.particles[0].alive = false;
      
      emitter.update(16);
      
      expect(emitter.particles.length).to.equal(4);
    });

    it('should stop emitting when inactive', () => {
      emitter.active = false;
      emitter.update(1000);
      
      expect(emitter.particles.length).to.equal(0);
    });

    it('should emit particles with custom properties', () => {
      const customProps = {
        size: 10,
        color: '#00ff00',
        life: 2000
      };
      
      emitter.emitParticle(customProps);
      
      const particle = emitter.particles[0];
      expect(particle.size).to.equal(10);
      expect(particle.color).to.equal('#00ff00');
      expect(particle.life).to.equal(2000);
    });
  });

  describe('ParticleEffect', () => {
    let effect;

    beforeEach(() => {
      effect = new ParticleEffect({
        name: 'explosion',
        emitters: [
          {
            x: 100,
            y: 200,
            rate: 20,
            burst: 10,
            spread: Math.PI * 2,
            speed: 100,
            life: 500,
            size: 3,
            color: '#ff0000'
          }
        ]
      });
    });

    it('should create effect with emitters', () => {
      expect(effect.name).to.equal('explosion');
      expect(effect.emitters).to.have.lengthOf(1);
      expect(effect.emitters[0]).to.be.instanceOf(ParticleEmitter);
    });

    it('should start effect', () => {
      effect.start();
      
      expect(effect.active).to.be.true;
      effect.emitters.forEach(emitter => {
        expect(emitter.active).to.be.true;
      });
    });

    it('should stop effect', () => {
      effect.start();
      effect.stop();
      
      expect(effect.active).to.be.false;
      effect.emitters.forEach(emitter => {
        expect(emitter.active).to.be.false;
      });
    });

    it('should update all emitters', () => {
      effect.start();
      const updateSpy = sinon.spy(effect.emitters[0], 'update');
      
      effect.update(16);
      
      expect(updateSpy.calledWith(16)).to.be.true;
    });

    it('should check if effect is finished', () => {
      effect.start();
      expect(effect.isFinished()).to.be.false;
      
      effect.emitters[0].particles = [];
      effect.emitters[0].active = false;
      
      expect(effect.isFinished()).to.be.true;
    });

    it('should get total particle count', () => {
      effect.start();
      effect.emitters[0].emitBurst();
      
      expect(effect.getParticleCount()).to.equal(10);
    });

    it('should set position of all emitters', () => {
      effect.setPosition(200, 300);
      
      effect.emitters.forEach(emitter => {
        expect(emitter.x).to.equal(200);
        expect(emitter.y).to.equal(300);
      });
    });
  });

  describe('ParticleSystem', () => {
    let system;

    beforeEach(() => {
      system = new ParticleSystem();
    });

    it('should create system with default properties', () => {
      expect(system.effects).to.be.an('object');
      expect(system.emitters).to.be.an('array');
      expect(system.particles).to.be.an('array');
      expect(system.maxParticles).to.equal(1000);
    });

    it('should add effect', () => {
      const effect = new ParticleEffect({ name: 'test' });
      system.addEffect('test', effect);
      
      expect(system.effects.test).to.equal(effect);
    });

    it('should remove effect', () => {
      const effect = new ParticleEffect({ name: 'test' });
      system.addEffect('test', effect);
      system.removeEffect('test');
      
      expect(system.effects.test).to.be.undefined;
    });

    it('should play effect', () => {
      const effect = new ParticleEffect({ name: 'test' });
      system.addEffect('test', effect);
      const startSpy = sinon.spy(effect, 'start');
      
      system.playEffect('test', 100, 200);
      
      expect(startSpy.called).to.be.true;
    });

    it('should stop effect', () => {
      const effect = new ParticleEffect({ name: 'test' });
      system.addEffect('test', effect);
      const stopSpy = sinon.spy(effect, 'stop');
      
      system.stopEffect('test');
      
      expect(stopSpy.called).to.be.true;
    });

    it('should add emitter', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      
      expect(system.emitters).to.include(emitter);
    });

    it('should remove emitter', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      system.removeEmitter(emitter);
      
      expect(system.emitters).to.not.include(emitter);
    });

    it('should update all effects and emitters', () => {
      const effect = new ParticleEffect({ name: 'test' });
      system.addEffect('test', effect);
      const effectUpdateSpy = sinon.spy(effect, 'update');
      
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      const emitterUpdateSpy = sinon.spy(emitter, 'update');
      
      system.update(16);
      
      expect(effectUpdateSpy.calledWith(16)).to.be.true;
      expect(emitterUpdateSpy.calledWith(16)).to.be.true;
    });

    it('should remove finished effects', () => {
      const effect = new ParticleEffect({ name: 'test' });
      system.addEffect('test', effect);
      effect.start();
      
      // Mark effect as finished
      effect.emitters[0].particles = [];
      effect.emitters[0].active = false;
      
      system.update(16);
      
      expect(system.effects.test).to.be.undefined;
    });

    it('should remove dead particles', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      emitter.emitBurst();
      
      // Mark first particle as dead
      emitter.particles[0].alive = false;
      
      system.update(16);
      
      expect(emitter.particles.length).to.equal(4);
    });

    it('should respect max particles limit', () => {
      system.maxParticles = 5;
      
      const emitter = new ParticleEmitter({ x: 100, y: 200, burst: 10 });
      system.addEmitter(emitter);
      emitter.emitBurst();
      
      system.update(16);
      
      expect(emitter.particles.length).to.equal(5);
    });

    it('should get total particle count', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      emitter.emitBurst();
      
      expect(system.getTotalParticleCount()).to.equal(5);
    });

    it('should clear all particles', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      emitter.emitBurst();
      
      system.clear();
      
      expect(emitter.particles.length).to.equal(0);
    });

    it('should pause and resume system', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      
      system.pause();
      expect(system.paused).to.be.true;
      
      system.resume();
      expect(system.paused).to.be.false;
    });

    it('should not update when paused', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      const updateSpy = sinon.spy(emitter, 'update');
      
      system.pause();
      system.update(16);
      
      expect(updateSpy.called).to.be.false;
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
        lineWidth: 1,
        globalAlpha: 1
      };
    });

    it('should render particle', () => {
      const particle = new Particle({
        x: 100,
        y: 200,
        size: 5,
        color: '#ff0000',
        alpha: 0.5
      });
      
      expect(() => particle.render(mockContext)).to.not.throw();
      expect(mockContext.save.called).to.be.true;
      expect(mockContext.restore.called).to.be.true;
    });

    it('should render emitter', () => {
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      emitter.emitBurst();
      
      expect(() => emitter.render(mockContext)).to.not.throw();
    });

    it('should render effect', () => {
      const effect = new ParticleEffect({ name: 'test' });
      effect.start();
      
      expect(() => effect.render(mockContext)).to.not.throw();
    });

    it('should render system', () => {
      const system = new ParticleSystem();
      const emitter = new ParticleEmitter({ x: 100, y: 200 });
      system.addEmitter(emitter);
      emitter.emitBurst();
      
      expect(() => system.render(mockContext)).to.not.throw();
    });
  });

  describe('Performance', () => {
    it('should handle many particles efficiently', () => {
      const system = new ParticleSystem();
      const emitter = new ParticleEmitter({ x: 100, y: 200, burst: 100 });
      system.addEmitter(emitter);
      emitter.emitBurst();
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        system.update(16);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 updates in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should handle many effects efficiently', () => {
      const system = new ParticleSystem();
      
      for (let i = 0; i < 10; i++) {
        const effect = new ParticleEffect({ name: `effect${i}` });
        system.addEffect(`effect${i}`, effect);
        effect.start();
      }
      
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        system.update(16);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 updates in less than 100ms
      expect(duration).to.be.lessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing effect gracefully', () => {
      const system = new ParticleSystem();
      
      expect(() => system.playEffect('nonexistent')).to.not.throw();
      expect(() => system.stopEffect('nonexistent')).to.not.throw();
    });

    it('should handle null context in rendering', () => {
      const particle = new Particle({ x: 100, y: 200 });
      
      expect(() => particle.render(null)).to.not.throw();
    });

    it('should handle invalid particle properties', () => {
      expect(() => new Particle({})).to.not.throw();
    });

    it('should handle invalid emitter properties', () => {
      expect(() => new ParticleEmitter({})).to.not.throw();
    });
  });
});
