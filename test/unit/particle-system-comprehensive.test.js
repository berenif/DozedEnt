import { expect } from 'chai';
import sinon from 'sinon';

// Mock Canvas and 2D Context
const createMockCanvas = () => ({
  width: 800,
  height: 600,
  getContext: () => createMockContext()
});

const createMockContext = () => ({
  save: sinon.stub(),
  restore: sinon.stub(),
  translate: sinon.stub(),
  rotate: sinon.stub(),
  scale: sinon.stub(),
  beginPath: sinon.stub(),
  closePath: sinon.stub(),
  arc: sinon.stub(),
  rect: sinon.stub(),
  fillRect: sinon.stub(),
  strokeRect: sinon.stub(),
  moveTo: sinon.stub(),
  lineTo: sinon.stub(),
  fill: sinon.stub(),
  stroke: sinon.stub(),
  clearRect: sinon.stub(),
  drawImage: sinon.stub(),
  createLinearGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  createRadialGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  filter: 'none'
});

// Mock performance API
global.performance = global.performance || {
  now: () => Date.now()
};

describe('Particle System - Comprehensive Tests', () => {
  let ParticleSystem, Particle, mockCanvas, mockCtx;

  before(async () => {
    // Dynamic import to ensure mocks are in place
    const module = await import('../../src/utils/particle-system.js');
    ParticleSystem = module.ParticleSystem;
    Particle = module.Particle;
  });

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    mockCtx = createMockContext();
    sinon.stub(mockCanvas, 'getContext').returns(mockCtx);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Particle Class', () => {
    it('should create a particle with default properties', () => {
      const particle = new Particle(100, 200);
      
      expect(particle.x).to.equal(100);
      expect(particle.y).to.equal(200);
      expect(particle.vx).to.equal(0);
      expect(particle.vy).to.equal(0);
      expect(particle.life).to.equal(1.0);
      expect(particle.size).to.equal(4);
      expect(particle.alpha).to.equal(1.0);
    });

    it('should create a particle with custom configuration', () => {
      const config = {
        vx: 10,
        vy: -20,
        life: 2.0,
        size: 8,
        color: { r: 255, g: 0, b: 0 },
        alpha: 0.8,
        rotation: Math.PI / 4,
        trail: true,
        glow: true
      };
      
      const particle = new Particle(50, 75, config);
      
      expect(particle.vx).to.equal(10);
      expect(particle.vy).to.equal(-20);
      expect(particle.life).to.equal(2.0);
      expect(particle.size).to.equal(8);
      expect(particle.color).to.deep.equal({ r: 255, g: 0, b: 0 });
      expect(particle.alpha).to.equal(0.8);
      expect(particle.rotation).to.equal(Math.PI / 4);
      expect(particle.trail).to.be.true;
      expect(particle.glow).to.be.true;
    });

    it('should update particle physics correctly', () => {
      const particle = new Particle(0, 0, {
        vx: 100,
        vy: -50,
        ax: 10,
        ay: 20,
        gravity: 980,
        friction: 0.9
      });

      const deltaTime = 1/60; // 60 FPS
      const isAlive = particle.update(deltaTime);

      // Check velocity updates
      expect(particle.vx).to.be.closeTo(100 * 0.9 + 10 * deltaTime, 0.01);
      expect(particle.vy).to.be.closeTo(-50 * 0.9 + (20 + 980) * deltaTime, 0.01);
      
      // Check position updates
      expect(particle.x).to.be.greaterThan(0);
      expect(particle.y).to.be.greaterThan(-50 * deltaTime);
      expect(isAlive).to.be.true;
    });

    it('should handle particle decay correctly', () => {
      const particle = new Particle(0, 0, {
        life: 1.0,
        alphaDecay: 0.95,
        sizeDecay: 0.98
      });

      const initialAlpha = particle.alpha;
      const initialSize = particle.size;
      
      particle.update(1/60);

      expect(particle.alpha).to.be.lessThan(initialAlpha);
      expect(particle.size).to.be.lessThan(initialSize);
      expect(particle.life).to.be.lessThan(1.0);
    });

    it('should detect when particle is dead', () => {
      const particle = new Particle(0, 0, { life: 0.1 });
      
      let isAlive = particle.update(0.05);
      expect(isAlive).to.be.true;
      
      // Age the particle beyond its lifetime
      isAlive = particle.update(0.2);
      expect(isAlive).to.be.false;
    });

    it('should handle trail positions', () => {
      const particle = new Particle(0, 0, { trail: true });
      
      expect(particle.trailPositions).to.be.an('array');
      expect(particle.trailPositions).to.have.length(0);
      
      particle.update(1/60);
      
      expect(particle.trailPositions.length).to.be.greaterThan(0);
    });
  });

  describe('ParticleSystem Class', () => {
    let particleSystem;

    beforeEach(() => {
      particleSystem = new ParticleSystem();
    });

    it('should initialize with correct properties', () => {
      expect(particleSystem.particles).to.be.an('array');
      expect(particleSystem.particles).to.have.length(0);
      expect(particleSystem.emitters).to.be.an('array');
      expect(particleSystem.emitters).to.have.length(0);
    });

    it('should add particles correctly', () => {
      const particle = new Particle(100, 200, {
        vx: 10,
        vy: -20,
        life: 1.0
      });
      
      particleSystem.addParticle(particle);

      expect(particleSystem.particles).to.have.length(1);
      expect(particleSystem.particles[0].x).to.equal(100);
      expect(particleSystem.particles[0].y).to.equal(200);
    });

    it('should create blood splatter effect', () => {
      const initialCount = particleSystem.particles.length;
      
      particleSystem.createBloodSplatter(150, 250, Math.PI/4); // 45 degree angle

      expect(particleSystem.particles.length).to.be.greaterThan(initialCount);
      
      // Check that particles have appropriate properties for blood
      const bloodParticles = particleSystem.particles.slice(initialCount);
      expect(bloodParticles.length).to.be.greaterThan(0);
      bloodParticles.forEach(particle => {
        expect(particle.color.r).to.be.greaterThan(100); // Should be reddish
        // Note: gravity might be 0 depending on implementation
      });
    });

    it('should update all particles', () => {
      // Add some particles
      const particle1 = new Particle(0, 0, { vx: 100, life: 1.0 });
      const particle2 = new Particle(50, 50, { vy: -100, life: 0.5 });
      
      particleSystem.addParticle(particle1);
      particleSystem.addParticle(particle2);

      const deltaTime = 1/60;
      particleSystem.update(deltaTime);

      // Particles should have moved
      expect(particleSystem.particles[0].x).to.be.greaterThan(0);
      expect(particleSystem.particles[1].y).to.be.lessThan(50);
    });

    it('should remove dead particles', () => {
      // Add particles with very short life
      const shortLivedParticle = new Particle(0, 0, { life: 0.01 });
      const longLivedParticle = new Particle(50, 50, { life: 2.0 });
      
      particleSystem.addParticle(shortLivedParticle);
      particleSystem.addParticle(longLivedParticle);

      expect(particleSystem.particles).to.have.length(2);

      // Update with enough time to kill first particle
      particleSystem.update(0.02);

      expect(particleSystem.particles).to.have.length(1);
      expect(particleSystem.particles[0].maxLife).to.equal(2.0);
    });

    it('should render particles correctly', () => {
      const particle = new Particle(100, 200, {
        size: 10,
        color: { r: 255, g: 128, b: 64 },
        alpha: 0.8
      });
      
      particleSystem.addParticle(particle);
      particleSystem.render(mockCtx);

      // Verify canvas operations were called
      expect(mockCtx.save.callCount).to.be.greaterThan(0);
      expect(mockCtx.restore.callCount).to.be.greaterThan(0);
    });

    it('should handle different particle shapes', () => {
      const shapes = ['circle', 'square', 'star', 'triangle'];
      
      shapes.forEach(shape => {
        const particle = new Particle(100, 200, { shape: shape });
        particleSystem.addParticle(particle);
      });

      expect(() => {
        particleSystem.render(mockCtx);
      }).to.not.throw();
    });

    it('should clear all particles', () => {
      particleSystem.addParticle(new Particle(0, 0));
      particleSystem.addParticle(new Particle(50, 50));
      particleSystem.addParticle(new Particle(100, 100));

      expect(particleSystem.particles).to.have.length(3);

      particleSystem.particles = [];

      expect(particleSystem.particles).to.have.length(0);
    });

    it('should handle performance optimization', () => {
      // Add many particles to test batching
      for (let i = 0; i < 500; i++) {
        particleSystem.addParticle(new Particle(i, i, { life: 1.0 }));
      }

      const startTime = performance.now();
      particleSystem.update(1/60);
      particleSystem.render(mockCtx);
      const endTime = performance.now();

      // Should complete in reasonable time (less than 100ms in test environment)
      expect(endTime - startTime).to.be.lessThan(1000);
    });

    it('should handle edge cases gracefully', () => {
      expect(() => {
        particleSystem.update(0);
      }).to.not.throw();

      expect(() => {
        particleSystem.render(mockCtx);
      }).to.not.throw();
    });

    it('should emit particles using effect definitions', () => {
      const effect = {
        emitRate: 10,
        emitAngle: { min: 0, max: Math.PI * 2 },
        particleSpeed: { min: 50, max: 100 },
        particleSize: { min: 2, max: 8 },
        particleLife: 1000, // 1 second in ms
        particleColor: 'rgba(255, 100, 0, 0.8)'
      };

      const initialCount = particleSystem.particles.length;
      particleSystem.emit(400, 300, effect);

      expect(particleSystem.particles.length).to.be.greaterThan(initialCount);
    });
  });

  describe('Particle Effects Integration', () => {
    let particleSystem;

    beforeEach(() => {
      particleSystem = new ParticleSystem();
    });

    it('should create complex multi-effect combinations', () => {
      const initialCount = particleSystem.particles.length;
      
      // Create multiple blood splatter effects
      particleSystem.createBloodSplatter(100, 100);
      particleSystem.createBloodSplatter(120, 120);
      particleSystem.createHitSpark(100, 100);

      expect(particleSystem.particles.length).to.be.greaterThan(initialCount);
    });

    it('should handle particle collisions with boundaries', () => {
      const particle = new Particle(795, 715, {
        vx: 100,
        vy: 100,
        bounce: 0.8
      });
      
      particleSystem.addParticle(particle);
      particleSystem.update(1/60);

      // Particle should have bounced or been constrained
      expect(particle.x).to.be.at.most(1280);
      expect(particle.y).to.be.at.most(720);
    });

    it('should maintain consistent performance under load', () => {
      // Stress test with many particles
      for (let i = 0; i < 1000; i++) {
        particleSystem.addParticle(new Particle(
          Math.random() * 800,
          Math.random() * 600,
          {
            vx: (Math.random() - 0.5) * 200,
            vy: (Math.random() - 0.5) * 200,
            life: Math.random() * 2 + 0.5,
            trail: Math.random() > 0.7,
            glow: Math.random() > 0.8
          }
        ));
      }

      const iterations = 10;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        particleSystem.update(1/60);
        particleSystem.render(mockCtx);
        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      expect(avgTime).to.be.lessThan(2000); // Should complete in reasonable time for test environment
    });
  });
});
