import { expect } from 'chai';
import sinon from 'sinon';

// Mock Canvas and 2D Context with comprehensive methods
const createMockCanvas = () => ({
  width: 800,
  height: 600,
  getContext: () => createMockContext(),
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600
  })
});

const createMockContext = () => ({
  save: sinon.stub(),
  restore: sinon.stub(),
  translate: sinon.stub(),
  rotate: sinon.stub(),
  scale: sinon.stub(),
  transform: sinon.stub(),
  setTransform: sinon.stub(),
  beginPath: sinon.stub(),
  closePath: sinon.stub(),
  arc: sinon.stub(),
  rect: sinon.stub(),
  fillRect: sinon.stub(),
  strokeRect: sinon.stub(),
  clearRect: sinon.stub(),
  moveTo: sinon.stub(),
  lineTo: sinon.stub(),
  bezierCurveTo: sinon.stub(),
  quadraticCurveTo: sinon.stub(),
  fill: sinon.stub(),
  stroke: sinon.stub(),
  clip: sinon.stub(),
  fillText: sinon.stub(),
  strokeText: sinon.stub(),
  measureText: sinon.stub().returns({ width: 50 }),
  drawImage: sinon.stub(),
  createImageData: sinon.stub().returns({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }),
  getImageData: sinon.stub().returns({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  }),
  putImageData: sinon.stub(),
  createLinearGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  createRadialGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  createPattern: sinon.stub().returns({}),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'butt',
  lineJoin: 'miter',
  miterLimit: 10,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  font: '10px sans-serif',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  direction: 'ltr',
  shadowColor: 'rgba(0, 0, 0, 0)',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  filter: 'none'
});

// Mock Image constructor
global.Image = class MockImage {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
    this.width = 100;
    this.height = 100;
  }
  
  set src(value) {
    this._src = value;
    // Simulate successful image load
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  
  get src() {
    return this._src;
  }
};

// Mock performance API
global.performance = global.performance || {
  now: () => Date.now()
};

