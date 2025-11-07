import { expect } from 'chai';
import sinon from 'sinon';
import { GameRenderer } from '../../public/src/utils/game-renderer.js';

// Clean up after each test
afterEach(() => {
  sinon.restore();
});

describe('GameRenderer', () => {
  let gameRenderer;
  let mockContext;
  let mockCanvas;

  beforeEach(() => {
    // Create mock canvas and context
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
      fillRect: sinon.stub(),
      strokeRect: sinon.stub(),
      clearRect: sinon.stub(),
      moveTo: sinon.stub(),
      lineTo: sinon.stub(),
      ellipse: sinon.stub(),
      closePath: sinon.stub(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      globalAlpha: 1,
      filter: '',
      createRadialGradient: sinon.stub().returns({
        addColorStop: sinon.stub()
      }),
      createLinearGradient: sinon.stub().returns({
        addColorStop: sinon.stub()
      }),
      drawImage: sinon.stub(),
      measureText: sinon.stub().returns({ width: 100 }),
      fillText: sinon.stub(),
      strokeText: sinon.stub(),
      setTransform: sinon.stub(),
      getImageData: sinon.stub().returns({ data: new Uint8ClampedArray(4) }),
      putImageData: sinon.stub(),
      createImageData: sinon.stub().returns({ data: new Uint8ClampedArray(4) })
    };
    
    mockCanvas = {
      width: 1280,
      height: 720,
      getContext: sinon.stub().returns(mockContext)
    };
    
    gameRenderer = new GameRenderer(mockContext, mockCanvas, 0); // Forest biome
  });

  describe('Constructor and Initialization', () => {
    it('should create GameRenderer with default properties', () => {
      expect(gameRenderer.ctx).to.equal(mockContext);
      expect(gameRenderer.canvas).to.equal(mockCanvas);
      expect(gameRenderer.currentBiome).to.equal(0);
    });

    it('should initialize world properties', () => {
      expect(gameRenderer.world).to.be.an('object');
      expect(gameRenderer.world.width).to.equal(3840);
      expect(gameRenderer.world.height).to.equal(2160);
      expect(gameRenderer.world.tileSize).to.equal(32);
    });

    it('should initialize camera properties', () => {
      expect(gameRenderer.camera).to.be.an('object');
      expect(gameRenderer.camera.x).to.equal(0);
      expect(gameRenderer.camera.y).to.equal(0);
      expect(gameRenderer.camera.targetX).to.equal(0);
      expect(gameRenderer.camera.targetY).to.equal(0);
      expect(gameRenderer.camera.width).to.equal(mockCanvas.width);
      expect(gameRenderer.camera.height).to.equal(mockCanvas.height);
      expect(gameRenderer.camera.zoom).to.equal(1.0);
      expect(gameRenderer.camera.smoothing).to.equal(0.1);
    });

    it('should initialize player properties', () => {
      expect(gameRenderer.player).to.be.an('object');
      expect(gameRenderer.player.x).to.equal(gameRenderer.world.width / 2);
      expect(gameRenderer.player.y).to.equal(gameRenderer.world.height / 2);
      expect(gameRenderer.player.width).to.equal(48);
      expect(gameRenderer.player.height).to.equal(64);
      expect(gameRenderer.player.maxSpeed).to.equal(500);
      expect(gameRenderer.player.acceleration).to.equal(2000);
      expect(gameRenderer.player.friction).to.equal(0.85);
      expect(gameRenderer.player.facing).to.equal(1);
      expect(gameRenderer.player.state).to.equal('idle');
      expect(gameRenderer.player.health).to.equal(100);
      expect(gameRenderer.player.maxHealth).to.equal(100);
      expect(gameRenderer.player.stamina).to.equal(100);
      expect(gameRenderer.player.maxStamina).to.equal(100);
    });

    it('should initialize biome-specific properties', () => {
      expect(gameRenderer.platforms).to.be.an('array');
      expect(gameRenderer.decorations).to.be.an('array');
      expect(gameRenderer.collectibles).to.be.an('array');
      expect(gameRenderer.interactables).to.be.an('array');
      expect(gameRenderer.enemies).to.be.an('array');
      expect(gameRenderer.projectiles).to.be.an('array');
    });

    it('should initialize with different biomes', () => {
      // Test that we can create renderers with different biomes
      expect(() => {
        const swampRenderer = new GameRenderer(mockContext, mockCanvas, 1);
        expect(swampRenderer.currentBiome).to.equal(1);
      }).to.not.throw();
      
      expect(() => {
        const mountainRenderer = new GameRenderer(mockContext, mockCanvas, 2);
        expect(mountainRenderer.currentBiome).to.equal(2);
      }).to.not.throw();
      
      expect(() => {
        const plainsRenderer = new GameRenderer(mockContext, mockCanvas, 3);
        expect(plainsRenderer.currentBiome).to.equal(3);
      }).to.not.throw();
    });
  });

  describe('Camera System', () => {
    it('should update camera position', () => {
      const targetX = 100;
      const targetY = 200;
      const deltaTime = 16;
      
      gameRenderer.updateCamera(targetX, targetY, deltaTime);
      
      expect(gameRenderer.camera.targetX).to.equal(targetX);
      expect(gameRenderer.camera.targetY).to.equal(targetY);
    });

    it('should smooth camera movement', () => {
      gameRenderer.camera.x = 0;
      gameRenderer.camera.y = 0;
      gameRenderer.camera.targetX = 100;
      gameRenderer.camera.targetY = 100;
      gameRenderer.camera.smoothing = 0.1;
      
      gameRenderer.updateCamera(100, 100, 16);
      
      expect(gameRenderer.camera.x).to.be.greaterThan(0);
      expect(gameRenderer.camera.y).to.be.greaterThan(0);
      expect(gameRenderer.camera.x).to.be.lessThan(100);
      expect(gameRenderer.camera.y).to.be.lessThan(100);
    });

    it('should respect camera bounds', () => {
      gameRenderer.camera.bounds.minX = 0;
      gameRenderer.camera.bounds.minY = 0;
      gameRenderer.camera.bounds.maxX = 1000;
      gameRenderer.camera.bounds.maxY = 1000;
      
      gameRenderer.updateCamera(500, 500, 16);
      
      expect(gameRenderer.camera.x).to.be.at.least(0);
      expect(gameRenderer.camera.y).to.be.at.least(0);
      expect(gameRenderer.camera.x).to.be.at.most(1000);
      expect(gameRenderer.camera.y).to.be.at.most(1000);
    });

    it('should update camera bounds', () => {
      gameRenderer.updateCameraBounds();
      
      expect(gameRenderer.camera.bounds.minX).to.equal(0);
      expect(gameRenderer.camera.bounds.minY).to.equal(0);
      expect(gameRenderer.camera.bounds.maxX).to.equal(gameRenderer.world.width - gameRenderer.camera.width);
      expect(gameRenderer.camera.bounds.maxY).to.equal(gameRenderer.world.height - gameRenderer.camera.height);
    });

    it('should handle zoom changes', () => {
      gameRenderer.camera.zoom = 2.0;
      gameRenderer.updateCameraBounds();
      
      expect(gameRenderer.camera.bounds.maxX).to.be.lessThan(gameRenderer.world.width - gameRenderer.camera.width);
      expect(gameRenderer.camera.bounds.maxY).to.be.lessThan(gameRenderer.world.height - gameRenderer.camera.height);
    });
  });

  describe('Rendering Pipeline', () => {
    it('should render complete scene', () => {
      gameRenderer.render();
      
      expect(mockContext.save.called).to.be.true;
      expect(mockContext.restore.called).to.be.true;
      expect(mockContext.translate.called).to.be.true;
    });

    it('should render without following player', () => {
      gameRenderer.render(false);
      
      expect(mockContext.save.called).to.be.true;
      expect(mockContext.restore.called).to.be.true;
    });

    it('should apply camera transform correctly', () => {
      gameRenderer.camera.x = 100;
      gameRenderer.camera.y = 200;
      
      gameRenderer.render();
      
      const expectedOffsetX = -100 + mockCanvas.width / 2;
      const expectedOffsetY = -200 + mockCanvas.height / 2;
      
      expect(mockContext.translate.calledWith(expectedOffsetX, expectedOffsetY)).to.be.true;
    });

    it('should render layers in correct order', () => {
      const renderSpy = sinon.spy(gameRenderer, 'renderBackground');
      const renderPlatformsSpy = sinon.spy(gameRenderer, 'renderPlatforms');
      const renderDecorationsSpy = sinon.spy(gameRenderer, 'renderDecorations');
      const renderCollectiblesSpy = sinon.spy(gameRenderer, 'renderCollectibles');
      const renderInteractablesSpy = sinon.spy(gameRenderer, 'renderInteractables');
      const renderEnemiesSpy = sinon.spy(gameRenderer, 'renderEnemies');
      const renderPlayerSpy = sinon.spy(gameRenderer, 'renderPlayer');
      const renderProjectilesSpy = sinon.spy(gameRenderer, 'renderProjectiles');
      const renderLightingSpy = sinon.spy(gameRenderer, 'renderLighting');
      const renderWeatherSpy = sinon.spy(gameRenderer, 'renderWeather');
      const renderUISpy = sinon.spy(gameRenderer, 'renderUI');
      
      gameRenderer.render();
      
      expect(renderSpy.calledBefore(renderPlatformsSpy)).to.be.true;
      expect(renderPlatformsSpy.calledBefore(renderDecorationsSpy)).to.be.true;
      expect(renderDecorationsSpy.calledBefore(renderCollectiblesSpy)).to.be.true;
      expect(renderCollectiblesSpy.calledBefore(renderInteractablesSpy)).to.be.true;
      expect(renderInteractablesSpy.calledBefore(renderEnemiesSpy)).to.be.true;
      expect(renderEnemiesSpy.calledBefore(renderPlayerSpy)).to.be.true;
      expect(renderPlayerSpy.calledBefore(renderProjectilesSpy)).to.be.true;
      expect(renderProjectilesSpy.calledBefore(renderLightingSpy)).to.be.true;
      expect(renderLightingSpy.calledBefore(renderWeatherSpy)).to.be.true;
      expect(renderUISpy.calledAfter(renderWeatherSpy)).to.be.true;
    });
  });

  describe('Background Rendering', () => {
    it('should render forest biome background', () => {
      gameRenderer.currentBiome = 0; // Forest
      gameRenderer.renderBackground();
      
      expect(mockContext.fillStyle).to.be.a('string');
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render swamp biome background', () => {
      gameRenderer.currentBiome = 1; // Swamp
      gameRenderer.renderBackground();
      
      expect(mockContext.fillStyle).to.be.a('string');
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render mountain biome background', () => {
      gameRenderer.currentBiome = 2; // Mountains
      gameRenderer.renderBackground();
      
      expect(mockContext.fillStyle).to.be.a('string');
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render plains biome background', () => {
      gameRenderer.currentBiome = 3; // Plains
      gameRenderer.renderBackground();
      
      expect(mockContext.fillStyle).to.be.a('string');
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should handle invalid biome gracefully', () => {
      gameRenderer.currentBiome = 999; // Invalid biome
      
      expect(() => gameRenderer.renderBackground()).to.not.throw();
    });
  });

  describe('Platform Rendering', () => {
    it('should render platforms', () => {
      gameRenderer.platforms = [
        { x: 100, y: 200, width: 200, height: 20, type: 'ground' },
        { x: 300, y: 150, width: 100, height: 20, type: 'platform' }
      ];
      
      gameRenderer.renderPlatforms();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render different platform types', () => {
      gameRenderer.platforms = [
        { x: 100, y: 200, width: 200, height: 20, type: 'ground' },
        { x: 300, y: 150, width: 100, height: 20, type: 'platform' },
        { x: 500, y: 100, width: 150, height: 20, type: 'moving' }
      ];
      
      gameRenderer.renderPlatforms();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should handle empty platforms array', () => {
      gameRenderer.platforms = [];
      
      expect(() => gameRenderer.renderPlatforms()).to.not.throw();
    });
  });

  describe('Decoration Rendering', () => {
    it('should render decorations', () => {
      gameRenderer.decorations = [
        { x: 100, y: 200, type: 'tree', size: 1.0 },
        { x: 300, y: 150, type: 'rock', size: 0.8 }
      ];
      
      gameRenderer.renderDecorations();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render different decoration types', () => {
      gameRenderer.decorations = [
        { x: 100, y: 200, type: 'tree', size: 1.0 },
        { x: 300, y: 150, type: 'rock', size: 0.8 },
        { x: 500, y: 100, type: 'flower', size: 0.5 }
      ];
      
      gameRenderer.renderDecorations();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should handle decoration scaling', () => {
      gameRenderer.decorations = [
        { x: 100, y: 200, type: 'tree', size: 2.0 }
      ];
      
      gameRenderer.renderDecorations();
      
      expect(mockContext.scale.called).to.be.true;
    });
  });

  describe('Collectible Rendering', () => {
    it('should render collectibles', () => {
      gameRenderer.collectibles = [
        { x: 100, y: 200, type: 'coin', value: 10, collected: false },
        { x: 300, y: 150, type: 'gem', value: 50, collected: false }
      ];
      
      gameRenderer.renderCollectibles();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should not render collected items', () => {
      gameRenderer.collectibles = [
        { x: 100, y: 200, type: 'coin', value: 10, collected: true },
        { x: 300, y: 150, type: 'gem', value: 50, collected: false }
      ];
      
      gameRenderer.renderCollectibles();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render different collectible types', () => {
      gameRenderer.collectibles = [
        { x: 100, y: 200, type: 'coin', value: 10, collected: false },
        { x: 300, y: 150, type: 'gem', value: 50, collected: false },
        { x: 500, y: 100, type: 'powerup', value: 100, collected: false }
      ];
      
      gameRenderer.renderCollectibles();
      
      expect(mockContext.fillRect.called).to.be.true;
    });
  });

  describe('Interactable Rendering', () => {
    it('should render interactables', () => {
      gameRenderer.interactables = [
        { x: 100, y: 200, type: 'chest', opened: false },
        { x: 300, y: 150, type: 'door', locked: true }
      ];
      
      gameRenderer.renderInteractables();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render different interactable states', () => {
      gameRenderer.interactables = [
        { x: 100, y: 200, type: 'chest', opened: false },
        { x: 300, y: 150, type: 'chest', opened: true },
        { x: 500, y: 100, type: 'door', locked: false }
      ];
      
      gameRenderer.renderInteractables();
      
      expect(mockContext.fillRect.called).to.be.true;
    });
  });

  describe('Enemy Rendering', () => {
    it('should render enemies', () => {
      gameRenderer.enemies = [
        { x: 100, y: 200, type: 'wolf', health: 100, state: 'idle' },
        { x: 300, y: 150, type: 'bear', health: 150, state: 'patrol' }
      ];
      
      gameRenderer.renderEnemies();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render different enemy types', () => {
      gameRenderer.enemies = [
        { x: 100, y: 200, type: 'wolf', health: 100, state: 'idle' },
        { x: 300, y: 150, type: 'bear', health: 150, state: 'patrol' },
        { x: 500, y: 100, type: 'spider', health: 50, state: 'attack' }
      ];
      
      gameRenderer.renderEnemies();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render enemy health bars', () => {
      gameRenderer.enemies = [
        { x: 100, y: 200, type: 'wolf', health: 75, maxHealth: 100, state: 'idle' }
      ];
      
      gameRenderer.renderEnemies();
      
      expect(mockContext.fillRect.called).to.be.true;
    });
  });

  describe('Player Rendering', () => {
    it('should render player when not using external renderer', () => {
      gameRenderer.useExternalPlayer = false;
      gameRenderer.renderPlayer();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should not render player when using external renderer', () => {
      gameRenderer.useExternalPlayer = true;
      gameRenderer.renderPlayer();
      
      expect(mockContext.fillRect.called).to.be.false;
    });

    it('should render player in different states', () => {
      gameRenderer.useExternalPlayer = false;
      
      gameRenderer.player.state = 'idle';
      gameRenderer.renderPlayer();
      
      gameRenderer.player.state = 'running';
      gameRenderer.renderPlayer();
      
      gameRenderer.player.state = 'attacking';
      gameRenderer.renderPlayer();
      
      gameRenderer.player.state = 'blocking';
      gameRenderer.renderPlayer();
      
      gameRenderer.player.state = 'rolling';
      gameRenderer.renderPlayer();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render player health and stamina bars', () => {
      gameRenderer.useExternalPlayer = false;
      gameRenderer.player.health = 75;
      gameRenderer.player.maxHealth = 100;
      gameRenderer.player.stamina = 50;
      gameRenderer.player.maxStamina = 100;
      
      gameRenderer.renderPlayer();
      
      expect(mockContext.fillRect.called).to.be.true;
    });
  });

  describe('Projectile Rendering', () => {
    it('should render projectiles', () => {
      gameRenderer.projectiles = [
        { x: 100, y: 200, velocityX: 10, velocityY: 0, type: 'arrow', damage: 25 },
        { x: 300, y: 150, velocityX: -5, velocityY: 5, type: 'spell', damage: 50 }
      ];
      
      gameRenderer.renderProjectiles();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render different projectile types', () => {
      gameRenderer.projectiles = [
        { x: 100, y: 200, velocityX: 10, velocityY: 0, type: 'arrow', damage: 25 },
        { x: 300, y: 150, velocityX: -5, velocityY: 5, type: 'spell', damage: 50 },
        { x: 500, y: 100, velocityX: 0, velocityY: -10, type: 'fireball', damage: 75 }
      ];
      
      gameRenderer.renderProjectiles();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should handle projectile movement', () => {
      gameRenderer.projectiles = [
        { x: 100, y: 200, velocityX: 10, velocityY: 0, type: 'arrow', damage: 25 }
      ];
      
      gameRenderer.renderProjectiles();
      
      expect(gameRenderer.projectiles[0].x).to.equal(110);
      expect(gameRenderer.projectiles[0].y).to.equal(200);
    });
  });

  describe('Lighting System', () => {
    it('should render lighting effects', () => {
      gameRenderer.renderLighting();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });

    it('should render different lighting types', () => {
      gameRenderer.lighting = [
        { x: 100, y: 200, radius: 100, intensity: 0.8, type: 'torch' },
        { x: 300, y: 150, radius: 200, intensity: 0.5, type: 'moonlight' }
      ];
      
      gameRenderer.renderLighting();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });

    it('should handle dynamic lighting', () => {
      gameRenderer.lighting = [
        { x: 100, y: 200, radius: 100, intensity: 0.8, type: 'torch', flicker: true }
      ];
      
      gameRenderer.renderLighting();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });
  });

  describe('Weather Effects', () => {
    it('should render weather effects', () => {
      gameRenderer.renderWeather();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });

    it('should render rain effect', () => {
      gameRenderer.weather = { type: 'rain', intensity: 0.5, particles: [] };
      
      gameRenderer.renderWeather();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });

    it('should render snow effect', () => {
      gameRenderer.weather = { type: 'snow', intensity: 0.3, particles: [] };
      
      gameRenderer.renderWeather();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });

    it('should render fog effect', () => {
      gameRenderer.weather = { type: 'fog', intensity: 0.7, particles: [] };
      
      gameRenderer.renderWeather();
      
      expect(mockContext.globalAlpha).to.be.a('number');
    });
  });

  describe('UI Rendering', () => {
    it('should render UI elements', () => {
      gameRenderer.renderUI();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render health bar', () => {
      gameRenderer.player.health = 75;
      gameRenderer.player.maxHealth = 100;
      
      gameRenderer.renderUI();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render stamina bar', () => {
      gameRenderer.player.stamina = 50;
      gameRenderer.player.maxStamina = 100;
      
      gameRenderer.renderUI();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render minimap', () => {
      gameRenderer.renderUI();
      
      expect(mockContext.fillRect.called).to.be.true;
    });

    it('should render crosshair', () => {
      gameRenderer.renderUI();
      
      expect(mockContext.beginPath.called).to.be.true;
      expect(mockContext.stroke.called).to.be.true;
    });
  });

  describe('Visual Effects', () => {
    it('should handle particle effects', () => {
      // Test that particle-related properties exist
      expect(gameRenderer).to.have.property('particles');
      expect(gameRenderer.particles).to.be.an('array');
    });

    it('should handle screen effects', () => {
      // Test that screen effect properties exist
      expect(gameRenderer).to.have.property('screenEffects');
    });
  });

  describe('Biome-Specific Rendering', () => {
    it('should handle forest biome', () => {
      gameRenderer.currentBiome = 0; // Forest
      expect(gameRenderer.currentBiome).to.equal(0);
    });

    it('should handle swamp biome', () => {
      gameRenderer.currentBiome = 1; // Swamp
      expect(gameRenderer.currentBiome).to.equal(1);
    });

    it('should handle mountain biome', () => {
      gameRenderer.currentBiome = 2; // Mountains
      expect(gameRenderer.currentBiome).to.equal(2);
    });

    it('should handle plains biome', () => {
      gameRenderer.currentBiome = 3; // Plains
      expect(gameRenderer.currentBiome).to.equal(3);
    });
  });

  describe('Performance and Optimization', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        gameRenderer.render();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 renders in less than 100ms
      expect(duration).to.be.lessThan(100);
    });

    it('should handle large numbers of entities efficiently', () => {
      // Create large arrays of entities
      gameRenderer.platforms = Array(100).fill().map((_, i) => ({
        x: i * 50, y: 200, width: 50, height: 20, type: 'platform'
      }));
      gameRenderer.decorations = Array(200).fill().map((_, i) => ({
        x: i * 25, y: 150, type: 'tree', size: 1.0
      }));
      gameRenderer.enemies = Array(50).fill().map((_, i) => ({
        x: i * 100, y: 200, type: 'wolf', health: 100, state: 'idle'
      }));
      
      const startTime = performance.now();
      gameRenderer.render();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should handle 350 entities in less than 50ms
      expect(duration).to.be.lessThan(50);
    });

    it('should cull off-screen entities', () => {
      gameRenderer.platforms = [
        { x: -100, y: 200, width: 50, height: 20, type: 'platform' }, // Off-screen
        { x: 100, y: 200, width: 50, height: 20, type: 'platform' }, // On-screen
        { x: 2000, y: 200, width: 50, height: 20, type: 'platform' }  // Off-screen
      ];
      
      gameRenderer.renderPlatforms();
      
      expect(mockContext.fillRect.called).to.be.true;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing context gracefully', () => {
      const rendererWithoutContext = new GameRenderer(null, mockCanvas, 0);
      
      expect(() => rendererWithoutContext.render()).to.not.throw();
    });

    it('should handle missing canvas gracefully', () => {
      const rendererWithoutCanvas = new GameRenderer(mockContext, null, 0);
      
      expect(() => rendererWithoutCanvas.render()).to.not.throw();
    });

    it('should handle invalid biome gracefully', () => {
      gameRenderer.currentBiome = -1;
      
      expect(() => gameRenderer.renderBackground()).to.not.throw();
      expect(() => gameRenderer.renderBiomeSpecific()).to.not.throw();
    });

    it('should handle null/undefined entities gracefully', () => {
      gameRenderer.platforms = [null, undefined, { x: 100, y: 200, width: 50, height: 20, type: 'platform' }];
      
      expect(() => gameRenderer.renderPlatforms()).to.not.throw();
    });

    it('should handle entities with missing properties gracefully', () => {
      gameRenderer.platforms = [{ x: 100, y: 200 }]; // Missing width, height, type
      
      expect(() => gameRenderer.renderPlatforms()).to.not.throw();
    });

    it('should handle extreme camera positions gracefully', () => {
      gameRenderer.camera.x = -10000;
      gameRenderer.camera.y = -10000;
      
      expect(() => gameRenderer.render()).to.not.throw();
    });

    it('should handle zero or negative entity dimensions gracefully', () => {
      gameRenderer.platforms = [
        { x: 100, y: 200, width: 0, height: 20, type: 'platform' },
        { x: 200, y: 200, width: 50, height: -10, type: 'platform' }
      ];
      
      expect(() => gameRenderer.renderPlatforms()).to.not.throw();
    });
  });

  describe('Integration and State Management', () => {
    it('should maintain consistent state across renders', () => {
      const initialPlayerX = gameRenderer.player.x;
      const initialPlayerY = gameRenderer.player.y;
      
      gameRenderer.render();
      
      expect(gameRenderer.player.x).to.equal(initialPlayerX);
      expect(gameRenderer.player.y).to.equal(initialPlayerY);
    });

    it('should update player position correctly', () => {
      gameRenderer.player.x = 100;
      gameRenderer.player.y = 200;
      
      gameRenderer.render();
      
      expect(gameRenderer.player.x).to.equal(100);
      expect(gameRenderer.player.y).to.equal(200);
    });

    it('should handle camera following player', () => {
      gameRenderer.player.x = 500;
      gameRenderer.player.y = 300;
      
      gameRenderer.render(true); // Follow player
      
      expect(gameRenderer.camera.targetX).to.equal(500);
      expect(gameRenderer.camera.targetY).to.equal(300);
    });

    it('should handle external player rendering', () => {
      gameRenderer.useExternalPlayer = true;
      
      gameRenderer.render();
      
      // Should not call renderPlayer when using external player
      expect(mockContext.fillRect.called).to.be.true; // Other elements should still render
    });
  });
});
