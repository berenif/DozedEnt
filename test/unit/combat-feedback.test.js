/**
 * Combat Feedback System Tests
 * Tests UI-only combat feedback components following WASM-first architecture
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { CombatFeedback } from '../../src/ui/combat-feedback.js';

describe('CombatFeedback', () => {
  let combatFeedback;
  let mockDocument;
  let mockWindow;

  beforeEach(() => {
    // Mock DOM environment
    global.document = {
      createElement: sinon.stub(),
      getElementById: sinon.stub(),
      querySelector: sinon.stub(),
      querySelectorAll: sinon.stub(),
      body: {
        appendChild: sinon.stub()
      }
    };

    global.window = {
      innerWidth: 1280,
      innerHeight: 720
    };

    global.performance = {
      now: sinon.stub().returns(1000)
    };

    // Setup DOM element mocks
    const mockOverlay = {
      id: '',
      className: '',
      innerHTML: '',
      remove: sinon.stub(),
      appendChild: sinon.stub(),
      style: {},
      classList: {
        add: sinon.stub(),
        remove: sinon.stub(),
        toggle: sinon.stub(),
        contains: sinon.stub()
      }
    };

    const mockContainer = {
      appendChild: sinon.stub(),
      querySelector: sinon.stub()
    };

    const mockElement = {
      textContent: '',
      style: {},
      remove: sinon.stub(),
      parentNode: mockContainer,
      classList: {
        add: sinon.stub(),
        remove: sinon.stub(),
        contains: sinon.stub().returns(false)
      }
    };

    global.document.createElement.returns(mockElement);
    global.document.getElementById.returns(mockOverlay);
    global.document.querySelector.returns(mockContainer);
    global.document.body.appendChild.returns(undefined);

    combatFeedback = new CombatFeedback();
  });

  afterEach(() => {
    sinon.restore();
    if (combatFeedback) {
      combatFeedback.destroy();
    }
  });

  describe('Constructor', () => {
    it('should initialize with default properties', () => {
      expect(combatFeedback.feedbackElements).to.be.an('array').that.is.empty;
      expect(combatFeedback.screenEffects).to.be.an('array').that.is.empty;
    });

    it('should initialize feedback overlay DOM structure', () => {
      expect(global.document.createElement.called).to.be.true;
      expect(global.document.body.appendChild.called).to.be.true;
    });

    it('should remove existing overlay before creating new one', () => {
      const existingOverlay = { remove: sinon.stub() };
      global.document.getElementById.returns(existingOverlay);
      
      new CombatFeedback();
      
      expect(existingOverlay.remove.called).to.be.true;
    });
  });

  describe('Damage Numbers', () => {
    let mockContainer, mockDamageElement;

    beforeEach(() => {
      mockContainer = {
        appendChild: sinon.stub()
      };
      mockDamageElement = {
        textContent: '',
        style: {},
        classList: { contains: sinon.stub().returns(false) },
        remove: sinon.stub(),
        parentNode: mockContainer
      };

      global.document.querySelector.returns(mockContainer);
      global.document.createElement.returns(mockDamageElement);
    });

    it('should show damage number at world position', () => {
      combatFeedback.showDamageNumber(0.5, 0.3, 25, 'damage');

      expect(mockDamageElement.textContent).to.equal('25');
      expect(mockDamageElement.className).to.equal('damage-number damage');
      expect(mockContainer.appendChild.calledWith(mockDamageElement)).to.be.true;
    });

    it('should format critical damage correctly', () => {
      combatFeedback.showDamageNumber(0.5, 0.3, 50, 'critical');

      expect(mockDamageElement.textContent).to.equal('50!');
      expect(mockDamageElement.className).to.equal('damage-number critical');
    });

    it('should format blocked damage correctly', () => {
      combatFeedback.showDamageNumber(0.5, 0.3, 10, 'block');

      expect(mockDamageElement.textContent).to.equal('BLOCKED');
      expect(mockDamageElement.className).to.equal('damage-number block');
    });

    it('should format parry correctly', () => {
      combatFeedback.showDamageNumber(0.5, 0.3, 0, 'parry');

      expect(mockDamageElement.textContent).to.equal('PARRY!');
      expect(mockDamageElement.className).to.equal('damage-number parry');
    });

    it('should format heal correctly', () => {
      combatFeedback.showDamageNumber(0.5, 0.3, 15, 'heal');

      expect(mockDamageElement.textContent).to.equal('+15');
      expect(mockDamageElement.className).to.equal('damage-number heal');
    });

    it('should convert world coordinates to screen coordinates', () => {
      const worldX = 0.25;
      const worldY = 0.75;
      
      combatFeedback.showDamageNumber(worldX, worldY, 10, 'damage');

      // Should convert world coords (0-1) to screen coords
      const expectedScreenX = worldX * global.window.innerWidth;
      const expectedScreenY = worldY * global.window.innerHeight;
      
      // Check that position is set (with some randomization)
      expect(mockDamageElement.style.left).to.be.a('string');
      expect(mockDamageElement.style.top).to.be.a('string');
    });

    it('should track damage numbers for animation', () => {
      combatFeedback.showDamageNumber(0.5, 0.3, 25, 'damage');

      expect(combatFeedback.feedbackElements).to.have.length(1);
      expect(combatFeedback.feedbackElements[0]).to.have.property('element');
      expect(combatFeedback.feedbackElements[0]).to.have.property('startTime');
      expect(combatFeedback.feedbackElements[0]).to.have.property('duration');
    });
  });

  describe('Hit Indicators', () => {
    let mockContainer, mockIndicator;

    beforeEach(() => {
      mockContainer = { appendChild: sinon.stub() };
      mockIndicator = {
        textContent: '',
        style: {},
        classList: { add: sinon.stub() },
        remove: sinon.stub(),
        parentNode: mockContainer
      };

      global.document.querySelector.returns(mockContainer);
      global.document.createElement.returns(mockIndicator);
    });

    it('should show hit indicator at position', () => {
      combatFeedback.showHitIndicator(0.5, 0.3, 'hit');

      expect(mockIndicator.textContent).to.equal('💥');
      expect(mockIndicator.className).to.equal('hit-indicator hit');
      expect(mockContainer.appendChild.calledWith(mockIndicator)).to.be.true;
    });

    it('should show different indicators for different hit types', () => {
      const testCases = [
        { type: 'hit', expected: '💥' },
        { type: 'miss', expected: '💨' },
        { type: 'critical', expected: '⚡' },
        { type: 'block', expected: '🛡️' },
        { type: 'parry', expected: '✨' }
      ];

      testCases.forEach(({ type, expected }) => {
        combatFeedback.showHitIndicator(0.5, 0.3, type);
        expect(mockIndicator.textContent).to.equal(expected);
      });
    });

    it('should handle unknown hit types with default indicator', () => {
      combatFeedback.showHitIndicator(0.5, 0.3, 'unknown');

      expect(mockIndicator.textContent).to.equal('💥');
    });
  });


  describe('Screen Effects', () => {
    let mockContainer, mockEffect;

    beforeEach(() => {
      mockContainer = { appendChild: sinon.stub() };
      mockEffect = {
        style: {},
        remove: sinon.stub(),
        parentNode: mockContainer
      };

      global.document.querySelector.returns(mockContainer);
      global.document.createElement.returns(mockEffect);
    });

    it('should show screen effect with intensity', () => {
      combatFeedback.showScreenEffect('critical', 0.8);

      expect(mockEffect.className).to.equal('screen-effect critical');
      expect(mockEffect.style.opacity).to.equal(0.8);
      expect(mockContainer.appendChild.calledWith(mockEffect)).to.be.true;
    });

    it('should use default intensity if not provided', () => {
      combatFeedback.showScreenEffect('hit');

      expect(mockEffect.style.opacity).to.equal(0.5);
    });
  });

  describe('Combat Event Handlers', () => {
    let showDamageNumberSpy, showHitIndicatorSpy, showScreenEffectSpy;

    beforeEach(() => {
      showDamageNumberSpy = sinon.spy(combatFeedback, 'showDamageNumber');
      showHitIndicatorSpy = sinon.spy(combatFeedback, 'showHitIndicator');
      showScreenEffectSpy = sinon.spy(combatFeedback, 'showScreenEffect');
    });

    it('should handle attack hit correctly', () => {
      combatFeedback.onAttackHit(0.5, 0.3, 25, false);

      expect(showDamageNumberSpy.calledWith(0.5, 0.3, 25, 'damage')).to.be.true;
      expect(showHitIndicatorSpy.calledWith(0.5, 0.3, 'hit')).to.be.true;
      expect(showScreenEffectSpy.calledWith('hit', 0.4)).to.be.true;
    });

    it('should handle critical attack hit correctly', () => {
      combatFeedback.onAttackHit(0.5, 0.3, 50, true);

      expect(showDamageNumberSpy.calledWith(0.5, 0.3, 50, 'critical')).to.be.true;
      expect(showHitIndicatorSpy.calledWith(0.5, 0.3, 'critical')).to.be.true;
      expect(showScreenEffectSpy.calledWith('critical', 0.8)).to.be.true;
    });

    it('should handle attack miss correctly', () => {
      combatFeedback.onAttackMiss(0.5, 0.3);

      expect(showHitIndicatorSpy.calledWith(0.5, 0.3, 'miss')).to.be.true;
    });

    it('should handle attack blocked correctly', () => {
      combatFeedback.onAttackBlocked(0.5, 0.3, 5);

      expect(showDamageNumberSpy.calledWith(0.5, 0.3, 5, 'block')).to.be.true;
      expect(showHitIndicatorSpy.calledWith(0.5, 0.3, 'block')).to.be.true;
    });

    it('should handle attack parried correctly', () => {
      combatFeedback.onAttackParried(0.5, 0.3);

      expect(showDamageNumberSpy.calledWith(0.5, 0.3, 0, 'parry')).to.be.true;
      expect(showHitIndicatorSpy.calledWith(0.5, 0.3, 'parry')).to.be.true;
      expect(showScreenEffectSpy.calledWith('parry', 0.6)).to.be.true;
    });

    it('should handle player healed correctly', () => {
      combatFeedback.onPlayerHealed(0.5, 0.3, 20);

      expect(showDamageNumberSpy.calledWith(0.5, 0.3, 20, 'heal')).to.be.true;
      expect(showScreenEffectSpy.calledWith('heal', 0.3)).to.be.true;
    });

    it('should handle player damaged correctly', () => {
      combatFeedback.onPlayerDamaged(0.5, 0.3, 15);

      expect(showDamageNumberSpy.calledWith(0.5, 0.3, 15, 'damage')).to.be.true;
      expect(showScreenEffectSpy.calledWith('damage', 0.6)).to.be.true;
    });
  });

  describe('Update Animation', () => {
    it('should update feedback element positions and opacity', () => {
      const mockElement = {
        style: {},
        classList: { contains: sinon.stub().returns(false) }
      };

      // Add a feedback element
      combatFeedback.feedbackElements.push({
        element: mockElement,
        startTime: 500,
        duration: 2000,
        floatDistance: 60,
        startY: 100
      });

      global.performance.now.returns(1000); // 500ms elapsed

      combatFeedback.update();

      expect(mockElement.style.top).to.be.a('string');
      expect(mockElement.style.opacity).to.be.a('number');
    });

    it('should apply scale animation to critical hits', () => {
      const mockElement = {
        style: {},
        classList: { contains: sinon.stub().returns(true) } // Returns true for 'critical'
      };

      combatFeedback.feedbackElements.push({
        element: mockElement,
        startTime: 500,
        duration: 2000,
        floatDistance: 60,
        startY: 100
      });

      global.performance.now.returns(1000);

      combatFeedback.update();

      expect(mockElement.style.transform).to.be.a('string');
    });
  });

  describe('Cleanup', () => {
    it('should destroy and cleanup resources', () => {
      const mockOverlay = { remove: sinon.stub() };
      global.document.getElementById.withArgs('combat-feedback-system').returns(mockOverlay);

      combatFeedback.destroy();

      expect(mockOverlay.remove.called).to.be.true;
      expect(combatFeedback.feedbackElements).to.be.empty;
      expect(combatFeedback.screenEffects).to.be.empty;
    });

    it('should handle missing overlay during destroy', () => {
      global.document.getElementById.withArgs('combat-feedback-system').returns(null);

      expect(() => combatFeedback.destroy()).to.not.throw();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing container gracefully', () => {
      global.document.querySelector.returns(null);

      expect(() => combatFeedback.showDamageNumber(0.5, 0.3, 10)).to.not.throw();
      expect(() => combatFeedback.showHitIndicator(0.5, 0.3, 'hit')).to.not.throw();
    });


    it('should handle missing screen effects container gracefully', () => {
      global.document.querySelector.returns(null);

      expect(() => combatFeedback.showScreenEffect('hit')).to.not.throw();
    });
  });
});
