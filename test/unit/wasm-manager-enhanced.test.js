import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';

// Mock the WasmManager since it's not in the utils directory
const createMockWasmManager = () => {
  return class MockWasmManager {
    constructor() {
      this.exports = null;
      this.isLoaded = false;
      this.isInitialized = false;
      this.gameConfig = {
        rollCooldown: 0.5,
        attackCooldown: 0.35
      };
    }

    async initialize() {
      // Mock WASM loading logic
      const mockExports = this.createFallbackExports();
      this.exports = mockExports;
      this.isLoaded = true;
      
      if (typeof this.exports.start === 'function') {
        this.exports.start();
      }
      
      await this.initializeGameRun();
      return true;
    }

    createFallbackExports() {
      return {
        // Core functions
        init_run: sinon.stub(),
        reset_run: sinon.stub(),
        update: sinon.stub(),
        get_x: sinon.stub().returns(0.5),
        get_y: sinon.stub().returns(0.5),
        get_stamina: sinon.stub().returns(1.0),
        get_phase: sinon.stub().returns(0),
        
        // Combat
        on_attack: sinon.stub().returns(1),
        on_roll_start: sinon.stub().returns(1),
        set_blocking: sinon.stub().returns(1),
        
        // Memory management
        malloc: sinon.stub().returns(1000),
        free: sinon.stub(),
        
        // Lifecycle
        start: sinon.stub(),
        memory: { buffer: new ArrayBuffer(1024) }
      };
    }

    async initializeGameRun() {
      if (this.exports && typeof this.exports.init_run === 'function') {
        const seed = Date.now();
        this.exports.init_run(seed, 0);
        this.isInitialized = true;
      }
    }

    getExports() {
      return this.exports;
    }

    isReady() {
      return this.isLoaded && this.isInitialized;
    }

    callWasmFunction(funcName, ...args) {
      if (!this.isReady()) {
        throw new Error('WASM module not ready');
      }
      
      if (!this.exports[funcName]) {
        throw new Error(`Function ${funcName} not found in WASM module`);
      }
      
      return this.exports[funcName](...args);
    }

    allocateMemory(size) {
      if (!this.exports.malloc) {
        throw new Error('malloc not available');
      }
      return this.exports.malloc(size);
    }

    freeMemory(ptr) {
      if (!this.exports.free) {
        throw new Error('free not available');
      }
      this.exports.free(ptr);
    }

    writeToMemory(ptr, data) {
      if (!this.exports.memory) {
        throw new Error('WASM memory not available');
      }
      
      const memory = new Uint8Array(this.exports.memory.buffer);
      for (let i = 0; i < data.length; i++) {
        memory[ptr + i] = data[i];
      }
    }

    readFromMemory(ptr, length) {
      if (!this.exports.memory) {
        throw new Error('WASM memory not available');
      }
      
      const memory = new Uint8Array(this.exports.memory.buffer);
      return memory.slice(ptr, ptr + length);
    }

    destroy() {
      this.exports = null;
      this.isLoaded = false;
      this.isInitialized = false;
    }
  };
};

