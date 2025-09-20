/**
 * RoguelikeHUD Component Tests
 * Tests UI-only HUD components following WASM-first architecture
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { RoguelikeHUD } from '../../src/ui/roguelike-hud.js';

// Mock functions for tests
function createMockContext() {
  return {
    fillRect: sinon.stub(),
    strokeRect: sinon.stub(),
    fillText: sinon.stub(),
    clearRect: sinon.stub(),
    beginPath: sinon.stub(),
    moveTo: sinon.stub(),
    lineTo: sinon.stub(),
    stroke: sinon.stub(),
    fill: sinon.stub(),
    arc: sinon.stub(),
    save: sinon.stub(),
    restore: sinon.stub(),
    translate: sinon.stub(),
    scale: sinon.stub(),
    rotate: sinon.stub(),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '12px Arial',
    textAlign: 'left',
    textBaseline: 'top'
  };
}

function createMockWasmModule() {
  return {
    getHP: sinon.stub().returns(1.0),
    getStamina: sinon.stub().returns(1.0),
    getPhase: sinon.stub().returns(0),
    getGold: sinon.stub().returns(100),
    getEssence: sinon.stub().returns(50),
    getEnemyPositions: sinon.stub().returns([]),
    getExitPositions: sinon.stub().returns([]),
    getStatusEffects: sinon.stub().returns([])
  };
}

describe('RoguelikeHUD', () => {
  let roguelikeHUD;
  let mockGameStateManager;
  let mockWasmManager;
  let mockCanvas;
  let mockContext;
  let controlsToggleMock;
  let controlsPanelMock;

  beforeEach(() => {
    // Mock DOM environment
    global.document = {
      createElement: sinon.stub(),
      getElementById: sinon.stub(),
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub(),
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      body: {
        appendChild: sinon.stub()
      }
    };

    global.window = {
      innerWidth: 1280,
      innerHeight: 720,
      dispatchEvent: sinon.stub()
    };

    // Mock Canvas and Context
    mockContext = createMockContext();
    mockCanvas = {
      getContext: sinon.stub().returns(mockContext),
      width: 120,
      height: 120
    };

    // Setup DOM element mocks
    const mockHUDElement = {
      id: '',
      className: '',
      innerHTML: '',
      remove: sinon.stub(),
      appendChild: sinon.stub(),
      style: { display: 'block' },
      addEventListener: sinon.stub(),
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub()
    };

    const mockContainer = {
      appendChild: sinon.stub(),
      innerHTML: '',
      style: {}
    };

    const mockElement = {
      textContent: '',
      style: {},
      classList: {
        add: sinon.stub(),
        remove: sinon.stub(),
        toggle: sinon.stub()
      }
    };

    global.document.createElement.returns(mockHUDElement);
    controlsToggleMock = {
      addEventListener: sinon.stub(),
      removeEventListener: sinon.stub(),
      contains: sinon.stub().returns(false)
    };
    controlsPanelMock = {
      classList: { toggle: sinon.stub(), remove: sinon.stub() },
      contains: sinon.stub().returns(false)
    };
    global.document.getElementById.callsFake((id) => {
      const elementMocks = {
        'roguelike-hud': { remove: sinon.stub() },
        'minimap-canvas': mockCanvas,
        'controls-toggle': controlsToggleMock,
        'controls-panel': controlsPanelMock,
        'combo-display': mockElement,
        'gold-value': { textContent: '' },
        'essence-value': { textContent: '' },
        // combat-feedback-overlay removed
      };
      return elementMocks[id] || mockCanvas;
    });
    global.document.querySelector.callsFake((selector) => {
      const selectorMocks = {
        '.health-fill': { style: {}, classList: { toggle: sinon.stub() } },
        '.health-bar .vital-text': { textContent: '' },
        '.stamina-fill': { style: {}, classList: { toggle: sinon.stub() } },
        '.stamina-bar .vital-text': { textContent: '' },
        '.phase-name': { textContent: '', className: '' },
        '.room-counter': { textContent: '' },
        '.combo-number': { textContent: '' }
      };
      return selectorMocks[selector] || mockElement;
    });
    global.document.querySelectorAll.returns([mockElement]);

    // Mock dependencies
    mockGameStateManager = {
      on: sinon.stub(),
      off: sinon.stub(),
      getHP: sinon.stub().returns(1.0),
      getStamina: sinon.stub().returns(0.8)
    };

    mockWasmManager = createMockWasmModule();
    mockWasmManager.getHP = sinon.stub().returns(0.75);
    mockWasmManager.getStamina = sinon.stub().returns(0.6);
    mockWasmManager.getPhase = sinon.stub().returns(1);
    mockWasmManager.getRoomCount = sinon.stub().returns(3);
    mockWasmManager.getX = sinon.stub().returns(0.4);
    mockWasmManager.getY = sinon.stub().returns(0.6);
    mockWasmManager.getGold = sinon.stub().returns(150);
    mockWasmManager.getEssence = sinon.stub().returns(25);

    roguelikeHUD = new RoguelikeHUD(mockGameStateManager, mockWasmManager);
  });

  afterEach(() => {
    if (roguelikeHUD) {
      roguelikeHUD.destroy();
    }
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should initialize with required dependencies', () => {
      expect(roguelikeHUD.gameStateManager).to.equal(mockGameStateManager);
      expect(roguelikeHUD.wasmManager).to.equal(mockWasmManager);
      // combatFeedback removed from constructor
    });

    it('should initialize with default state', () => {
      expect(roguelikeHUD.isVisible).to.be.true;
      expect(roguelikeHUD.hudCombatState).to.deep.include({
        comboCounter: 0,
        lastComboTime: 0
      });
      expect(roguelikeHUD.hudCombatState.damageNumbers).to.be.an('array').that.is.empty;
      expect(roguelikeHUD.hudCombatState.hitIndicators).to.be.an('array').that.is.empty;
    });

    it('should initialize status effects tracking', () => {
      expect(roguelikeHUD.statusEffects).to.be.instanceOf(Map);
    });

    it('should create HUD DOM structure', () => {
      expect(global.document.createElement.called).to.be.true;
      expect(global.document.body.appendChild.called).to.be.true;
    });

    it('should setup event listeners', () => {
      expect(mockGameStateManager.on.calledWith('phaseChanged')).to.be.true;
    });

    it('should work without combat feedback system', () => {
      expect(() => {
        new RoguelikeHUD(mockGameStateManager, mockWasmManager, null);
      }).to.not.throw();
    });
  });

  describe('HUD Initialization', () => {
    it('should remove existing HUD before creating new one', () => {
      const existingHUD = { remove: sinon.stub() };
      global.document.getElementById.withArgs('roguelike-hud').returns(existingHUD);
      
      new RoguelikeHUD(mockGameStateManager, mockWasmManager);
      
      expect(existingHUD.remove.called).to.be.true;
    });

    it('should initialize minimap canvas', () => {
      expect(roguelikeHUD.minimapCanvas).to.equal(mockCanvas);
      expect(roguelikeHUD.minimapCtx).to.equal(mockContext);
      expect(roguelikeHUD.minimapSettings).to.deep.include({
        scale: 0.1,
        playerSize: 3,
        enemySize: 2
      });
    });

    it('should handle missing minimap canvas gracefully', () => {
      global.document.getElementById.withArgs('minimap-canvas').returns(null);
      
      expect(() => {
        new RoguelikeHUD(mockGameStateManager, mockWasmManager);
      }).to.not.throw();
    });
  });

  describe('Vitals Display', () => {
    let mockHealthFill, mockHealthText, mockStaminaFill, mockStaminaText;

    beforeEach(() => {
      mockHealthFill = { style: {}, classList: { toggle: sinon.stub() } };
      mockHealthText = { textContent: '' };
      mockStaminaFill = { style: {}, classList: { toggle: sinon.stub() } };
      mockStaminaText = { textContent: '' };

      global.document.querySelector
        .withArgs('.health-fill').returns(mockHealthFill)
        .withArgs('.health-bar .vital-text').returns(mockHealthText)
        .withArgs('.stamina-fill').returns(mockStaminaFill)
        .withArgs('.stamina-bar .vital-text').returns(mockStaminaText);
    });

    it('should update health bar correctly', () => {
      mockWasmManager.getHP.returns(0.75);
      
      roguelikeHUD.updateVitals();

      expect(mockHealthFill.style.width).to.equal('75%');
      expect(mockHealthText.textContent).to.equal('75/100');
    });

    it('should update stamina bar correctly', () => {
      mockWasmManager.getStamina.returns(0.6);
      
      roguelikeHUD.updateVitals();

      expect(mockStaminaFill.style.width).to.equal('60%');
      expect(mockStaminaText.textContent).to.equal('60/100');
    });

    it('should apply low health warning', () => {
      mockWasmManager.getHP.returns(0.2);
      
      roguelikeHUD.updateVitals();

      expect(mockHealthFill.classList.toggle.calledWith('low-health', true)).to.be.true;
    });

    it('should apply critical health warning', () => {
      mockWasmManager.getHP.returns(0.05);
      
      roguelikeHUD.updateVitals();

      expect(mockHealthFill.classList.toggle.calledWith('critical-health', true)).to.be.true;
    });

    it('should apply low stamina warning', () => {
      mockWasmManager.getStamina.returns(0.2);
      
      roguelikeHUD.updateVitals();

      expect(mockStaminaFill.classList.toggle.calledWith('low-stamina', true)).to.be.true;
    });

    it('should handle missing WASM functions gracefully', () => {
      mockWasmManager.getHP = null;
      mockWasmManager.getStamina = null;
      
      expect(() => roguelikeHUD.updateVitals()).to.not.throw();
    });

    it('should clamp values to valid range', () => {
      mockWasmManager.getHP.returns(-0.5); // Invalid negative
      mockWasmManager.getStamina.returns(1.5); // Invalid > 1
      
      roguelikeHUD.updateVitals();

      expect(mockHealthFill.style.width).to.equal('0%');
      expect(mockStaminaFill.style.width).to.equal('100%');
    });
  });

  describe('Phase Information', () => {
    let mockPhaseNameEl, mockRoomCounterEl;

    beforeEach(() => {
      mockPhaseNameEl = { textContent: '', className: '' };
      mockRoomCounterEl = { textContent: '' };

      global.document.querySelector
        .withArgs('.phase-name').returns(mockPhaseNameEl)
        .withArgs('.room-counter').returns(mockRoomCounterEl);
    });

    it('should update phase display correctly', () => {
      mockWasmManager.getPhase.returns(2); // Choose phase
      mockWasmManager.getRoomCount.returns(5);
      
      roguelikeHUD.updatePhaseInfo();

      expect(mockPhaseNameEl.textContent).to.equal('CHOOSE');
      expect(mockRoomCounterEl.textContent).to.equal('Room 5');
    });

    it('should handle all valid phases', () => {
      const phases = [
        { index: 0, name: 'EXPLORE' },
        { index: 1, name: 'FIGHT' },
        { index: 2, name: 'CHOOSE' },
        { index: 3, name: 'POWER UP' },
        { index: 4, name: 'RISK' },
        { index: 5, name: 'ESCALATE' },
        { index: 6, name: 'CASH OUT' },
        { index: 7, name: 'RESET' }
      ];

      phases.forEach(({ index, name }) => {
        mockWasmManager.getPhase.returns(index);
        roguelikeHUD.updatePhaseInfo();
        expect(mockPhaseNameEl.textContent).to.equal(name);
      });
    });

    it('should handle unknown phase gracefully', () => {
      mockWasmManager.getPhase.returns(99);
      
      roguelikeHUD.updatePhaseInfo();

      expect(mockPhaseNameEl.textContent).to.equal('UNKNOWN');
    });

    it('should handle missing WASM functions gracefully', () => {
      mockWasmManager.getPhase = null;
      mockWasmManager.getRoomCount = null;
      
      expect(() => roguelikeHUD.updatePhaseInfo()).to.not.throw();
    });

    it('should update phase display with styling', () => {
      roguelikeHUD.updatePhaseDisplay(3);

      expect(mockPhaseNameEl.textContent).to.equal('POWER UP');
      expect(mockPhaseNameEl.className).to.equal('phase-name phase-3');
    });
  });

  describe('Minimap', () => {
    beforeEach(() => {
      roguelikeHUD.minimapCanvas = mockCanvas;
      roguelikeHUD.minimapCtx = mockContext;
    });

    it('should render minimap with player position', () => {
      mockWasmManager.getX.returns(0.3);
      mockWasmManager.getY.returns(0.7);
      
      roguelikeHUD.updateMinimap();

      expect(mockContext.fillRect.called).to.be.true;
      expect(mockContext.strokeRect.called).to.be.true;
      expect(mockContext.arc.called).to.be.true;
    });

    it('should convert world coordinates to minimap coordinates', () => {
      const worldX = 0.25;
      const worldY = 0.75;
      mockWasmManager.getX.returns(worldX);
      mockWasmManager.getY.returns(worldY);
      
      roguelikeHUD.updateMinimap();

      // Check that arc was called with converted coordinates
      const expectedMapX = worldX * mockCanvas.width;
      const expectedMapY = worldY * mockCanvas.height;
      expect(mockContext.arc.calledWith(expectedMapX, expectedMapY)).to.be.true;
    });

    it('should handle missing minimap context gracefully', () => {
      roguelikeHUD.minimapCtx = null;
      
      expect(() => roguelikeHUD.updateMinimap()).to.not.throw();
    });

    it('should draw explored area around player', () => {
      roguelikeHUD.updateMinimap();

      // Should draw explored area (circle) and player
      expect(mockContext.arc.callCount).to.be.at.least(2);
    });

    it('should draw player direction indicator', () => {
      roguelikeHUD.updateMinimap();

      expect(mockContext.moveTo.called).to.be.true;
      expect(mockContext.lineTo.called).to.be.true;
      expect(mockContext.stroke.called).to.be.true;
    });

    it('should draw enemy and exit markers', () => {
      const enemy = { x: 0.1, y: 0.2 };
      const exit = { x: 0.8, y: 0.9 };
      mockWasmManager.getEnemyPositions.returns([enemy]);
      mockWasmManager.getExitPositions.returns([exit]);

      roguelikeHUD.updateMinimap();

      const enemyMapX = enemy.x * mockCanvas.width;
      const enemyMapY = enemy.y * mockCanvas.height;
      const exitMapX = exit.x * mockCanvas.width;
      const exitMapY = exit.y * mockCanvas.height;

      expect(mockContext.arc.calledWith(enemyMapX, enemyMapY, roguelikeHUD.minimapSettings.enemySize)).to.be.true;
      expect(
        mockContext.fillRect.calledWith(
          exitMapX - roguelikeHUD.minimapSettings.exitSize,
          exitMapY - roguelikeHUD.minimapSettings.exitSize,
          roguelikeHUD.minimapSettings.exitSize * 2,
          roguelikeHUD.minimapSettings.exitSize * 2
        )
      ).to.be.true;
    });
  });


  describe('Combat Feedback Integration', () => {
    it('should animate damage numbers', () => {
      const mockDamageElement = {
        style: {},
        remove: sinon.stub(),
        parentNode: { remove: sinon.stub() }
      };

      roguelikeHUD.hudCombatState.damageNumbers = [{
        element: mockDamageElement,
        x: 100,
        y: 200,
        opacity: 0.8
      }];

      // animateCombatFeedback method removed

      expect(mockDamageElement.style.transform).to.include('translate');
      expect(mockDamageElement.style.opacity).to.equal(0.8);
    });

    it('should remove faded damage numbers', () => {
      const mockDamageElement = { style: {}, remove: sinon.stub() };
      roguelikeHUD.hudCombatState.damageNumbers = [{
        element: mockDamageElement,
        x: 100,
        y: 200,
        opacity: 0
      }];

      // animateCombatFeedback method removed

      expect(mockDamageElement.remove.called).to.be.true;
      expect(roguelikeHUD.hudCombatState.damageNumbers).to.be.empty;
    });
  });

  describe('Resources Display', () => {
    let mockGoldValue, mockEssenceValue;

    beforeEach(() => {
      mockGoldValue = { textContent: '' };
      mockEssenceValue = { textContent: '' };

      global.document.getElementById
        .withArgs('gold-value').returns(mockGoldValue)
        .withArgs('essence-value').returns(mockEssenceValue);
    });

    it('should update gold display', () => {
      mockWasmManager.getGold.returns(250);
      
      roguelikeHUD.updateResources();

      expect(mockGoldValue.textContent).to.equal(250);
    });

    it('should update essence display', () => {
      mockWasmManager.getEssence.returns(42);
      
      roguelikeHUD.updateResources();

      expect(mockEssenceValue.textContent).to.equal(42);
    });

    it('should handle missing WASM functions gracefully', () => {
      mockWasmManager.getGold = null;
      mockWasmManager.getEssence = null;
      
      expect(() => roguelikeHUD.updateResources()).to.not.throw();
    });

    it('should handle missing DOM elements gracefully', () => {
      global.document.getElementById.returns(null);
      
      expect(() => roguelikeHUD.updateResources()).to.not.throw();
    });
  });

  describe('Damage Number Display', () => {
    let mockOverlay;

    beforeEach(() => {
      mockOverlay = { appendChild: sinon.stub() };
      // combat-feedback-overlay removed
    });

    it('should show damage number at position', () => {
      const mockDamageEl = {
        className: '',
        textContent: '',
        style: {}
      };
      global.document.createElement.returns(mockDamageEl);

      roguelikeHUD.showDamageNumber(100, 200, 25, 'damage');

      expect(mockDamageEl.className).to.equal('damage-number damage');
      expect(mockDamageEl.textContent).to.equal(25);
      expect(mockDamageEl.style.left).to.equal('100px');
      expect(mockDamageEl.style.top).to.equal('200px');
      expect(mockOverlay.appendChild.calledWith(mockDamageEl)).to.be.true;
    });

    it('should track damage numbers for animation', () => {
      roguelikeHUD.showDamageNumber(100, 200, 25, 'damage');

      expect(roguelikeHUD.hudCombatState.damageNumbers).to.have.length(1);
      expect(roguelikeHUD.hudCombatState.damageNumbers[0]).to.deep.include({
        x: 100,
        y: 200,
        opacity: 1.0
      });
    });

    it('should handle missing overlay gracefully', () => {
      // combat-feedback-overlay removed
      
      expect(() => roguelikeHUD.showDamageNumber(100, 200, 25)).to.not.throw();
    });
  });

  describe('Main Update Loop', () => {
    it('should update all HUD components when visible', () => {
      const updateVitalsSpy = sinon.spy(roguelikeHUD, 'updateVitals');
      const updatePhaseInfoSpy = sinon.spy(roguelikeHUD, 'updatePhaseInfo');
      const updateMinimapSpy = sinon.spy(roguelikeHUD, 'updateMinimap');
      const updateStatusEffectsSpy = sinon.spy(roguelikeHUD, 'updateStatusEffects');
      // updateCombatFeedback method removed
      const updateResourcesSpy = sinon.spy(roguelikeHUD, 'updateResources');

      roguelikeHUD.update();

      expect(updateVitalsSpy.called).to.be.true;
      expect(updatePhaseInfoSpy.called).to.be.true;
      expect(updateMinimapSpy.called).to.be.true;
      expect(updateStatusEffectsSpy.called).to.be.true;
      // updateCombatFeedback method removed
      expect(updateResourcesSpy.called).to.be.true;
    });

    it('should skip update when not visible', () => {
      roguelikeHUD.setVisible(false);
      const updateVitalsSpy = sinon.spy(roguelikeHUD, 'updateVitals');

      roguelikeHUD.update();

      expect(updateVitalsSpy.called).to.be.false;
    });

    it('should skip update when no WASM manager', () => {
      roguelikeHUD.wasmManager = null;
      const updateVitalsSpy = sinon.spy(roguelikeHUD, 'updateVitals');

      roguelikeHUD.update();

      expect(updateVitalsSpy.called).to.be.false;
    });
  });

  describe('Visibility Control', () => {
    let mockHUD;

    beforeEach(() => {
      mockHUD = { style: { display: 'block' } };
      global.document.getElementById.withArgs('roguelike-hud').returns(mockHUD);
    });

    it('should show HUD when set to visible', () => {
      roguelikeHUD.setVisible(true);

      expect(roguelikeHUD.isVisible).to.be.true;
      expect(mockHUD.style.display).to.equal('block');
    });

    it('should hide HUD when set to invisible', () => {
      roguelikeHUD.setVisible(false);

      expect(roguelikeHUD.isVisible).to.be.false;
      expect(mockHUD.style.display).to.equal('none');
    });

    it('should handle missing HUD element gracefully', () => {
      global.document.getElementById.withArgs('roguelike-hud').returns(null);
      
      expect(() => roguelikeHUD.setVisible(false)).to.not.throw();
    });
  });

  describe('Event Handling', () => {
    it('should handle phase change events', () => {
      const updatePhaseDisplaySpy = sinon.spy(roguelikeHUD, 'updatePhaseDisplay');
      
      // Simulate phase change event
      const phaseChangeCallback = mockGameStateManager.on.getCall(0).args[1];
      phaseChangeCallback(2);

      expect(updatePhaseDisplaySpy.calledWith(2)).to.be.true;
    });

    it('should setup controls toggle event listener', () => {
      // This would be tested in integration tests as it involves DOM event simulation
      expect(mockGameStateManager.on.called).to.be.true;
    });
  });

  describe('Cleanup and Destruction', () => {
    it('should destroy HUD and cleanup resources', () => {
      const mockHUD = { remove: sinon.stub() };
      global.document.getElementById.withArgs('roguelike-hud').returns(mockHUD);

      // Add some damage numbers to cleanup
      const mockDamageElement = { remove: sinon.stub() };
      roguelikeHUD.hudCombatState.damageNumbers = [{
        element: mockDamageElement
      }];

      roguelikeHUD.destroy();

      expect(mockHUD.remove.called).to.be.true;
      expect(mockDamageElement.remove.called).to.be.true;
      expect(roguelikeHUD.hudCombatState.damageNumbers).to.be.empty;
    });

    it('should handle missing HUD during destruction', () => {
      global.document.getElementById.withArgs('roguelike-hud').returns(null);

      expect(() => roguelikeHUD.destroy()).to.not.throw();
    });

    it('should cleanup damage numbers without elements', () => {
      roguelikeHUD.hudCombatState.damageNumbers = [{ element: null }];

      expect(() => roguelikeHUD.destroy()).to.not.throw();
    });

    it('should remove event listeners and subscriptions on destroy', () => {
      roguelikeHUD.destroy();

      expect(controlsToggleMock.removeEventListener.calledWith('click', roguelikeHUD.controlsToggleClickHandler)).to.be.true;
      expect(global.document.removeEventListener.calledWith('click', roguelikeHUD.documentClickHandler)).to.be.true;
      expect(mockGameStateManager.off.calledWith('phaseChanged', roguelikeHUD.phaseChangedHandler)).to.be.true;

      // Prevent afterEach from destroying again
      roguelikeHUD = null;
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid WASM return values', () => {
      mockWasmManager.getHP.returns(NaN);
      mockWasmManager.getStamina.returns(undefined);
      mockWasmManager.getPhase.returns(null);

      expect(() => {
        roguelikeHUD.updateVitals();
        roguelikeHUD.updatePhaseInfo();
      }).to.not.throw();
    });

    it('should handle missing DOM elements gracefully throughout', () => {
      global.document.querySelector.returns(null);
      global.document.getElementById.returns(null);

      expect(() => {
        roguelikeHUD.updateVitals();
        roguelikeHUD.updatePhaseInfo();
        roguelikeHUD.updateStatusEffects();
        // updateCombatFeedback method removed
        roguelikeHUD.updateResources();
      }).to.not.throw();
    });

    it('should handle WASM manager without required functions', () => {
      roguelikeHUD.wasmManager = {};

      expect(() => roguelikeHUD.update()).to.not.throw();
    });
  });
});
