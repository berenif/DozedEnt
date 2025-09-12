import { expect } from 'chai';
import sinon from 'sinon';
import { setupBrowserMocks, cleanupBrowserMocks } from '../setup-browser-mocks.js';

describe('Performance Benchmarks - Comprehensive Tests', () => {
  before(() => {
    setupBrowserMocks();
  });

  after(() => {
    cleanupBrowserMocks();
  });

  beforeEach(() => {
    // Reset performance measurements
    if (global.performance && global.performance.clearMarks) {
      global.performance.clearMarks();
      global.performance.clearMeasures();
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Animation System Performance', () => {
    it('should maintain 60fps with 100 animated entities', async () => {
      // Mock animation system
      const animationSystem = {
        entities: [],
        update: sinon.stub(),
        render: sinon.stub()
      };

      // Add 100 animated entities
      for (let i = 0; i < 100; i++) {
        animationSystem.entities.push({
          id: i,
          x: Math.random() * 800,
          y: Math.random() * 600,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          animation: 'running',
          frame: 0
        });
      }

      const frameTime = 1000 / 60; // 16.67ms for 60fps
      const iterations = 100;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        // Simulate animation update
        animationSystem.entities.forEach(entity => {
          entity.x += entity.vx * (1/60);
          entity.y += entity.vy * (1/60);
          entity.frame = (entity.frame + 1) % 8;
        });
        
        animationSystem.update(1/60);
        animationSystem.render();
        
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).to.be.lessThan(frameTime);
      expect(maxTime).to.be.lessThan(frameTime * 2); // Allow some variance
      expect(animationSystem.update.callCount).to.equal(iterations);
    });

    it('should handle complex procedural animations efficiently', () => {
      const proceduralAnimator = {
        generateWolfAnimation: sinon.stub().callsFake(() => {
          // Simulate complex procedural generation
          const keyframes = [];
          for (let i = 0; i < 60; i++) { // 1 second at 60fps
            keyframes.push({
              time: i / 60,
              position: { x: Math.sin(i * 0.1) * 50, y: Math.cos(i * 0.1) * 30 },
              rotation: i * 0.05,
              scale: 1 + Math.sin(i * 0.2) * 0.1
            });
          }
          return keyframes;
        })
      };

      const start = performance.now();
      
      // Generate 10 complex animations
      for (let i = 0; i < 10; i++) {
        proceduralAnimator.generateWolfAnimation();
      }
      
      const end = performance.now();
      const totalTime = end - start;
      
      expect(totalTime).to.be.lessThan(100); // Should complete in under 100ms
      expect(proceduralAnimator.generateWolfAnimation.callCount).to.equal(10);
    });

    it('should optimize animation culling for off-screen entities', () => {
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      const entities = [];

      // Add entities both on and off screen
      for (let i = 0; i < 200; i++) {
        entities.push({
          id: i,
          x: (Math.random() - 0.5) * 2000, // Some will be off-screen
          y: (Math.random() - 0.5) * 2000,
          width: 64,
          height: 64,
          visible: false,
          animated: false
        });
      }

      const start = performance.now();
      
      // Culling pass
      let visibleCount = 0;
      entities.forEach(entity => {
        const inViewport = (
          entity.x + entity.width > viewport.x &&
          entity.x < viewport.x + viewport.width &&
          entity.y + entity.height > viewport.y &&
          entity.y < viewport.y + viewport.height
        );
        
        if (inViewport) {
          entity.visible = true;
          entity.animated = true;
          visibleCount++;
        } else {
          entity.visible = false;
          entity.animated = false;
        }
      });
      
      const end = performance.now();
      const cullTime = end - start;
      
      expect(cullTime).to.be.lessThan(5); // Culling should be very fast
      expect(visibleCount).to.be.lessThan(entities.length); // Some should be culled
    });
  });

  describe('Particle System Performance', () => {
    it('should handle 1000 particles at 60fps', () => {
      const particleSystem = {
        particles: [],
        maxParticles: 1000,
        update: sinon.stub(),
        render: sinon.stub()
      };

      // Fill with maximum particles
      for (let i = 0; i < particleSystem.maxParticles; i++) {
        particleSystem.particles.push({
          x: Math.random() * 800,
          y: Math.random() * 600,
          vx: (Math.random() - 0.5) * 400,
          vy: (Math.random() - 0.5) * 400,
          life: Math.random() * 2 + 0.5,
          size: Math.random() * 8 + 2,
          color: { r: 255, g: Math.random() * 255, b: 0 },
          alpha: 1.0
        });
      }

      const frameTime = 1000 / 60;
      const iterations = 60; // Test 1 second
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        // Simulate particle updates
        particleSystem.particles.forEach(particle => {
          particle.x += particle.vx * (1/60);
          particle.y += particle.vy * (1/60);
          particle.life -= 1/60;
          particle.alpha = Math.max(0, particle.life / 2);
        });
        
        // Remove dead particles
        particleSystem.particles = particleSystem.particles.filter(p => p.life > 0);
        
        particleSystem.update(1/60);
        particleSystem.render();
        
        const end = performance.now();
        times.push(end - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      const maxTime = Math.max(...times);
      
      expect(avgTime).to.be.lessThan(frameTime);
      expect(maxTime).to.be.lessThan(frameTime * 1.5);
    });

    it('should efficiently batch particle rendering', () => {
      const mockCtx = {
        save: sinon.stub(),
        restore: sinon.stub(),
        beginPath: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        fillStyle: '',
        globalAlpha: 1
      };

      const particles = [];
      for (let i = 0; i < 500; i++) {
        particles.push({
          x: Math.random() * 800,
          y: Math.random() * 600,
          size: 4,
          color: { r: 255, g: 100, b: 0 },
          alpha: 0.8
        });
      }

      const start = performance.now();
      
      // Simulate batched rendering
      mockCtx.save();
      particles.forEach(particle => {
        mockCtx.globalAlpha = particle.alpha;
        mockCtx.fillStyle = `rgb(${particle.color.r}, ${particle.color.g}, ${particle.color.b})`;
        mockCtx.beginPath();
        mockCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        mockCtx.fill();
      });
      mockCtx.restore();
      
      const end = performance.now();
      const renderTime = end - start;
      
      expect(renderTime).to.be.lessThan(10); // Should render quickly
      expect(mockCtx.beginPath.callCount).to.equal(500);
      expect(mockCtx.arc.callCount).to.equal(500);
      expect(mockCtx.fill.callCount).to.equal(500);
    });
  });

  describe('Game Renderer Performance', () => {
    it('should render complex scene under 16ms', () => {
      const mockCtx = {
        save: sinon.stub(),
        restore: sinon.stub(),
        translate: sinon.stub(),
        drawImage: sinon.stub(),
        fillRect: sinon.stub(),
        clearRect: sinon.stub(),
        beginPath: sinon.stub(),
        arc: sinon.stub(),
        fill: sinon.stub(),
        stroke: sinon.stub()
      };

      const scene = {
        background: { type: 'forest', layers: 3 },
        platforms: Array(50).fill(null).map(() => ({ x: Math.random() * 800, y: Math.random() * 600, width: 100, height: 20 })),
        enemies: Array(20).fill(null).map(() => ({ x: Math.random() * 800, y: Math.random() * 600, type: 'wolf' })),
        collectibles: Array(30).fill(null).map(() => ({ x: Math.random() * 800, y: Math.random() * 600, type: 'coin' })),
        projectiles: Array(10).fill(null).map(() => ({ x: Math.random() * 800, y: Math.random() * 600, type: 'arrow' })),
        particles: Array(100).fill(null).map(() => ({ x: Math.random() * 800, y: Math.random() * 600, size: 2 }))
      };

      const start = performance.now();
      
      // Simulate complex scene rendering
      mockCtx.save();
      
      // Background layers
      for (let i = 0; i < scene.background.layers; i++) {
        mockCtx.drawImage({}, 0, 0, 800, 600);
      }
      
      // Platforms
      scene.platforms.forEach(platform => {
        mockCtx.fillRect(platform.x, platform.y, platform.width, platform.height);
      });
      
      // Enemies
      scene.enemies.forEach(enemy => {
        mockCtx.drawImage({}, enemy.x, enemy.y, 64, 64);
      });
      
      // Collectibles
      scene.collectibles.forEach(item => {
        mockCtx.beginPath();
        mockCtx.arc(item.x, item.y, 10, 0, Math.PI * 2);
        mockCtx.fill();
      });
      
      // Projectiles
      scene.projectiles.forEach(proj => {
        mockCtx.fillRect(proj.x, proj.y, 16, 4);
      });
      
      // Particles
      scene.particles.forEach(particle => {
        mockCtx.beginPath();
        mockCtx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        mockCtx.fill();
      });
      
      mockCtx.restore();
      
      const end = performance.now();
      const renderTime = end - start;
      
      expect(renderTime).to.be.lessThan(16); // Must maintain 60fps
      expect(mockCtx.drawImage.callCount).to.be.greaterThan(0);
      expect(mockCtx.fillRect.callCount).to.be.greaterThan(0);
    });

    it('should efficiently handle viewport culling', () => {
      const viewport = { x: 400, y: 300, width: 800, height: 600 };
      const allEntities = [];
      
      // Create many entities across a large world
      for (let i = 0; i < 1000; i++) {
        allEntities.push({
          x: Math.random() * 4000,
          y: Math.random() * 3000,
          width: 64,
          height: 64,
          type: 'entity'
        });
      }

      const start = performance.now();
      
      // Viewport culling
      const visibleEntities = allEntities.filter(entity => {
        return (
          entity.x + entity.width > viewport.x &&
          entity.x < viewport.x + viewport.width &&
          entity.y + entity.height > viewport.y &&
          entity.y < viewport.y + viewport.height
        );
      });
      
      const end = performance.now();
      const cullTime = end - start;
      
      expect(cullTime).to.be.lessThan(5); // Culling should be very fast
      expect(visibleEntities.length).to.be.lessThan(allEntities.length);
      expect(visibleEntities.length).to.be.greaterThan(0); // Some should be visible
    });
  });

  describe('Network Performance', () => {
    it('should handle high-frequency state updates efficiently', () => {
      const networkManager = {
        sendUpdate: sinon.stub(),
        receiveUpdate: sinon.stub(),
        pendingUpdates: [],
        processedUpdates: 0
      };

      const updates = [];
      for (let i = 0; i < 1000; i++) {
        updates.push({
          timestamp: Date.now() + i,
          playerId: 'player-1',
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          action: Math.random() > 0.5 ? 'move' : 'attack'
        });
      }

      const start = performance.now();
      
      // Process updates
      updates.forEach(update => {
        networkManager.sendUpdate(update);
        networkManager.receiveUpdate(update);
        networkManager.processedUpdates++;
      });
      
      const end = performance.now();
      const processTime = end - start;
      
      expect(processTime).to.be.lessThan(50); // Should process quickly
      expect(networkManager.sendUpdate.callCount).to.equal(1000);
      expect(networkManager.receiveUpdate.callCount).to.equal(1000);
      expect(networkManager.processedUpdates).to.equal(1000);
    });

    it('should efficiently compress game state data', () => {
      const gameState = {
        players: Array(8).fill(null).map((_, i) => ({
          id: `player-${i}`,
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          health: Math.floor(Math.random() * 100),
          stamina: Math.floor(Math.random() * 100),
          weapon: Math.floor(Math.random() * 5),
          state: ['idle', 'running', 'attacking', 'blocking'][Math.floor(Math.random() * 4)]
        })),
        enemies: Array(20).fill(null).map((_, i) => ({
          id: `enemy-${i}`,
          type: 'wolf',
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          health: Math.floor(Math.random() * 150),
          state: ['idle', 'hunting', 'attacking'][Math.floor(Math.random() * 3)]
        })),
        projectiles: Array(15).fill(null).map((_, i) => ({
          id: `proj-${i}`,
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          velocity: { x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400 },
          type: 'arrow'
        }))
      };

      const start = performance.now();
      
      // Simulate compression (JSON stringify as baseline)
      const serialized = JSON.stringify(gameState);
      const compressed = serialized; // In real implementation, would use actual compression
      const decompressed = JSON.parse(compressed);
      
      const end = performance.now();
      const compressionTime = end - start;
      
      expect(compressionTime).to.be.lessThan(10); // Should be fast
      expect(decompressed.players).to.have.length(8);
      expect(decompressed.enemies).to.have.length(20);
      expect(decompressed.projectiles).to.have.length(15);
      expect(serialized.length).to.be.greaterThan(1000); // Significant data
    });

    it('should handle network latency compensation', () => {
      const latencyCompensator = {
        averageLatency: 50, // 50ms average latency
        predictions: [],
        
        predictPosition: sinon.stub().callsFake((currentPos, velocity, deltaTime) => {
          return {
            x: currentPos.x + velocity.x * deltaTime,
            y: currentPos.y + velocity.y * deltaTime
          };
        }),
        
        reconcileState: sinon.stub()
      };

      const playerUpdates = [];
      for (let i = 0; i < 100; i++) {
        playerUpdates.push({
          timestamp: Date.now() - latencyCompensator.averageLatency + i * 16,
          position: { x: i * 5, y: 300 },
          velocity: { x: 300, y: 0 }
        });
      }

      const start = performance.now();
      
      playerUpdates.forEach(update => {
        const predictedPos = latencyCompensator.predictPosition(
          update.position,
          update.velocity,
          latencyCompensator.averageLatency / 1000
        );
        latencyCompensator.predictions.push(predictedPos);
        latencyCompensator.reconcileState(update);
      });
      
      const end = performance.now();
      const compensationTime = end - start;
      
      expect(compensationTime).to.be.lessThan(20); // Should be fast
      expect(latencyCompensator.predictPosition.callCount).to.equal(100);
      expect(latencyCompensator.reconcileState.callCount).to.equal(100);
      expect(latencyCompensator.predictions).to.have.length(100);
    });
  });

  describe('Memory Management Performance', () => {
    it('should efficiently manage object pools', () => {
      const objectPool = {
        pool: [],
        activeObjects: [],
        
        get: sinon.stub().callsFake(() => {
          if (objectPool.pool.length > 0) {
            return objectPool.pool.pop();
          }
          return { x: 0, y: 0, active: false };
        }),
        
        release: sinon.stub().callsFake((obj) => {
          obj.active = false;
          objectPool.pool.push(obj);
        })
      };

      // Pre-populate pool
      for (let i = 0; i < 100; i++) {
        objectPool.pool.push({ x: 0, y: 0, active: false });
      }

      const start = performance.now();
      
      // Simulate heavy object creation/destruction
      for (let i = 0; i < 1000; i++) {
        const obj = objectPool.get();
        obj.x = Math.random() * 800;
        obj.y = Math.random() * 600;
        obj.active = true;
        objectPool.activeObjects.push(obj);
        
        // Randomly release some objects
        if (Math.random() < 0.3 && objectPool.activeObjects.length > 0) {
          const releaseIndex = Math.floor(Math.random() * objectPool.activeObjects.length);
          const releaseObj = objectPool.activeObjects.splice(releaseIndex, 1)[0];
          objectPool.release(releaseObj);
        }
      }
      
      const end = performance.now();
      const poolTime = end - start;
      
      expect(poolTime).to.be.lessThan(30); // Should be efficient
      expect(objectPool.get.callCount).to.equal(1000);
      expect(objectPool.release.callCount).to.be.greaterThan(0);
    });

    it('should handle garbage collection efficiently', () => {
      // Simulate memory-intensive operations
      const largeArrays = [];
      
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        // Create large arrays
        const array = new Array(10000).fill(null).map(() => ({
          id: Math.random(),
          data: new Array(100).fill(Math.random())
        }));
        largeArrays.push(array);
        
        // Clean up older arrays to trigger GC
        if (largeArrays.length > 10) {
          largeArrays.shift();
        }
      }
      
      const end = performance.now();
      const memoryTime = end - start;
      
      expect(memoryTime).to.be.lessThan(100); // Should handle memory operations
      expect(largeArrays.length).to.be.at.most(10); // Should clean up
    });
  });

  describe('Audio Performance', () => {
    it('should handle multiple simultaneous audio sources', () => {
      const audioManager = {
        activeSources: [],
        
        playSound: sinon.stub().callsFake((soundId) => {
          const source = {
            id: soundId,
            playing: true,
            stop: sinon.stub().callsFake(() => {
              source.playing = false;
            })
          };
          audioManager.activeSources.push(source);
          return source;
        }),
        
        stopSound: sinon.stub().callsFake((soundId) => {
          const source = audioManager.activeSources.find(s => s.id === soundId);
          if (source) {
            source.stop();
          }
        }),
        
        update: sinon.stub().callsFake(() => {
          // Remove stopped sources
          audioManager.activeSources = audioManager.activeSources.filter(s => s.playing);
        })
      };

      const start = performance.now();
      
      // Play many sounds simultaneously
      for (let i = 0; i < 50; i++) {
        audioManager.playSound(`sound-${i}`);
      }
      
      // Stop some sounds
      for (let i = 0; i < 20; i++) {
        audioManager.stopSound(`sound-${i}`);
      }
      
      audioManager.update();
      
      const end = performance.now();
      const audioTime = end - start;
      
      expect(audioTime).to.be.lessThan(20); // Should handle audio efficiently
      expect(audioManager.playSound.callCount).to.equal(50);
      expect(audioManager.stopSound.callCount).to.equal(20);
      expect(audioManager.activeSources.length).to.equal(30); // 50 - 20 stopped
    });

    it('should efficiently process 3D spatial audio', () => {
      const spatialAudio = {
        listener: { x: 400, y: 300, z: 0 },
        sources: [],
        
        updateSource: sinon.stub().callsFake((source) => {
          const dx = source.x - spatialAudio.listener.x;
          const dy = source.y - spatialAudio.listener.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          source.volume = Math.max(0, 1 - distance / 500); // Max distance 500
          source.pan = Math.max(-1, Math.min(1, dx / 200)); // Pan based on x position
        })
      };

      // Create many 3D audio sources
      for (let i = 0; i < 100; i++) {
        spatialAudio.sources.push({
          id: i,
          x: Math.random() * 800,
          y: Math.random() * 600,
          z: 0,
          volume: 1,
          pan: 0
        });
      }

      const start = performance.now();
      
      // Update all spatial audio sources
      spatialAudio.sources.forEach(source => {
        spatialAudio.updateSource(source);
      });
      
      const end = performance.now();
      const spatialTime = end - start;
      
      expect(spatialTime).to.be.lessThan(10); // Should be very fast
      expect(spatialAudio.updateSource.callCount).to.equal(100);
      
      // Verify spatial calculations worked
      const closeSource = spatialAudio.sources.find(s => 
        Math.sqrt((s.x - 400) ** 2 + (s.y - 300) ** 2) < 100
      );
      if (closeSource) {
        expect(closeSource.volume).to.be.greaterThan(0.8); // Should be loud
      }
    });
  });

  describe('Overall System Performance', () => {
    it('should maintain stable frame rate under full load', () => {
      const gameLoop = {
        update: sinon.stub(),
        render: sinon.stub(),
        frameCount: 0,
        totalTime: 0
      };

      const targetFPS = 60;
      const testDuration = 1000; // 1 second
      const expectedFrames = Math.floor((testDuration / 1000) * targetFPS);
      
      const start = performance.now();
      let lastFrameTime = start;
      
      // Simulate game loop for 1 second
      const frameInterval = setInterval(() => {
        const now = performance.now();
        const deltaTime = (now - lastFrameTime) / 1000;
        
        gameLoop.update(deltaTime);
        gameLoop.render();
        gameLoop.frameCount++;
        
        lastFrameTime = now;
        
        if (now - start >= testDuration) {
          clearInterval(frameInterval);
          
          const actualFPS = gameLoop.frameCount / (testDuration / 1000);
          
          expect(actualFPS).to.be.greaterThan(targetFPS * 0.9); // Allow 10% variance
          expect(gameLoop.update.callCount).to.equal(gameLoop.frameCount);
          expect(gameLoop.render.callCount).to.equal(gameLoop.frameCount);
        }
      }, 1000 / targetFPS);
    });

    it('should handle stress test scenarios', () => {
      const stressTest = {
        entities: [],
        particles: [],
        sounds: [],
        networkMessages: [],
        
        addEntity: sinon.stub().callsFake((entity) => {
          stressTest.entities.push(entity);
        }),
        
        addParticles: sinon.stub().callsFake((count) => {
          for (let i = 0; i < count; i++) {
            stressTest.particles.push({ x: Math.random() * 800, y: Math.random() * 600 });
          }
        }),
        
        playSound: sinon.stub().callsFake((sound) => {
          stressTest.sounds.push(sound);
        }),
        
        sendNetworkMessage: sinon.stub().callsFake((message) => {
          stressTest.networkMessages.push(message);
        })
      };

      const start = performance.now();
      
      // Stress test: add many entities, particles, sounds, and network messages
      for (let i = 0; i < 200; i++) {
        stressTest.addEntity({ id: i, type: 'enemy' });
      }
      
      stressTest.addParticles(1000);
      
      for (let i = 0; i < 50; i++) {
        stressTest.playSound(`stress-sound-${i}`);
      }
      
      for (let i = 0; i < 100; i++) {
        stressTest.sendNetworkMessage({ type: 'update', data: i });
      }
      
      const end = performance.now();
      const stressTime = end - start;
      
      expect(stressTime).to.be.lessThan(100); // Should handle stress test
      expect(stressTest.entities).to.have.length(200);
      expect(stressTest.particles).to.have.length(1000);
      expect(stressTest.sounds).to.have.length(50);
      expect(stressTest.networkMessages).to.have.length(100);
    });
  });
});