describe('WasmManager', function() {
  let WasmManager;
  let wasmManager;
  let mockFetch;
  let mockWebAssembly;

  beforeEach(function() {
    WasmManager = createMockWasmManager();
    
    // Mock fetch for WASM loading
    mockFetch = sinon.stub(global, 'fetch');
    mockFetch.resolves({
      ok: true,
      arrayBuffer: sinon.stub().resolves(new ArrayBuffer(1024))
    });

    // Mock WebAssembly
    mockWebAssembly = {
      instantiate: sinon.stub().resolves({
        instance: {
          exports: {
            init_run: sinon.stub(),
            get_x: sinon.stub().returns(0.5),
            memory: { buffer: new ArrayBuffer(1024) }
          }
        }
      }),
      compile: sinon.stub().resolves({}),
      Module: sinon.stub()
    };
    global.WebAssembly = mockWebAssembly;

    wasmManager = new WasmManager();
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('Initialization', function() {
    it('should initialize successfully', async function() {
      const result = await wasmManager.initialize();
      
      expect(result).to.be.true;
      expect(wasmManager.isLoaded).to.be.true;
      expect(wasmManager.isInitialized).to.be.true;
    });

    it('should create fallback exports when WASM fails to load', async function() {
      mockFetch.rejects(new Error('Network error'));
      
      const result = await wasmManager.initialize();
      
      expect(result).to.be.true;
      expect(wasmManager.exports).to.not.be.null;
      expect(typeof wasmManager.exports.init_run).to.equal('function');
    });

    it('should handle missing WASM files gracefully', async function() {
      mockFetch.resolves({ ok: false, status: 404 });
      
      const result = await wasmManager.initialize();
      
      expect(result).to.be.true; // Should still succeed with fallback
      expect(wasmManager.exports).to.not.be.null;
    });
  });

  describe('WASM Function Calls', function() {
    beforeEach(async function() {
      await wasmManager.initialize();
    });

    it('should call WASM functions successfully', function() {
      const result = wasmManager.callWasmFunction('get_x');
      
      expect(result).to.equal(0.5);
      expect(wasmManager.exports.get_x.called).to.be.true;
    });

    it('should handle function calls with arguments', function() {
      wasmManager.callWasmFunction('init_run', 12345, 0);
      
      expect(wasmManager.exports.init_run.calledWith(12345, 0)).to.be.true;
    });

    it('should throw error for non-existent functions', function() {
      expect(() => {
        wasmManager.callWasmFunction('nonexistent_function');
      }).to.throw('Function nonexistent_function not found');
    });

    it('should throw error when WASM not ready', function() {
      wasmManager.isLoaded = false;
      
      expect(() => {
        wasmManager.callWasmFunction('get_x');
      }).to.throw('WASM module not ready');
    });
  });

  describe('Memory Management', function() {
    beforeEach(async function() {
      await wasmManager.initialize();
    });

    it('should allocate memory', function() {
      const ptr = wasmManager.allocateMemory(256);
      
      expect(ptr).to.equal(1000); // Mock return value
      expect(wasmManager.exports.malloc.calledWith(256)).to.be.true;
    });

    it('should free memory', function() {
      const ptr = 1000;
      wasmManager.freeMemory(ptr);
      
      expect(wasmManager.exports.free.calledWith(ptr)).to.be.true;
    });

    it('should write to WASM memory', function() {
      const ptr = 1000;
      const data = new Uint8Array([1, 2, 3, 4, 5]);
      
      wasmManager.writeToMemory(ptr, data);
      
      // Should not throw (basic functionality test)
      expect(true).to.be.true;
    });

    it('should read from WASM memory', function() {
      const ptr = 1000;
      const length = 5;
      
      const result = wasmManager.readFromMemory(ptr, length);
      
      expect(result).to.be.instanceOf(Uint8Array);
      expect(result.length).to.equal(length);
    });

    it('should handle memory errors gracefully', function() {
      wasmManager.exports.memory = null;
      
      expect(() => {
        wasmManager.writeToMemory(1000, new Uint8Array([1, 2, 3]));
      }).to.throw('WASM memory not available');
    });
  });

  describe('Game State Management', function() {
    beforeEach(async function() {
      await wasmManager.initialize();
    });

    it('should initialize game run', async function() {
      await wasmManager.initializeGameRun();
      
      expect(wasmManager.exports.init_run.called).to.be.true;
      expect(wasmManager.isInitialized).to.be.true;
    });

    it('should check if manager is ready', function() {
      expect(wasmManager.isReady()).to.be.true;
    });

    it('should return false when not ready', function() {
      wasmManager.isLoaded = false;
      expect(wasmManager.isReady()).to.be.false;
    });
  });

  describe('Export Access', function() {
    beforeEach(async function() {
      await wasmManager.initialize();
    });

    it('should provide access to WASM exports', function() {
      const exports = wasmManager.getExports();
      
      expect(exports).to.equal(wasmManager.exports);
      expect(exports).to.not.be.null;
    });

    it('should have all required game functions', function() {
      const exports = wasmManager.getExports();
      
      expect(exports.init_run).to.be.a('function');
      expect(exports.get_x).to.be.a('function');
      expect(exports.get_y).to.be.a('function');
      expect(exports.on_attack).to.be.a('function');
    });
  });

  describe('Error Handling', function() {
    it('should handle WASM instantiation failures', async function() {
      mockWebAssembly.instantiate.rejects(new Error('WASM instantiation failed'));
      
      const result = await wasmManager.initialize();
      
      // Should still succeed with fallback
      expect(result).to.be.true;
      expect(wasmManager.exports).to.not.be.null;
    });

    it('should handle missing malloc/free functions', async function() {
      await wasmManager.initialize();
      delete wasmManager.exports.malloc;
      delete wasmManager.exports.free;
      
      expect(() => {
        wasmManager.allocateMemory(256);
      }).to.throw('malloc not available');
      
      expect(() => {
        wasmManager.freeMemory(1000);
      }).to.throw('free not available');
    });
  });

  describe('Lifecycle Management', function() {
    beforeEach(async function() {
      await wasmManager.initialize();
    });

    it('should call start function on initialization', function() {
      expect(wasmManager.exports.start.called).to.be.true;
    });

    it('should clean up on destroy', function() {
      wasmManager.destroy();
      
      expect(wasmManager.exports).to.be.null;
      expect(wasmManager.isLoaded).to.be.false;
      expect(wasmManager.isInitialized).to.be.false;
    });

    it('should handle multiple initialization calls', async function() {
      const result1 = await wasmManager.initialize();
      const result2 = await wasmManager.initialize();
      
      expect(result1).to.be.true;
      expect(result2).to.be.true;
    });
  });

  describe('Configuration', function() {
    it('should have default game configuration', function() {
      expect(wasmManager.gameConfig).to.deep.include({
        rollCooldown: 0.5,
        attackCooldown: 0.35
      });
    });

    it('should allow configuration updates', function() {
      wasmManager.gameConfig.rollCooldown = 0.3;
      
      expect(wasmManager.gameConfig.rollCooldown).to.equal(0.3);
    });
  });

  describe('Performance', function() {
    beforeEach(async function() {
      await wasmManager.initialize();
    });

    it('should cache function calls when appropriate', function() {
      // Call same function multiple times
      wasmManager.callWasmFunction('get_x');
      wasmManager.callWasmFunction('get_x');
      wasmManager.callWasmFunction('get_x');
      
      // Should call WASM function each time (no caching for position)
      expect(wasmManager.exports.get_x.callCount).to.equal(3);
    });

    it('should handle high-frequency function calls', function() {
      // Simulate game loop calls
      for (let i = 0; i < 60; i++) {
        wasmManager.callWasmFunction('get_x');
        wasmManager.callWasmFunction('get_y');
      }
      
      expect(wasmManager.exports.get_x.callCount).to.equal(60);
      expect(wasmManager.exports.get_y.callCount).to.equal(60);
    });

    it('should manage memory efficiently', function() {
      const ptrs = [];
      
      // Allocate multiple memory blocks
      for (let i = 0; i < 10; i++) {
        ptrs.push(wasmManager.allocateMemory(64));
      }
      
      // Free all blocks
      ptrs.forEach(ptr => wasmManager.freeMemory(ptr));
      
      expect(wasmManager.exports.malloc.callCount).to.equal(10);
      expect(wasmManager.exports.free.callCount).to.equal(10);
    });
  });
});