describe('Game Renderer - Comprehensive Tests', () => {
  let GameRenderer, mockCanvas, mockCtx;

  before(async () => {
    // Mock the WolfCharacter import
    const mockWolfCharacter = class {
      constructor() {
        this.x = 0;
        this.y = 0;
        this.width = 64;
        this.height = 64;
        this.health = 100;
        this.state = 'idle';
      }
      
      render(ctx) {
        // Mock render method
      }
    };

    // Mock the module system
    const moduleSystem = {
      '../gameentity/wolf-character.js': {
        WolfCharacter: mockWolfCharacter
      }
    };

    // Override dynamic imports for testing
    const originalImport = global.import || (() => Promise.reject(new Error('Import not supported')));
    global.import = (path) => {
      if (moduleSystem[path]) {
        return Promise.resolve(moduleSystem[path]);
      }
      return originalImport(path);
    };

    // Mock window object for Node.js environment
    global.window = global.window || {
      performance: global.performance || { now: () => Date.now() },
      navigator: { userAgent: 'test' }
    };
    
    // Dynamic import to ensure mocks are in place
    const module = await import('../../src/utils/game-renderer.js');
    GameRenderer = module.GameRenderer;
  });

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    mockCtx = createMockContext();
    sinon.stub(mockCanvas, 'getContext').returns(mockCtx);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GameRenderer Initialization', () => {
    it('should initialize with correct default properties', () => {
      const renderer = new GameRenderer(mockCtx, mockCanvas);
      
      expect(renderer.ctx).to.equal(mockCtx);
      expect(renderer.canvas).to.equal(mockCanvas);
      expect(renderer.currentBiome).to.equal(0);
      expect(renderer.world.width).to.equal(3840);
      expect(renderer.world.height).to.equal(2160);
      expect(renderer.world.tileSize).to.equal(32);
    });

    it('should initialize with custom biome', () => {
      const renderer = new GameRenderer(mockCtx, mockCanvas, 2);
      
      expect(renderer.currentBiome).to.equal(2);
    });

    it('should set up camera correctly', () => {
      const renderer = new GameRenderer(mockCtx, mockCanvas);
      
      expect(renderer.camera.x).to.equal(0);
      expect(renderer.camera.y).to.equal(0);
      expect(renderer.camera.width).to.equal(mockCanvas.width);
      expect(renderer.camera.height).to.equal(mockCanvas.height);
      expect(renderer.camera.zoom).to.equal(1.0);
      expect(renderer.camera.smoothing).to.equal(0.1);
    });

    it('should initialize player with default properties', () => {
      const renderer = new GameRenderer(mockCtx, mockCanvas);
      
      expect(renderer.player.x).to.equal(renderer.world.width / 2);
      expect(renderer.player.y).to.equal(renderer.world.height / 2);
      expect(renderer.player.health).to.equal(100);
      expect(renderer.player.stamina).to.equal(100);
      expect(renderer.player.state).to.equal('idle');
      expect(renderer.player.facing).to.equal(1);
    });

    it('should calculate camera bounds correctly', () => {
      const renderer = new GameRenderer(mockCtx, mockCanvas);
      
      expect(renderer.camera.bounds.minX).to.equal(mockCanvas.width / 2);
      expect(renderer.camera.bounds.minY).to.equal(mockCanvas.height / 2);
      expect(renderer.camera.bounds.maxX).to.equal(renderer.world.width - mockCanvas.width / 2);
      expect(renderer.camera.bounds.maxY).to.equal(renderer.world.height - mockCanvas.height / 2);
    });
  });

  describe('Camera System', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should update camera to follow target', () => {
      const targetX = 1000;
      const targetY = 800;
      const initialCameraX = renderer.camera.x;
      const initialCameraY = renderer.camera.y;
      
      renderer.updateCamera(targetX, targetY, 1/60);
      
      expect(renderer.camera.x).to.not.equal(initialCameraX);
      expect(renderer.camera.y).to.not.equal(initialCameraY);
    });

    it('should respect camera bounds', () => {
      // Test minimum bounds
      renderer.updateCamera(-1000, -1000, 1/60);
      expect(renderer.camera.x).to.be.at.least(renderer.camera.bounds.minX);
      expect(renderer.camera.y).to.be.at.least(renderer.camera.bounds.minY);
      
      // Test maximum bounds
      renderer.updateCamera(10000, 10000, 1/60);
      expect(renderer.camera.x).to.be.at.most(renderer.camera.bounds.maxX);
      expect(renderer.camera.y).to.be.at.most(renderer.camera.bounds.maxY);
    });

    it('should apply camera smoothing', () => {
      const targetX = 1000;
      const targetY = 800;
      renderer.camera.smoothing = 0.5;
      
      renderer.updateCamera(targetX, targetY, 1/60);
      
      // Camera should move towards target but not reach it immediately
      expect(Math.abs(renderer.camera.x - targetX)).to.be.greaterThan(0);
      expect(Math.abs(renderer.camera.y - targetY)).to.be.greaterThan(0);
    });

    it('should handle camera zoom', () => {
      renderer.camera.zoom = 2.0;
      renderer.updateCameraBounds();
      
      // Bounds should adjust for zoom
      expect(renderer.camera.bounds.minX).to.equal(mockCanvas.width / (2 * 2.0));
      expect(renderer.camera.bounds.minY).to.equal(mockCanvas.height / (2 * 2.0));
    });
  });

  describe('Player Management', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should update player position', () => {
      const newX = 1500;
      const newY = 1200;
      
      renderer.setPlayerPosition(newX, newY);
      
      expect(renderer.player.x).to.equal(newX);
      expect(renderer.player.y).to.equal(newY);
    });

    it('should update player health', () => {
      renderer.setPlayerHealth(75);
      expect(renderer.player.health).to.equal(75);
      
      renderer.setPlayerHealth(150); // Should clamp to max
      expect(renderer.player.health).to.equal(100);
      
      renderer.setPlayerHealth(-10); // Should clamp to 0
      expect(renderer.player.health).to.equal(0);
    });

    it('should update player stamina', () => {
      renderer.setPlayerStamina(50);
      expect(renderer.player.stamina).to.equal(50);
      
      renderer.setPlayerStamina(150); // Should clamp to max
      expect(renderer.player.stamina).to.equal(100);
      
      renderer.setPlayerStamina(-10); // Should clamp to 0
      expect(renderer.player.stamina).to.equal(0);
    });

    it('should update player state', () => {
      renderer.setPlayerState('running');
      expect(renderer.player.state).to.equal('running');
      
      renderer.setPlayerState('attacking');
      expect(renderer.player.state).to.equal('attacking');
    });

    it('should update player facing direction', () => {
      renderer.setPlayerFacing(-1);
      expect(renderer.player.facing).to.equal(-1);
      
      renderer.setPlayerFacing(1);
      expect(renderer.player.facing).to.equal(1);
    });

    it('should enable/disable external player rendering', () => {
      expect(renderer.useExternalPlayer).to.be.false;
      
      renderer.enableExternalPlayer();
      expect(renderer.useExternalPlayer).to.be.true;
      
      renderer.disableExternalPlayer();
      expect(renderer.useExternalPlayer).to.be.false;
    });
  });

  describe('Enemy Management', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should add enemies correctly', () => {
      const enemy = {
        x: 1000,
        y: 800,
        width: 64,
        height: 64,
        type: 'wolf',
        health: 100
      };
      
      renderer.addEnemy(enemy);
      
      expect(renderer.enemies).to.have.length(1);
      expect(renderer.enemies[0]).to.deep.equal(enemy);
    });

    it('should remove enemies correctly', () => {
      const enemy1 = { id: 1, x: 100, y: 100 };
      const enemy2 = { id: 2, x: 200, y: 200 };
      
      renderer.addEnemy(enemy1);
      renderer.addEnemy(enemy2);
      
      expect(renderer.enemies).to.have.length(2);
      
      renderer.removeEnemy(1);
      
      expect(renderer.enemies).to.have.length(1);
      expect(renderer.enemies[0].id).to.equal(2);
    });

    it('should clear all enemies', () => {
      renderer.addEnemy({ x: 100, y: 100 });
      renderer.addEnemy({ x: 200, y: 200 });
      
      expect(renderer.enemies).to.have.length(2);
      
      renderer.clearEnemies();
      
      expect(renderer.enemies).to.have.length(0);
    });

    it('should update enemy positions', () => {
      const enemy = { id: 1, x: 100, y: 100 };
      renderer.addEnemy(enemy);
      
      renderer.updateEnemyPosition(1, 150, 200);
      
      expect(renderer.enemies[0].x).to.equal(150);
      expect(renderer.enemies[0].y).to.equal(200);
    });
  });

  describe('Biome System', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should change biomes correctly', () => {
      expect(renderer.currentBiome).to.equal(0);
      
      renderer.setBiome(2);
      expect(renderer.currentBiome).to.equal(2);
    });

    it('should handle invalid biome values', () => {
      renderer.setBiome(-1);
      expect(renderer.currentBiome).to.equal(0); // Should clamp to valid range
      
      renderer.setBiome(10);
      expect(renderer.currentBiome).to.equal(3); // Should clamp to max biome
    });

    it('should update biome-specific properties', () => {
      renderer.setBiome(1); // Swamp biome
      
      // Biome change should trigger environment updates
      expect(renderer.currentBiome).to.equal(1);
    });
  });

  describe('Collectibles and Interactables', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should add collectibles', () => {
      const collectible = {
        x: 500,
        y: 400,
        type: 'coin',
        value: 10
      };
      
      renderer.addCollectible(collectible);
      
      expect(renderer.collectibles).to.have.length(1);
      expect(renderer.collectibles[0]).to.deep.equal(collectible);
    });

    it('should remove collected items', () => {
      const collectible = { id: 1, x: 500, y: 400, type: 'coin' };
      renderer.addCollectible(collectible);
      
      expect(renderer.collectibles).to.have.length(1);
      
      renderer.removeCollectible(1);
      
      expect(renderer.collectibles).to.have.length(0);
    });

    it('should add interactables', () => {
      const interactable = {
        x: 600,
        y: 500,
        type: 'chest',
        interacted: false
      };
      
      renderer.addInteractable(interactable);
      
      expect(renderer.interactables).to.have.length(1);
      expect(renderer.interactables[0]).to.deep.equal(interactable);
    });

    it('should handle interactable activation', () => {
      const interactable = { id: 1, x: 600, y: 500, type: 'chest', interacted: false };
      renderer.addInteractable(interactable);
      
      renderer.activateInteractable(1);
      
      expect(renderer.interactables[0].interacted).to.be.true;
    });
  });

  describe('Projectile System', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should add projectiles', () => {
      const projectile = {
        x: 300,
        y: 400,
        vx: 200,
        vy: 0,
        type: 'arrow',
        damage: 25
      };
      
      renderer.addProjectile(projectile);
      
      expect(renderer.projectiles).to.have.length(1);
      expect(renderer.projectiles[0]).to.deep.equal(projectile);
    });

    it('should update projectile positions', () => {
      const projectile = {
        x: 300,
        y: 400,
        vx: 200,
        vy: -100,
        type: 'arrow'
      };
      
      renderer.addProjectile(projectile);
      
      const deltaTime = 1/60;
      renderer.updateProjectiles(deltaTime);
      
      expect(renderer.projectiles[0].x).to.be.greaterThan(300);
      expect(renderer.projectiles[0].y).to.be.lessThan(400);
    });

    it('should remove out-of-bounds projectiles', () => {
      const projectile = {
        x: -100, // Out of bounds
        y: 400,
        vx: -200,
        vy: 0,
        type: 'arrow'
      };
      
      renderer.addProjectile(projectile);
      renderer.updateProjectiles(1/60);
      
      expect(renderer.projectiles).to.have.length(0);
    });
  });

  describe('Weather and Lighting', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should set weather effects', () => {
      renderer.setWeather('rain', 0.7);
      
      expect(renderer.weather.type).to.equal('rain');
      expect(renderer.weather.intensity).to.equal(0.7);
    });

    it('should handle different weather types', () => {
      const weatherTypes = ['none', 'rain', 'snow', 'fog', 'storm'];
      
      weatherTypes.forEach(weather => {
        renderer.setWeather(weather, 0.5);
        expect(renderer.weather.type).to.equal(weather);
      });
    });

    it('should set lighting conditions', () => {
      renderer.setLighting('night', 0.3);
      
      expect(renderer.lighting.type).to.equal('night');
      expect(renderer.lighting.intensity).to.equal(0.3);
    });

    it('should handle time of day changes', () => {
      const times = ['dawn', 'day', 'dusk', 'night'];
      
      times.forEach(time => {
        renderer.setLighting(time, 1.0);
        expect(renderer.lighting.type).to.equal(time);
      });
    });
  });

  describe('Rendering Pipeline', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should execute main render method', () => {
      renderer.render();
      
      // Verify basic rendering calls
      expect(mockCtx.save).to.have.been.called;
      expect(mockCtx.restore).to.have.been.called;
      expect(mockCtx.translate).to.have.been.called;
    });

    it('should render without following player when disabled', () => {
      const initialCameraX = renderer.camera.x;
      const initialCameraY = renderer.camera.y;
      
      renderer.render(false);
      
      expect(renderer.camera.x).to.equal(initialCameraX);
      expect(renderer.camera.y).to.equal(initialCameraY);
    });

    it('should render all game layers in order', () => {
      sinon.spy(renderer, 'renderBackground');
      sinon.spy(renderer, 'renderPlatforms');
      sinon.spy(renderer, 'renderDecorations');
      sinon.spy(renderer, 'renderCollectibles');
      sinon.spy(renderer, 'renderInteractables');
      sinon.spy(renderer, 'renderEnemies');
      sinon.spy(renderer, 'renderProjectiles');
      sinon.spy(renderer, 'renderLighting');
      sinon.spy(renderer, 'renderWeather');
      sinon.spy(renderer, 'renderUI');
      
      renderer.render();
      
      expect(renderer.renderBackground).to.have.been.called;
      expect(renderer.renderPlatforms).to.have.been.called;
      expect(renderer.renderDecorations).to.have.been.called;
      expect(renderer.renderCollectibles).to.have.been.called;
      expect(renderer.renderInteractables).to.have.been.called;
      expect(renderer.renderEnemies).to.have.been.called;
      expect(renderer.renderProjectiles).to.have.been.called;
      expect(renderer.renderLighting).to.have.been.called;
      expect(renderer.renderWeather).to.have.been.called;
      expect(renderer.renderUI).to.have.been.called;
    });

    it('should skip player rendering when external player is enabled', () => {
      sinon.spy(renderer, 'renderPlayer');
      
      renderer.enableExternalPlayer();
      renderer.render();
      
      expect(renderer.renderPlayer).to.not.have.been.called;
    });

    it('should render UI elements without camera transform', () => {
      renderer.render();
      
      // UI rendering should happen after context restore
      expect(mockCtx.restore).to.have.been.called;
    });
  });

  describe('Performance and Optimization', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should handle large numbers of enemies efficiently', () => {
      // Add many enemies
      for (let i = 0; i < 100; i++) {
        renderer.addEnemy({
          id: i,
          x: Math.random() * renderer.world.width,
          y: Math.random() * renderer.world.height,
          type: 'wolf',
          health: 100
        });
      }

      const startTime = performance.now();
      renderer.render();
      const endTime = performance.now();

      expect(endTime - startTime).to.be.lessThan(16); // Should maintain 60fps
      expect(renderer.enemies).to.have.length(100);
    });

    it('should handle large numbers of projectiles efficiently', () => {
      // Add many projectiles
      for (let i = 0; i < 50; i++) {
        renderer.addProjectile({
          x: Math.random() * renderer.world.width,
          y: Math.random() * renderer.world.height,
          vx: (Math.random() - 0.5) * 400,
          vy: (Math.random() - 0.5) * 400,
          type: 'arrow'
        });
      }

      const startTime = performance.now();
      renderer.updateProjectiles(1/60);
      renderer.render();
      const endTime = performance.now();

      expect(endTime - startTime).to.be.lessThan(16);
    });

    it('should cull off-screen entities', () => {
      // Add entities far from camera
      renderer.addEnemy({
        id: 1,
        x: -1000,
        y: -1000,
        type: 'wolf'
      });
      
      renderer.addCollectible({
        id: 2,
        x: 10000,
        y: 10000,
        type: 'coin'
      });

      sinon.spy(mockCtx, 'drawImage');
      sinon.spy(mockCtx, 'fillRect');
      
      renderer.render();
      
      // Off-screen entities should not trigger many draw calls
      expect(mockCtx.drawImage.callCount + mockCtx.fillRect.callCount).to.be.lessThan(10);
    });
  });

  describe('Error Handling', () => {
    let renderer;

    beforeEach(() => {
      renderer = new GameRenderer(mockCtx, mockCanvas);
    });

    it('should handle null/undefined parameters gracefully', () => {
      expect(() => {
        renderer.addEnemy(null);
      }).to.not.throw();

      expect(() => {
        renderer.setPlayerPosition(null, undefined);
      }).to.not.throw();

      expect(() => {
        renderer.updateCamera(null, null, 1/60);
      }).to.not.throw();
    });

    it('should handle invalid enemy IDs', () => {
      expect(() => {
        renderer.removeEnemy(999);
      }).to.not.throw();

      expect(() => {
        renderer.updateEnemyPosition(999, 100, 100);
      }).to.not.throw();
    });

    it('should handle canvas context errors', () => {
      // Simulate context method failure
      mockCtx.drawImage.throws(new Error('Context error'));
      
      expect(() => {
        renderer.render();
      }).to.not.throw();
    });

    it('should handle invalid biome values', () => {
      expect(() => {
        renderer.setBiome('invalid');
      }).to.not.throw();

      expect(() => {
        renderer.setBiome(NaN);
      }).to.not.throw();
    });
  });
});
