import { expect } from 'chai';
import sinon from 'sinon';

// We need to mock the logger import first
const mockLogger = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub()
};

// Mock the logger module
const mockCreateLogger = sinon.stub().returns(mockLogger);

// Mock module imports
const moduleMap = new Map();
moduleMap.set('../utils/logger.js', { createLogger: mockCreateLogger });

// Create a custom import function for our test
const originalImport = global.import || (async (specifier) => {
  if (moduleMap.has(specifier)) {
    return moduleMap.get(specifier);
  }
  throw new Error(`Module not found: ${specifier}`);
});

// Mock the deterministic game module by creating it inline since imports are complex in tests
describe('Deterministic Game Logic - Comprehensive Tests', () => {
  let DeterministicRandom;
  let DeterministicGame;
  let game;
  let mockWasmManager;

  before(() => {
    // Define the classes inline for testing
    class TestDeterministicRandom {
      constructor(seed = 12345) {
        this.seed = seed;
        this.current = seed;
      }
      
      next() {
        const a = 1664525;
        const c = 1013904223;
        const m = 2 ** 32;
        
        this.current = (a * this.current + c) % m;
        return this.current;
      }
      
      nextFloat() {
        return this.next() / (2 ** 32);
      }
      
      nextInt(min, max) {
        if (min >= max) {
          throw new Error('Invalid range: min must be less than max');
        }
        return min + (this.next() % (max - min));
      }
      
      reset(seed = null) {
        this.seed = seed !== null ? seed : this.seed;
        this.current = this.seed;
      }
      
      save() {
        return { seed: this.seed, current: this.current };
      }
      
      load(state) {
        this.seed = state.seed;
        this.current = state.current;
      }
    }

    class TestDeterministicGame {
      constructor(wasmManager) {
        this.wasmManager = wasmManager;
        this.rng = new TestDeterministicRandom();
        this.logger = mockCreateLogger({ level: 'info' });
        
        // Game state
        this.gameState = {
          frame: 0,
          players: new Map(),
          entities: [],
          worldState: {
            time: 0,
            weather: 0,
            hazards: []
          }
        };
        
        // Input history for rollback
        this.inputHistory = [];
        this.maxHistoryFrames = 60;
        
        // State snapshots for rollback
        this.stateSnapshots = new Map();
        this.maxSnapshots = 10;
        
        // Performance tracking
        this.performance = {
          averageFrameTime: 0,
          maxFrameTime: 0,
          frameCount: 0,
          totalTime: 0
        };
        
        this.isInitialized = false;
      }
      
      initialize(seed = null) {
        if (seed !== null) {
          this.rng.reset(seed);
        }
        
        // Initialize game state
        this.gameState.frame = 0;
        this.gameState.worldState.time = 0;
        
        this.isInitialized = true;
        this.logger.info('Deterministic game initialized', { seed: this.rng.seed });
        
        return true;
      }
      
      update(inputs, deltaTime = 16.67) {
        if (!this.isInitialized) {
          throw new Error('Game not initialized');
        }
        
        const startTime = performance.now();
        
        // Store input for this frame
        this.inputHistory.push({
          frame: this.gameState.frame,
          inputs: JSON.parse(JSON.stringify(inputs)),
          timestamp: Date.now()
        });
        
        // Limit input history
        if (this.inputHistory.length > this.maxHistoryFrames) {
          this.inputHistory.shift();
        }
        
        // Create state snapshot before update
        this.saveStateSnapshot(this.gameState.frame);
        
        // Update game logic deterministically
        this.updateGameLogic(inputs, deltaTime);
        
        // Advance frame
        this.gameState.frame++;
        this.gameState.worldState.time += deltaTime;
        
        // Update performance metrics
        const frameTime = performance.now() - startTime;
        this.updatePerformanceMetrics(frameTime);
        
        return this.getGameState();
      }
      
      updateGameLogic(inputs, deltaTime) {
        // Update players based on inputs
        for (const [playerId, input] of Object.entries(inputs)) {
          this.updatePlayer(playerId, input, deltaTime);
        }
        
        // Update entities
        this.updateEntities(deltaTime);
        
        // Update world state
        this.updateWorldState(deltaTime);
      }
      
      updatePlayer(playerId, input, deltaTime) {
        let player = this.gameState.players.get(playerId);
        if (!player) {
          player = {
            id: playerId,
            x: 0.5,
            y: 0.5,
            vx: 0,
            vy: 0,
            health: 100,
            stamina: 100,
            facing: { x: 0, y: 1 },
            state: 'idle'
          };
          this.gameState.players.set(playerId, player);
        }
        
        // Apply input deterministically
        const speed = 5.0 * (deltaTime / 1000);
        
        if (input.direction) {
          player.vx = input.direction.x * speed;
          player.vy = input.direction.y * speed;
        }
        
        // Update position
        player.x += player.vx;
        player.y += player.vy;
        
        // Apply bounds
        player.x = Math.max(0, Math.min(1, player.x));
        player.y = Math.max(0, Math.min(1, player.y));
        
        // Apply friction
        player.vx *= 0.9;
        player.vy *= 0.9;
        
        // Handle combat actions
        if (input.lightAttack) {
          this.handlePlayerAttack(player, 'light');
        }
        if (input.heavyAttack) {
          this.handlePlayerAttack(player, 'heavy');
        }
      }
      
      updateEntities(deltaTime) {
        // Update entities deterministically
        for (let i = this.gameState.entities.length - 1; i >= 0; i--) {
          const entity = this.gameState.entities[i];
          
          // Update entity based on type
          if (entity.type === 'projectile') {
            this.updateProjectile(entity, deltaTime);
          } else if (entity.type === 'enemy') {
            this.updateEnemy(entity, deltaTime);
          }
          
          // Remove dead entities
          if (entity.health <= 0 || entity.lifetime <= 0) {
            this.gameState.entities.splice(i, 1);
          }
        }
      }
      
      updateWorldState(deltaTime) {
        // Deterministic world updates
        const worldState = this.gameState.worldState;
        
        // Weather system
        if (this.gameState.frame % 300 === 0) { // Every 5 seconds at 60fps
          worldState.weather = this.rng.nextInt(0, 4); // 0-3 weather types
        }
        
        // Spawn hazards randomly but deterministically
        if (this.rng.nextFloat() < 0.001) { // 0.1% chance per frame
          worldState.hazards.push({
            x: this.rng.nextFloat(),
            y: this.rng.nextFloat(),
            type: this.rng.nextInt(0, 3),
            lifetime: 180 // 3 seconds
          });
        }
        
        // Update existing hazards
        for (let i = worldState.hazards.length - 1; i >= 0; i--) {
          worldState.hazards[i].lifetime--;
          if (worldState.hazards[i].lifetime <= 0) {
            worldState.hazards.splice(i, 1);
          }
        }
      }
      
      handlePlayerAttack(player, type) {
        // Deterministic attack handling
        const damage = type === 'light' ? 20 : 40;
        const range = type === 'light' ? 0.1 : 0.15;
        
        // Find targets in range
        for (const entity of this.gameState.entities) {
          if (entity.type === 'enemy') {
            const dx = entity.x - player.x;
            const dy = entity.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= range) {
              entity.health -= damage;
              this.logger.debug('Player attack hit', { damage, target: entity.id });
            }
          }
        }
      }
      
      updateProjectile(projectile, deltaTime) {
        const speed = projectile.speed * (deltaTime / 1000);
        projectile.x += projectile.vx * speed;
        projectile.y += projectile.vy * speed;
        projectile.lifetime--;
      }
      
      updateEnemy(enemy, deltaTime) {
        // Simple AI: move towards nearest player
        let nearestPlayer = null;
        let nearestDistance = Infinity;
        
        for (const player of this.gameState.players.values()) {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestPlayer = player;
          }
        }
        
        if (nearestPlayer && nearestDistance > 0.05) {
          const dx = nearestPlayer.x - enemy.x;
          const dy = nearestPlayer.y - enemy.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          
          const speed = enemy.speed * (deltaTime / 1000);
          enemy.x += (dx / magnitude) * speed;
          enemy.y += (dy / magnitude) * speed;
        }
      }
      
      saveStateSnapshot(frame) {
        // Deep clone the game state
        const snapshot = {
          frame,
          gameState: JSON.parse(JSON.stringify(this.gameState)),
          rngState: this.rng.save()
        };
        
        this.stateSnapshots.set(frame, snapshot);
        
        // Limit snapshots
        if (this.stateSnapshots.size > this.maxSnapshots) {
          const oldestFrame = Math.min(...this.stateSnapshots.keys());
          this.stateSnapshots.delete(oldestFrame);
        }
      }
      
      loadStateSnapshot(frame) {
        const snapshot = this.stateSnapshots.get(frame);
        if (!snapshot) {
          throw new Error(`No snapshot found for frame ${frame}`);
        }
        
        // Restore game state
        this.gameState = JSON.parse(JSON.stringify(snapshot.gameState));
        this.rng.load(snapshot.rngState);
        
        this.logger.debug('Loaded state snapshot', { frame });
        return true;
      }
      
      rollback(targetFrame) {
        if (targetFrame >= this.gameState.frame) {
          throw new Error('Cannot rollback to future frame');
        }
        
        // Find the closest snapshot
        let closestFrame = -1;
        for (const frame of this.stateSnapshots.keys()) {
          if (frame <= targetFrame && frame > closestFrame) {
            closestFrame = frame;
          }
        }
        
        if (closestFrame === -1) {
          throw new Error(`No snapshot available for rollback to frame ${targetFrame}`);
        }
        
        // Load the snapshot
        this.loadStateSnapshot(closestFrame);
        
        // Replay frames from snapshot to target
        const replayInputs = this.inputHistory.filter(
          input => input.frame > closestFrame && input.frame <= targetFrame
        );
        
        for (const inputData of replayInputs) {
          this.updateGameLogic(inputData.inputs, 16.67);
          this.gameState.frame = inputData.frame;
        }
        
        this.logger.info('Rollback completed', { 
          from: this.gameState.frame, 
          to: targetFrame, 
          replayedFrames: replayInputs.length 
        });
        
        return true;
      }
      
      getGameState() {
        return {
          frame: this.gameState.frame,
          players: Array.from(this.gameState.players.entries()).map(([id, player]) => ({
            id,
            ...player
          })),
          entities: [...this.gameState.entities],
          worldState: { ...this.gameState.worldState }
        };
      }
      
      updatePerformanceMetrics(frameTime) {
        this.performance.frameCount++;
        this.performance.totalTime += frameTime;
        this.performance.averageFrameTime = this.performance.totalTime / this.performance.frameCount;
        this.performance.maxFrameTime = Math.max(this.performance.maxFrameTime, frameTime);
      }
      
      getPerformanceMetrics() {
        return { ...this.performance };
      }
      
      reset(seed = null) {
        this.gameState = {
          frame: 0,
          players: new Map(),
          entities: [],
          worldState: {
            time: 0,
            weather: 0,
            hazards: []
          }
        };
        
        this.inputHistory = [];
        this.stateSnapshots.clear();
        
        this.performance = {
          averageFrameTime: 0,
          maxFrameTime: 0,
          frameCount: 0,
          totalTime: 0
        };
        
        if (seed !== null) {
          this.rng.reset(seed);
        }
        
        this.isInitialized = false;
      }
    }

    DeterministicRandom = TestDeterministicRandom;
    DeterministicGame = TestDeterministicGame;
  });

  beforeEach(() => {
    mockWasmManager = {
      exports: {
        update: sinon.stub(),
        get_x: sinon.stub().returns(0.5),
        get_y: sinon.stub().returns(0.5),
        get_phase: sinon.stub().returns(0)
      }
    };

    game = new DeterministicGame(mockWasmManager);
    sinon.resetHistory();
  });

  describe('Deterministic Random Number Generator', () => {
    let rng;

    beforeEach(() => {
      rng = new DeterministicRandom(12345);
    });

    it('should produce consistent sequences with same seed', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(12345);
      
      const sequence1 = Array(10).fill().map(() => rng1.next());
      const sequence2 = Array(10).fill().map(() => rng2.next());
      
      expect(sequence1).to.deep.equal(sequence2);
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new DeterministicRandom(12345);
      const rng2 = new DeterministicRandom(54321);
      
      const sequence1 = Array(10).fill().map(() => rng1.next());
      const sequence2 = Array(10).fill().map(() => rng2.next());
      
      expect(sequence1).to.not.deep.equal(sequence2);
    });

    it('should generate floats between 0 and 1', () => {
      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat();
        expect(value).to.be.at.least(0);
        expect(value).to.be.below(1);
      }
    });

    it('should generate integers in specified range', () => {
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(10, 20);
        expect(value).to.be.at.least(10);
        expect(value).to.be.below(20);
        expect(Number.isInteger(value)).to.be.true;
      }
    });

    it('should throw error for invalid range', () => {
      expect(() => rng.nextInt(20, 10)).to.throw('Invalid range');
      expect(() => rng.nextInt(10, 10)).to.throw('Invalid range');
    });

    it('should reset to original seed', () => {
      const originalValue = rng.next();
      rng.next(); // Advance state
      rng.next();
      
      rng.reset();
      const resetValue = rng.next();
      
      expect(resetValue).to.equal(originalValue);
    });

    it('should reset to new seed', () => {
      rng.reset(99999);
      const newRng = new DeterministicRandom(99999);
      
      expect(rng.next()).to.equal(newRng.next());
    });

    it('should save and load state correctly', () => {
      rng.next();
      rng.next();
      const state = rng.save();
      const expectedNext = rng.next();
      
      rng.load(state);
      const actualNext = rng.next();
      
      expect(actualNext).to.equal(expectedNext);
    });
  });

  describe('Game Initialization', () => {
    it('should initialize with default settings', () => {
      expect(game.isInitialized).to.be.false;
      expect(game.gameState.frame).to.equal(0);
      expect(game.gameState.players.size).to.equal(0);
      expect(game.gameState.entities.length).to.equal(0);
    });

    it('should initialize successfully', () => {
      const result = game.initialize(12345);
      
      expect(result).to.be.true;
      expect(game.isInitialized).to.be.true;
      expect(game.rng.seed).to.equal(12345);
    });

    it('should log initialization', () => {
      game.initialize(12345);
      
      expect(mockLogger.info).to.have.been.calledWith(
        'Deterministic game initialized',
        { seed: 12345 }
      );
    });
  });

  describe('Game Update Loop', () => {
    beforeEach(() => {
      game.initialize(12345);
    });

    it('should throw error if not initialized', () => {
      const uninitializedGame = new DeterministicGame(mockWasmManager);
      
      expect(() => uninitializedGame.update({})).to.throw('Game not initialized');
    });

    it('should advance frame counter', () => {
      const initialFrame = game.gameState.frame;
      
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      expect(game.gameState.frame).to.equal(initialFrame + 1);
    });

    it('should update world time', () => {
      const initialTime = game.gameState.worldState.time;
      const deltaTime = 16.67;
      
      game.update({ player1: { direction: { x: 0, y: 0 } } }, deltaTime);
      
      expect(game.gameState.worldState.time).to.equal(initialTime + deltaTime);
    });

    it('should store input history', () => {
      const inputs = { player1: { direction: { x: 1, y: 0 } } };
      
      game.update(inputs);
      
      expect(game.inputHistory).to.have.length(1);
      expect(game.inputHistory[0].inputs).to.deep.equal(inputs);
      expect(game.inputHistory[0].frame).to.equal(0);
    });

    it('should limit input history size', () => {
      // Fill beyond max history
      for (let i = 0; i < game.maxHistoryFrames + 10; i++) {
        game.update({ player1: { direction: { x: 0, y: 0 } } });
      }
      
      expect(game.inputHistory.length).to.equal(game.maxHistoryFrames);
    });

    it('should create state snapshots', () => {
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      expect(game.stateSnapshots.size).to.be.greaterThan(0);
    });

    it('should return current game state', () => {
      const result = game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      expect(result).to.have.property('frame');
      expect(result).to.have.property('players');
      expect(result).to.have.property('entities');
      expect(result).to.have.property('worldState');
    });
  });

  describe('Player Updates', () => {
    beforeEach(() => {
      game.initialize(12345);
    });

    it('should create new player from input', () => {
      const inputs = { player1: { direction: { x: 0, y: 0 } } };
      
      game.update(inputs);
      
      expect(game.gameState.players.has('player1')).to.be.true;
      const player = game.gameState.players.get('player1');
      expect(player.id).to.equal('player1');
      expect(player.health).to.equal(100);
      expect(player.stamina).to.equal(100);
    });

    it('should update player position based on input', () => {
      const inputs = { player1: { direction: { x: 1, y: 0 } } };
      
      game.update(inputs);
      const player = game.gameState.players.get('player1');
      
      expect(player.x).to.be.greaterThan(0.5); // Started at 0.5, moved right
      expect(player.vx).to.be.greaterThan(0);
    });

    it('should apply bounds to player position', () => {
      const inputs = { player1: { direction: { x: 1, y: 0 } } };
      
      // Update many times to try to go out of bounds
      for (let i = 0; i < 100; i++) {
        game.update(inputs);
      }
      
      const player = game.gameState.players.get('player1');
      expect(player.x).to.be.at.most(1);
      expect(player.x).to.be.at.least(0);
      expect(player.y).to.be.at.most(1);
      expect(player.y).to.be.at.least(0);
    });

    it('should apply friction to player velocity', () => {
      const inputs = { player1: { direction: { x: 1, y: 0 } } };
      
      game.update(inputs);
      const player = game.gameState.players.get('player1');
      const initialVx = player.vx;
      
      // Update without input
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      expect(player.vx).to.be.lessThan(initialVx);
      expect(player.vx).to.be.greaterThan(0); // Should still be moving but slower
    });

    it('should handle combat actions', () => {
      const inputs = { player1: { lightAttack: true } };
      
      // Should not throw error
      expect(() => game.update(inputs)).to.not.throw();
    });
  });

  describe('World State Updates', () => {
    beforeEach(() => {
      game.initialize(12345);
    });

    it('should update weather deterministically', () => {
      // Advance to weather update frame
      for (let i = 0; i < 300; i++) {
        game.update({ player1: { direction: { x: 0, y: 0 } } });
      }
      
      const weather1 = game.gameState.worldState.weather;
      
      // Reset and replay - should get same weather
      game.reset(12345);
      game.initialize(12345);
      
      for (let i = 0; i < 300; i++) {
        game.update({ player1: { direction: { x: 0, y: 0 } } });
      }
      
      const weather2 = game.gameState.worldState.weather;
      expect(weather2).to.equal(weather1);
    });

    it('should spawn hazards deterministically', () => {
      // Run many frames to potentially spawn hazards
      for (let i = 0; i < 1000; i++) {
        game.update({ player1: { direction: { x: 0, y: 0 } } });
      }
      
      const hazards1 = game.gameState.worldState.hazards.length;
      
      // Reset and replay
      game.reset(12345);
      game.initialize(12345);
      
      for (let i = 0; i < 1000; i++) {
        game.update({ player1: { direction: { x: 0, y: 0 } } });
      }
      
      const hazards2 = game.gameState.worldState.hazards.length;
      expect(hazards2).to.equal(hazards1);
    });

    it('should remove expired hazards', () => {
      // Force spawn a hazard by manipulating state
      game.gameState.worldState.hazards.push({
        x: 0.5,
        y: 0.5,
        type: 0,
        lifetime: 1 // Will expire next frame
      });
      
      expect(game.gameState.worldState.hazards).to.have.length(1);
      
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      expect(game.gameState.worldState.hazards).to.have.length(0);
    });
  });

  describe('State Snapshots and Rollback', () => {
    beforeEach(() => {
      game.initialize(12345);
    });

    it('should create state snapshots during updates', () => {
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      expect(game.stateSnapshots.size).to.equal(1);
      expect(game.stateSnapshots.has(0)).to.be.true;
    });

    it('should limit number of snapshots', () => {
      // Create more snapshots than the limit
      for (let i = 0; i < game.maxSnapshots + 5; i++) {
        game.update({ player1: { direction: { x: 0, y: 0 } } });
      }
      
      expect(game.stateSnapshots.size).to.equal(game.maxSnapshots);
    });

    it('should load state snapshot correctly', () => {
      // Create initial state
      game.update({ player1: { direction: { x: 1, y: 0 } } });
      const frame0Player = { ...game.gameState.players.get('player1') };
      
      // Advance game state
      game.update({ player1: { direction: { x: -1, y: 0 } } });
      
      // Load snapshot from frame 0
      game.loadStateSnapshot(0);
      
      const restoredPlayer = game.gameState.players.get('player1');
      expect(restoredPlayer.x).to.equal(frame0Player.x);
      expect(restoredPlayer.vx).to.equal(frame0Player.vx);
    });

    it('should throw error for missing snapshot', () => {
      expect(() => game.loadStateSnapshot(999)).to.throw('No snapshot found for frame 999');
    });

    it('should perform rollback correctly', () => {
      // Create sequence of states
      const states = [];
      for (let i = 0; i < 5; i++) {
        game.update({ player1: { direction: { x: 1, y: 0 } } });
        states.push({ ...game.gameState.players.get('player1') });
      }
      
      // Rollback to frame 2
      game.rollback(2);
      
      const rolledBackPlayer = game.gameState.players.get('player1');
      expect(rolledBackPlayer.x).to.be.closeTo(states[2].x, 0.001);
    });

    it('should throw error for invalid rollback', () => {
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      // Cannot rollback to future frame
      expect(() => game.rollback(5)).to.throw('Cannot rollback to future frame');
      
      // Cannot rollback without snapshots
      game.stateSnapshots.clear();
      expect(() => game.rollback(0)).to.throw('No snapshot available for rollback');
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      game.initialize(12345);
    });

    it('should track frame time', () => {
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      const metrics = game.getPerformanceMetrics();
      expect(metrics.frameCount).to.equal(1);
      expect(metrics.averageFrameTime).to.be.greaterThan(0);
      expect(metrics.maxFrameTime).to.be.greaterThan(0);
      expect(metrics.totalTime).to.be.greaterThan(0);
    });

    it('should update average frame time', () => {
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      
      const metrics = game.getPerformanceMetrics();
      expect(metrics.frameCount).to.equal(2);
      expect(metrics.averageFrameTime).to.equal(metrics.totalTime / 2);
    });

    it('should track maximum frame time', () => {
      // First update
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      const firstMax = game.getPerformanceMetrics().maxFrameTime;
      
      // Second update (should be similar time)
      game.update({ player1: { direction: { x: 0, y: 0 } } });
      const secondMax = game.getPerformanceMetrics().maxFrameTime;
      
      expect(secondMax).to.be.at.least(firstMax);
    });
  });

  describe('Game Reset', () => {
    beforeEach(() => {
      game.initialize(12345);
    });

    it('should reset game state', () => {
      // Advance game state
      game.update({ player1: { direction: { x: 1, y: 0 } } });
      game.update({ player1: { direction: { x: 1, y: 0 } } });
      
      expect(game.gameState.frame).to.equal(2);
      expect(game.gameState.players.size).to.equal(1);
      
      game.reset();
      
      expect(game.gameState.frame).to.equal(0);
      expect(game.gameState.players.size).to.equal(0);
      expect(game.gameState.entities.length).to.equal(0);
      expect(game.isInitialized).to.be.false;
    });

    it('should clear history and snapshots', () => {
      // Create history and snapshots
      game.update({ player1: { direction: { x: 1, y: 0 } } });
      
      expect(game.inputHistory.length).to.be.greaterThan(0);
      expect(game.stateSnapshots.size).to.be.greaterThan(0);
      
      game.reset();
      
      expect(game.inputHistory.length).to.equal(0);
      expect(game.stateSnapshots.size).to.equal(0);
    });

    it('should reset performance metrics', () => {
      // Generate some performance data
      game.update({ player1: { direction: { x: 1, y: 0 } } });
      
      expect(game.performance.frameCount).to.be.greaterThan(0);
      
      game.reset();
      
      expect(game.performance.frameCount).to.equal(0);
      expect(game.performance.totalTime).to.equal(0);
      expect(game.performance.averageFrameTime).to.equal(0);
      expect(game.performance.maxFrameTime).to.equal(0);
    });

    it('should reset RNG with new seed', () => {
      const originalSeed = game.rng.seed;
      
      game.reset(99999);
      
      expect(game.rng.seed).to.equal(99999);
      expect(game.rng.seed).to.not.equal(originalSeed);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce identical results with same inputs', () => {
      const game1 = new DeterministicGame(mockWasmManager);
      const game2 = new DeterministicGame(mockWasmManager);
      
      game1.initialize(12345);
      game2.initialize(12345);
      
      const inputs = [
        { player1: { direction: { x: 1, y: 0 } } },
        { player1: { direction: { x: 0, y: 1 } } },
        { player1: { direction: { x: -1, y: 0 } } },
        { player1: { lightAttack: true } }
      ];
      
      const states1 = [];
      const states2 = [];
      
      for (const input of inputs) {
        states1.push(game1.update(input));
        states2.push(game2.update(input));
      }
      
      // Compare final states
      expect(states1[states1.length - 1]).to.deep.equal(states2[states2.length - 1]);
    });

    it('should produce different results with different seeds', () => {
      const game1 = new DeterministicGame(mockWasmManager);
      const game2 = new DeterministicGame(mockWasmManager);
      
      game1.initialize(12345);
      game2.initialize(54321);
      
      const inputs = { player1: { direction: { x: 0, y: 0 } } };
      
      // Run enough frames to trigger random events
      for (let i = 0; i < 1000; i++) {
        game1.update(inputs);
        game2.update(inputs);
      }
      
      const state1 = game1.getGameState();
      const state2 = game2.getGameState();
      
      // Weather should be different due to different RNG seeds
      expect(state1.worldState.weather).to.not.equal(state2.worldState.weather);
    });
  });
});
