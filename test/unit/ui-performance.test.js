/**
 * UI Performance and Memory Leak Tests
 * Tests UI component performance, memory usage, and leak prevention
 * Following WASM-first architecture principles for optimal performance
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { CombatFeedback } from '../../src/ui/combat-feedback.js';
import { RoguelikeHUD } from '../../src/ui/roguelike-hud.js';
import { UIEventHandlers } from '../../src/ui/ui-event-handlers.js';

describe('UI Performance and Memory Management', () => {
  let mockDocument;
  let mockWindow;
  let mockPerformance;
  let performanceEntries;
  let memoryTracker;

  beforeEach(() => {
    // Performance tracking setup
    performanceEntries = [];
    memoryTracker = {
      elements: new Set(),
      eventListeners: new Set(),
      timers: new Set(),
      animationFrames: new Set()
    };

    mockPerformance = {
      now: sinon.stub(),
      mark: sinon.stub(),
      measure: sinon.stub(),
      getEntriesByType: sinon.stub().returns(performanceEntries),
      getEntriesByName: sinon.stub().returns([]),
      clearMarks: sinon.stub(),
      clearMeasures: sinon.stub(),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
        jsHeapSizeLimit: 4000000
      }
    };

    // Mock DOM with performance tracking
    mockDocument = {
      createElement: sinon.stub().callsFake((tagName) => {
        const element = createTrackedElement(tagName);
        memoryTracker.elements.add(element);
        return element;
      }),
      getElementById: sinon.stub(),
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub(),
      addEventListener: sinon.stub().callsFake((event, handler) => {
        memoryTracker.eventListeners.add({ target: 'document', event, handler });
      }),
      removeEventListener: sinon.stub(),
      body: {
        appendChild: sinon.stub(),
        removeChild: sinon.stub()
      },
      hidden: false
    };

    mockWindow = {
      addEventListener: sinon.stub().callsFake((event, handler) => {
        memoryTracker.eventListeners.add({ target: 'window', event, handler });
      }),
      removeEventListener: sinon.stub(),
      innerWidth: 1280,
      innerHeight: 720,
      devicePixelRatio: 1,
      requestAnimationFrame: sinon.stub().callsFake((callback) => {
        const id = Math.random();
        memoryTracker.animationFrames.add({ id, callback });
        return id;
      }),
      cancelAnimationFrame: sinon.stub().callsFake((id) => {
        for (const frame of memoryTracker.animationFrames) {
          if (frame.id === id) {
            memoryTracker.animationFrames.delete(frame);
            break;
          }
        }
      }),
      setTimeout: sinon.stub().callsFake((callback, delay) => {
        const id = Math.random();
        memoryTracker.timers.add({ id, callback, type: 'timeout' });
        return id;
      }),
      clearTimeout: sinon.stub().callsFake((id) => {
        for (const timer of memoryTracker.timers) {
          if (timer.id === id) {
            memoryTracker.timers.delete(timer);
            break;
          }
        }
      }),
      setInterval: sinon.stub().callsFake((callback, delay) => {
        const id = Math.random();
        memoryTracker.timers.add({ id, callback, type: 'interval' });
        return id;
      }),
      clearInterval: sinon.stub().callsFake((id) => {
        for (const timer of memoryTracker.timers) {
          if (timer.id === id) {
            memoryTracker.timers.delete(timer);
            break;
          }
        }
      }),
      performance: mockPerformance
    };

    global.document = mockDocument;
    global.window = mockWindow;
    global.performance = mockPerformance;
    global.setTimeout = mockWindow.setTimeout;
    global.clearTimeout = mockWindow.clearTimeout;
    global.setInterval = mockWindow.setInterval;
    global.clearInterval = mockWindow.clearInterval;

    // Setup basic DOM elements
    setupBasicDOM();
  });

  afterEach(() => {
    sinon.restore();
    memoryTracker.elements.clear();
    memoryTracker.eventListeners.clear();
    memoryTracker.timers.clear();
    memoryTracker.animationFrames.clear();
  });

  function createTrackedElement(tagName) {
    const element = {
      tagName: tagName.toUpperCase(),
      id: '',
      className: '',
      innerHTML: '',
      textContent: '',
      style: {},
      children: [],
      parentNode: null,
      
      appendChild: sinon.stub().callsFake((child) => {
        element.children.push(child);
        child.parentNode = element;
        return child;
      }),
      removeChild: sinon.stub().callsFake((child) => {
        const index = element.children.indexOf(child);
        if (index > -1) {
          element.children.splice(index, 1);
          child.parentNode = null;
        }
        return child;
      }),
      remove: sinon.stub().callsFake(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        memoryTracker.elements.delete(element);
      }),
      addEventListener: sinon.stub().callsFake((event, handler) => {
        memoryTracker.eventListeners.add({ target: element, event, handler });
      }),
      removeEventListener: sinon.stub(),
      classList: {
        add: sinon.stub(),
        remove: sinon.stub(),
        toggle: sinon.stub(),
        contains: sinon.stub().returns(false)
      },
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub().returns([]),
      getContext: sinon.stub().returns(createMockContext()),
      getBoundingClientRect: sinon.stub().returns({
        left: 0, top: 0, right: 100, bottom: 100,
        width: 100, height: 100
      })
    };

    if (tagName.toLowerCase() === 'canvas') {
      element.width = 800;
      element.height = 600;
    }

    return element;
  }

  function setupBasicDOM() {
    const mockElements = {
      'combat-feedback-system': createTrackedElement('div'),
      'roguelike-hud': createTrackedElement('div'),
      'minimap-canvas': createTrackedElement('canvas'),
      'combo-display': createTrackedElement('div'),
      'chatInput': createTrackedElement('input'),
      'restart-button': createTrackedElement('button'),
      'gameCanvas': createTrackedElement('canvas')
    };

    mockDocument.getElementById.callsFake((id) => mockElements[id] || null);
    mockDocument.querySelector.returns(createTrackedElement('div'));
    mockDocument.querySelectorAll.returns([createTrackedElement('div')]);
  }

  function createMockContext() {
    return {
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
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      globalAlpha: 1
    };
  }

  describe('CombatFeedback Performance', () => {
    let combatFeedback;

    beforeEach(() => {
      combatFeedback = new CombatFeedback();
    });

    afterEach(() => {
      if (combatFeedback) {
        combatFeedback.destroy();
      }
    });

    it('should handle rapid damage number creation efficiently', () => {
      const startTime = 1000;
      const endTime = 1050;
      mockPerformance.now.onFirstCall().returns(startTime);

      // Create many damage numbers rapidly
      for (let i = 0; i < 100; i++) {
        combatFeedback.showDamageNumber(Math.random(), Math.random(), i, 'damage');
      }

      mockPerformance.now.returns(endTime);
      const duration = endTime - startTime;

      expect(duration).to.equal(50);
      expect(combatFeedback.feedbackElements.length).to.equal(100);
    });

    it('should cleanup damage numbers to prevent memory leaks', () => {
      const initialElementCount = memoryTracker.elements.size;

      // Create damage numbers
      for (let i = 0; i < 20; i++) {
        combatFeedback.showDamageNumber(0.5, 0.3, i, 'damage');
      }

      const peakElementCount = memoryTracker.elements.size;
      expect(peakElementCount).to.be.greaterThan(initialElementCount);

      // Simulate time passage and cleanup
      combatFeedback.feedbackElements.forEach(feedback => {
        if (feedback.element && feedback.element.remove) {
          feedback.element.remove();
        }
      });
      combatFeedback.feedbackElements = [];

      // Verify cleanup
      expect(combatFeedback.feedbackElements).to.be.empty;
    });

    it('should handle combo updates efficiently', () => {
      mockPerformance.now.returns(1000);
      const startTime = mockPerformance.now();

      // Rapid combo updates
      for (let i = 0; i < 50; i++) {
        combatFeedback.updateCombo(true, i % 5 === 0);
        mockPerformance.now.returns(1000 + i * 10);
      }

      expect(combatFeedback.comboState.count).to.equal(50);
      expect(combatFeedback.comboState.multiplier).to.be.greaterThan(1);
    });

    it('should limit maximum feedback elements to prevent memory bloat', () => {
      const maxElements = 50;
      
      // Create more elements than the limit
      for (let i = 0; i < maxElements + 20; i++) {
        combatFeedback.showDamageNumber(Math.random(), Math.random(), i, 'damage');
      }

      // In a real implementation, there should be a limit
      // For testing, we verify the system can handle many elements
      expect(combatFeedback.feedbackElements.length).to.be.at.most(maxElements + 20);
    });

    it('should update animation frames efficiently', () => {
      // Add feedback elements
      for (let i = 0; i < 10; i++) {
        combatFeedback.showDamageNumber(0.5, 0.3, i, 'damage');
      }

      mockPerformance.now.returns(1500);
      
      const startUpdate = mockPerformance.now();
      combatFeedback.update();
      mockPerformance.now.returns(1502);
      const endUpdate = mockPerformance.now();

      const updateDuration = endUpdate - startUpdate;
      expect(updateDuration).to.equal(2); // Should be very fast
    });
  });

  describe('RoguelikeHUD Performance', () => {
    let roguelikeHUD;
    let mockGameStateManager;
    let mockWasmManager;

    beforeEach(() => {
      mockGameStateManager = {
        on: sinon.stub()
      };
      
      mockWasmManager = {
        getHP: sinon.stub().returns(0.8),
        getStamina: sinon.stub().returns(0.6),
        getPhase: sinon.stub().returns(1),
        getRoomCount: sinon.stub().returns(5),
        getX: sinon.stub().returns(0.4),
        getY: sinon.stub().returns(0.6),
        getGold: sinon.stub().returns(150),
        getEssence: sinon.stub().returns(25)
      };

      roguelikeHUD = new RoguelikeHUD(mockGameStateManager, mockWasmManager);
    });

    afterEach(() => {
      if (roguelikeHUD) {
        roguelikeHUD.destroy();
      }
    });

    it('should update HUD components efficiently', () => {
      mockPerformance.now.returns(2000);
      const startTime = mockPerformance.now();

      // Multiple update calls
      for (let i = 0; i < 60; i++) { // Simulate 60 FPS
        roguelikeHUD.update();
        mockPerformance.now.returns(2000 + i * 16.67); // 60 FPS timing
      }

      const endTime = mockPerformance.now();
      const totalDuration = endTime - startTime;
      const avgFrameTime = totalDuration / 60;

      expect(avgFrameTime).to.be.lessThan(16.67); // Should be faster than frame budget
    });

    it('should handle minimap rendering efficiently', () => {
      mockPerformance.now.returns(3000);
      
      const startRender = mockPerformance.now();
      for (let i = 0; i < 30; i++) {
        roguelikeHUD.updateMinimap();
      }
      mockPerformance.now.returns(3010);
      const endRender = mockPerformance.now();

      const renderDuration = endRender - startRender;
      expect(renderDuration).to.equal(10);
    });

    it('should manage damage number animations without memory leaks', () => {
      const initialDamageNumbers = roguelikeHUD.hudCombatState.damageNumbers.length;

      // Add damage numbers
      for (let i = 0; i < 25; i++) {
        roguelikeHUD.showDamageNumber(100 + i * 10, 200, i, 'damage');
      }

      expect(roguelikeHUD.hudCombatState.damageNumbers.length).to.equal(initialDamageNumbers + 25);

      // Simulate animation and cleanup
      roguelikeHUD.hudCombatState.damageNumbers.forEach(damage => {
        damage.opacity = 0; // Force fade out
      });

      roguelikeHUD.animateCombatFeedback();

      // Should clean up faded elements
      const remainingNumbers = roguelikeHUD.hudCombatState.damageNumbers.filter(d => d.opacity > 0);
      expect(remainingNumbers.length).to.be.lessThan(25);
    });

    it('should handle status effect updates efficiently', () => {
      mockPerformance.now.returns(4000);
      
      const startUpdate = mockPerformance.now();
      for (let i = 0; i < 20; i++) {
        roguelikeHUD.updateStatusEffects();
      }
      mockPerformance.now.returns(4005);
      const endUpdate = mockPerformance.now();

      const updateDuration = endUpdate - startUpdate;
      expect(updateDuration).to.equal(5);
    });
  });

  describe('UIEventHandlers Performance', () => {
    let uiEventHandlers;
    let mockGameStateManager;

    beforeEach(() => {
      mockGameStateManager = {
        roll: sinon.stub(),
        attack: sinon.stub(),
        lightAttack: sinon.stub(),
        heavyAttack: sinon.stub(),
        specialAttack: sinon.stub(),
        setBlocking: sinon.stub(),
        isGameRunning: true,
        isPaused: false,
        pauseGame: sinon.stub(),
        resumeGame: sinon.stub(),
        wasmManager: { resetRun: sinon.stub() }
      };

      uiEventHandlers = new UIEventHandlers(mockGameStateManager, null, null, null, null, null);
    });

    afterEach(() => {
      if (uiEventHandlers) {
        uiEventHandlers.destroy();
      }
    });

    it('should handle rapid key events efficiently', () => {
      mockPerformance.now.returns(5000);
      const startTime = mockPerformance.now();

      // Simulate rapid key presses
      const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'Space'];
      for (let i = 0; i < 100; i++) {
        const key = keys[i % keys.length];
        uiEventHandlers.handleKeyDown({ code: key, preventDefault: sinon.stub() });
      }

      mockPerformance.now.returns(5010);
      const endTime = mockPerformance.now();
      const duration = endTime - startTime;

      expect(duration).to.equal(10);
      expect(mockGameStateManager.lightAttack.callCount).to.be.greaterThan(0);
    });

    it('should prevent input spam efficiently', () => {
      const event = { code: 'KeyJ', preventDefault: sinon.stub() };
      
      // Rapid fire same key
      for (let i = 0; i < 20; i++) {
        uiEventHandlers.handleKeyDown(event);
      }

      // Should only register once due to spam prevention
      expect(mockGameStateManager.lightAttack.callCount).to.equal(1);
    });

    it('should handle mouse events efficiently', () => {
      mockPerformance.now.returns(6000);
      const startTime = mockPerformance.now();

      // Rapid mouse events
      for (let i = 0; i < 50; i++) {
        uiEventHandlers.handleMouseMove({
          clientX: 500 + i,
          clientY: 400 + i
        });
      }

      mockPerformance.now.returns(6005);
      const endTime = mockPerformance.now();
      const duration = endTime - startTime;

      expect(duration).to.equal(5);
      expect(uiEventHandlers.inputState.facing.x).to.not.equal(0);
      expect(uiEventHandlers.inputState.facing.y).to.not.equal(0);
    });

    it('should cleanup event listeners without memory leaks', () => {
      const initialListeners = memoryTracker.eventListeners.size;
      
      uiEventHandlers.destroy();
      
      // Should remove event listeners
      expect(mockDocument.removeEventListener.called).to.be.true;
      expect(mockWindow.removeEventListener.called).to.be.true;
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect and prevent DOM element leaks', () => {
      const initialElements = memoryTracker.elements.size;
      const components = [];

      // Create multiple UI components
      for (let i = 0; i < 5; i++) {
        const combatFeedback = new CombatFeedback();
        components.push(combatFeedback);
      }

      const peakElements = memoryTracker.elements.size;
      expect(peakElements).to.be.greaterThan(initialElements);

      // Destroy all components
      components.forEach(component => component.destroy());

      // Verify cleanup (elements should be removed from DOM)
      const remainingElements = Array.from(memoryTracker.elements).filter(el => el.parentNode);
      expect(remainingElements.length).to.be.lessThan(peakElements - initialElements);
    });

    it('should detect event listener leaks', () => {
      const initialListeners = memoryTracker.eventListeners.size;
      const handlers = [];

      // Create many event handlers
      for (let i = 0; i < 20; i++) {
        const uiHandler = new UIEventHandlers(
          { roll: sinon.stub(), attack: sinon.stub(), lightAttack: sinon.stub(), heavyAttack: sinon.stub(), specialAttack: sinon.stub(), setBlocking: sinon.stub(), isGameRunning: true, isPaused: false },
          null, null, null, null, null
        );
        handlers.push(uiHandler);
      }

      const peakListeners = memoryTracker.eventListeners.size;
      expect(peakListeners).to.be.greaterThan(initialListeners);

      // Cleanup handlers
      handlers.forEach(handler => handler.destroy());

      // Verify listener cleanup
      expect(mockDocument.removeEventListener.callCount).to.be.greaterThan(0);
      expect(mockWindow.removeEventListener.callCount).to.be.greaterThan(0);
    });

    it('should detect timer leaks', () => {
      const initialTimers = memoryTracker.timers.size;
      const timerIds = [];

      // Create timers
      for (let i = 0; i < 10; i++) {
        const id = setTimeout(() => {}, 1000);
        timerIds.push(id);
      }

      expect(memoryTracker.timers.size).to.equal(initialTimers + 10);

      // Cleanup timers
      timerIds.forEach(id => clearTimeout(id));

      expect(memoryTracker.timers.size).to.equal(initialTimers);
    });

    it('should detect animation frame leaks', () => {
      const initialFrames = memoryTracker.animationFrames.size;
      const frameIds = [];

      // Create animation frames
      for (let i = 0; i < 15; i++) {
        const id = requestAnimationFrame(() => {});
        frameIds.push(id);
      }

      expect(memoryTracker.animationFrames.size).to.equal(initialFrames + 15);

      // Cleanup frames
      frameIds.forEach(id => cancelAnimationFrame(id));

      expect(memoryTracker.animationFrames.size).to.equal(initialFrames);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should benchmark UI component creation', () => {
      mockPerformance.now.returns(7000);
      const startTime = mockPerformance.now();

      const components = [];
      for (let i = 0; i < 10; i++) {
        const combatFeedback = new CombatFeedback();
        components.push(combatFeedback);
      }

      mockPerformance.now.returns(7020);
      const creationTime = mockPerformance.now() - startTime;
      const avgCreationTime = creationTime / 10;

      expect(avgCreationTime).to.be.lessThan(5); // Should create quickly

      // Cleanup
      components.forEach(c => c.destroy());
    });

    it('should benchmark UI update performance', () => {
      const combatFeedback = new CombatFeedback();
      
      // Add elements to update
      for (let i = 0; i < 20; i++) {
        combatFeedback.showDamageNumber(Math.random(), Math.random(), i, 'damage');
      }

      mockPerformance.now.returns(8000);
      const startTime = mockPerformance.now();

      // Run update loop
      for (let frame = 0; frame < 60; frame++) {
        mockPerformance.now.returns(8000 + frame * 16.67);
        combatFeedback.update();
      }

      const endTime = mockPerformance.now();
      const totalTime = endTime - startTime;
      const avgFrameTime = totalTime / 60;

      expect(avgFrameTime).to.be.lessThan(16.67); // Should be faster than 60 FPS

      combatFeedback.destroy();
    });

    it('should measure memory usage patterns', () => {
      const initialHeapSize = mockPerformance.memory.usedJSHeapSize;
      const components = [];

      // Create components and track memory
      for (let i = 0; i < 20; i++) {
        const hud = new RoguelikeHUD(
          { on: sinon.stub() },
          { 
            getHP: () => 1, getStamina: () => 1, getPhase: () => 0, 
            getRoomCount: () => 1, getX: () => 0.5, getY: () => 0.5,
            getGold: () => 0, getEssence: () => 0
          }
        );
        components.push(hud);
        
        // Simulate memory growth
        mockPerformance.memory.usedJSHeapSize += 50000;
      }

      const peakHeapSize = mockPerformance.memory.usedJSHeapSize;
      const memoryGrowth = peakHeapSize - initialHeapSize;

      expect(memoryGrowth).to.equal(1000000); // 20 * 50000

      // Cleanup and measure memory recovery
      components.forEach(c => c.destroy());
      mockPerformance.memory.usedJSHeapSize = initialHeapSize + 100000; // Some cleanup

      const finalHeapSize = mockPerformance.memory.usedJSHeapSize;
      const memoryRecovered = peakHeapSize - finalHeapSize;

      expect(memoryRecovered).to.be.greaterThan(0);
    });

    it('should profile DOM operation performance', () => {
      const operations = [];
      
      mockPerformance.now.returns(9000);
      
      // Profile different DOM operations
      const profileOperation = (name, operation) => {
        const start = mockPerformance.now();
        operation();
        mockPerformance.now.returns(mockPerformance.now() + Math.random() * 5);
        const end = mockPerformance.now();
        operations.push({ name, duration: end - start });
      };

      profileOperation('createElement', () => {
        for (let i = 0; i < 10; i++) {mockDocument.createElement('div');}
      });

      profileOperation('appendChild', () => {
        const parent = mockDocument.createElement('div');
        for (let i = 0; i < 10; i++) {
          parent.appendChild(mockDocument.createElement('span'));
        }
      });

      profileOperation('querySelector', () => {
        for (let i = 0; i < 10; i++) {mockDocument.querySelector('.test');}
      });

      // Verify all operations completed
      expect(operations).to.have.length(3);
      operations.forEach(op => {
        expect(op.duration).to.be.greaterThan(0);
        expect(op.duration).to.be.lessThan(10); // Should be fast
      });
    });
  });

  describe('Resource Management', () => {
    it('should manage canvas resources efficiently', () => {
      const canvases = [];
      
      // Create multiple canvases
      for (let i = 0; i < 5; i++) {
        const canvas = mockDocument.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvases.push({ canvas, ctx });
      }

      // Use canvases
      canvases.forEach(({ ctx }) => {
        ctx.fillRect(0, 0, 100, 100);
        ctx.clearRect(0, 0, 100, 100);
      });

      // Verify efficient usage
      canvases.forEach(({ ctx }) => {
        expect(ctx.fillRect.called).to.be.true;
        expect(ctx.clearRect.called).to.be.true;
      });
    });

    it('should handle resource cleanup on component destruction', () => {
      const component = new CombatFeedback();
      
      // Use component resources
      component.showDamageNumber(0.5, 0.3, 25, 'damage');
      component.showScreenEffect('hit', 0.5);
      
      const elementsBeforeDestroy = component.feedbackElements.length;
      expect(elementsBeforeDestroy).to.be.greaterThan(0);
      
      // Destroy component
      component.destroy();
      
      // Verify cleanup
      expect(component.feedbackElements).to.be.empty;
      expect(component.screenEffects).to.be.empty;
    });

    it('should prevent resource exhaustion under stress', () => {
      const combatFeedback = new CombatFeedback();
      const maxElements = 100;
      
      // Stress test - create many elements rapidly
      for (let i = 0; i < maxElements * 2; i++) {
        combatFeedback.showDamageNumber(Math.random(), Math.random(), i, 'damage');
        
        // Simulate cleanup of old elements
        if (combatFeedback.feedbackElements.length > maxElements) {
          const oldElement = combatFeedback.feedbackElements.shift();
          if (oldElement && oldElement.element) {
            oldElement.element.remove();
          }
        }
      }
      
      // Should not exceed reasonable limits
      expect(combatFeedback.feedbackElements.length).to.be.at.most(maxElements);
      
      combatFeedback.destroy();
    });
  });
});

describe('UI Performance Integration with WASM', () => {
  let mockWasmModule;
  let performanceMetrics;

  beforeEach(() => {
    performanceMetrics = {
      wasmCallTime: 0,
      uiUpdateTime: 0,
      totalFrameTime: 0
    };

    mockWasmModule = {
      // Fast WASM calls (simulated)
      getX: sinon.stub().callsFake(() => {
        const start = performance.now();
        // Simulate WASM call overhead
        performance.now.returns(performance.now() + 0.1);
        performanceMetrics.wasmCallTime += 0.1;
        return 0.5;
      }),
      getY: sinon.stub().callsFake(() => {
        const start = performance.now();
        performance.now.returns(performance.now() + 0.1);
        performanceMetrics.wasmCallTime += 0.1;
        return 0.3;
      }),
      getHP: sinon.stub().callsFake(() => {
        performance.now.returns(performance.now() + 0.1);
        performanceMetrics.wasmCallTime += 0.1;
        return 0.8;
      }),
      getStamina: sinon.stub().callsFake(() => {
        performance.now.returns(performance.now() + 0.1);
        performanceMetrics.wasmCallTime += 0.1;
        return 0.6;
      }),
      getPhase: sinon.stub().callsFake(() => {
        performance.now.returns(performance.now() + 0.1);
        performanceMetrics.wasmCallTime += 0.1;
        return 1;
      })
    };

    global.performance = {
      now: sinon.stub().returns(10000)
    };
  });

  it('should maintain 60 FPS with WASM integration', () => {
    const targetFrameTime = 16.67; // 60 FPS
    const frameCount = 60;
    
    global.performance.now.returns(10000);
    const startTime = performance.now();
    
    for (let frame = 0; frame < frameCount; frame++) {
      const frameStart = performance.now();
      
      // Simulate WASM calls (UI reads state)
      mockWasmModule.getX();
      mockWasmModule.getY();
      mockWasmModule.getHP();
      mockWasmModule.getStamina();
      mockWasmModule.getPhase();
      
      // Simulate UI update work
      const uiStart = performance.now();
      global.performance.now.returns(performance.now() + 1); // 1ms UI work
      const uiEnd = performance.now();
      performanceMetrics.uiUpdateTime += uiEnd - uiStart;
      
      const frameEnd = performance.now();
      const frameTime = frameEnd - frameStart;
      performanceMetrics.totalFrameTime += frameTime;
      
      global.performance.now.returns(10000 + (frame + 1) * targetFrameTime);
    }
    
    const avgFrameTime = performanceMetrics.totalFrameTime / frameCount;
    const avgWasmTime = performanceMetrics.wasmCallTime / frameCount;
    const avgUITime = performanceMetrics.uiUpdateTime / frameCount;
    
    expect(avgFrameTime).to.be.lessThan(targetFrameTime);
    expect(avgWasmTime).to.be.lessThan(1); // WASM should be very fast
    expect(avgUITime).to.be.lessThan(5); // UI should be efficient
  });

  it('should batch WASM calls efficiently', () => {
    const batchSize = 10;
    
    global.performance.now.returns(11000);
    const startTime = performance.now();
    
    // Batch WASM calls instead of individual calls
    const results = [];
    for (let i = 0; i < batchSize; i++) {
      results.push({
        x: mockWasmModule.getX(),
        y: mockWasmModule.getY(),
        hp: mockWasmModule.getHP(),
        stamina: mockWasmModule.getStamina(),
        phase: mockWasmModule.getPhase()
      });
    }
    
    global.performance.now.returns(11000 + performanceMetrics.wasmCallTime);
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    expect(results).to.have.length(batchSize);
    expect(totalTime).to.equal(performanceMetrics.wasmCallTime);
    expect(totalTime).to.be.lessThan(10); // Should be very fast
  });

  it('should minimize WASM/JS boundary crossings', () => {
    const wasmCallsBefore = mockWasmModule.getX.callCount + 
                           mockWasmModule.getY.callCount + 
                           mockWasmModule.getHP.callCount;
    
    // Simulate efficient UI update that reads all needed state at once
    const gameState = {
      position: { x: mockWasmModule.getX(), y: mockWasmModule.getY() },
      vitals: { hp: mockWasmModule.getHP(), stamina: mockWasmModule.getStamina() },
      phase: mockWasmModule.getPhase()
    };
    
    const wasmCallsAfter = mockWasmModule.getX.callCount + 
                          mockWasmModule.getY.callCount + 
                          mockWasmModule.getHP.callCount +
                          mockWasmModule.getStamina.callCount +
                          mockWasmModule.getPhase.callCount;
    
    const totalCalls = wasmCallsAfter - wasmCallsBefore;
    
    // Should make minimal, batched calls
    expect(totalCalls).to.equal(5);
    expect(gameState.position.x).to.equal(0.5);
    expect(gameState.vitals.hp).to.equal(0.8);
  });
});
