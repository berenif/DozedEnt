import { expect } from 'chai';
import sinon from 'sinon';

// Mock DOM and Canvas APIs
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
  beginPath: sinon.stub(),
  arc: sinon.stub(),
  rect: sinon.stub(),
  fillRect: sinon.stub(),
  strokeRect: sinon.stub(),
  moveTo: sinon.stub(),
  lineTo: sinon.stub(),
  fill: sinon.stub(),
  stroke: sinon.stub(),
  clearRect: sinon.stub(),
  fillText: sinon.stub(),
  strokeText: sinon.stub(),
  measureText: sinon.stub().returns({ width: 50 }),
  createLinearGradient: sinon.stub().returns({
    addColorStop: sinon.stub()
  }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  font: '12px Arial',
  textAlign: 'center',
  textBaseline: 'middle',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0
});

// Mock performance API
global.performance = global.performance || {
  now: () => Date.now()
};

describe('UI Feedback System - Comprehensive Tests', () => {
  let UIFeedbackSystem, DamageNumber, StatusIndicator;
  let mockCanvas, mockCtx;

  before(async () => {
    // Dynamic import to ensure mocks are in place
    const module = await import('../../src/utils/ui-feedback.js');
    UIFeedbackSystem = module.UIFeedbackSystem;
    DamageNumber = module.DamageNumber;
    StatusIndicator = module.StatusIndicator;
  });

  beforeEach(() => {
    mockCanvas = createMockCanvas();
    mockCtx = createMockContext();
    sinon.stub(mockCanvas, 'getContext').returns(mockCtx);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('DamageNumber Class', () => {
    it('should create a damage number with default properties', () => {
      const damageNumber = new DamageNumber(100, 200, 50);
      
      expect(damageNumber.x).to.equal(100);
      expect(damageNumber.y).to.equal(200);
      expect(damageNumber.value).to.equal(50);
      expect(damageNumber.color).to.equal('#ffffff');
      expect(damageNumber.size).to.equal(24);
      expect(damageNumber.critical).to.be.false;
      expect(damageNumber.heal).to.be.false;
      expect(damageNumber.miss).to.be.false;
    });

    it('should create a critical damage number', () => {
      const criticalDamage = new DamageNumber(100, 200, 100, {
        critical: true,
        color: '#ff6b6b'
      });
      
      expect(criticalDamage.critical).to.be.true;
      expect(criticalDamage.size).to.equal(24 * 1.5);
      expect(criticalDamage.color).to.equal('#ff6b6b');
    });

    it('should create a heal number', () => {
      const healNumber = new DamageNumber(100, 200, 25, {
        heal: true
      });
      
      expect(healNumber.heal).to.be.true;
      expect(healNumber.color).to.equal('#4ade80');
    });

    it('should create a miss indicator', () => {
      const missNumber = new DamageNumber(100, 200, 0, {
        miss: true
      });
      
      expect(missNumber.miss).to.be.true;
      expect(missNumber.value).to.equal('MISS');
      expect(missNumber.color).to.equal('#94a3b8');
    });

    it('should update position and properties over time', () => {
      const damageNumber = new DamageNumber(100, 200, 50, {
        velocityY: -100,
        gravity: 200
      });

      const initialY = damageNumber.y;
      const initialVelocityY = damageNumber.velocityY;
      
      damageNumber.update(1/60);

      expect(damageNumber.y).to.be.lessThan(initialY);
      expect(damageNumber.velocityY).to.be.greaterThan(initialVelocityY);
      expect(damageNumber.age).to.be.greaterThan(0);
    });

    it('should handle bounce physics', () => {
      const damageNumber = new DamageNumber(100, 550, 50, {
        bounce: true,
        velocityY: 100,
        gravity: 980
      });

      // Simulate hitting the ground (y > canvas height)
      damageNumber.y = 650;
      damageNumber.velocityY = 200;
      
      damageNumber.update(1/60);

      expect(damageNumber.velocityY).to.be.lessThan(0); // Should bounce up
      expect(damageNumber.bounceCount).to.equal(1);
    });

    it('should detect when damage number is expired', () => {
      const damageNumber = new DamageNumber(100, 200, 50, {
        lifetime: 0.5
      });
      
      expect(damageNumber.age < damageNumber.lifetime).to.be.true;
      
      damageNumber.update(0.6); // Age beyond lifetime
      
      expect(damageNumber.age >= damageNumber.lifetime).to.be.true;
    });

    it('should render with correct canvas calls', () => {
      const damageNumber = new DamageNumber(100, 200, 50);
      
      damageNumber.render(mockCtx);

      expect(mockCtx.save.callCount).to.be.greaterThan(0);
      expect(mockCtx.restore.callCount).to.be.greaterThan(0);
      expect(mockCtx.fillText.callCount).to.be.greaterThan(0);
      expect(mockCtx.strokeText.callCount).to.be.greaterThan(0);
    });
  });


  describe('StatusIndicator Class', () => {
    it('should create status indicator with correct properties', () => {
      const status = new StatusIndicator(300, 150, 'POISONED', {
        color: '#8b5cf6',
        duration: 5.0
      });
      
      expect(status.x).to.equal(300);
      expect(status.y).to.equal(150);
      expect(status.text).to.equal('POISONED');
      expect(status.color).to.equal('#8b5cf6');
      expect(status.duration).to.equal(5.0);
    });

    it('should update and track remaining time', () => {
      const status = new StatusIndicator(300, 150, 'STUNNED', {
        duration: 2.0
      });
      
      expect(status.getRemainingTime()).to.equal(2.0);
      
      status.update(0.5);
      expect(status.getRemainingTime()).to.equal(1.5);
      
      status.update(2.0);
      expect(status.isExpired()).to.be.true;
    });

    it('should handle pulsing animation', () => {
      const status = new StatusIndicator(300, 150, 'BURNING', {
        pulse: true,
        pulseSpeed: 2.0
      });
      
      const initialScale = status.scale;
      status.update(0.5);
      
      expect(status.scale).to.not.equal(initialScale);
    });

    it('should render with icon and text', () => {
      const status = new StatusIndicator(300, 150, 'SHIELDED', {
        icon: '🛡️'
      });
      
      status.render(mockCtx);

      expect(mockCtx.fillText).to.have.been.called;
      expect(mockCtx.strokeText).to.have.been.called;
    });
  });

  describe('UIFeedbackSystem Class', () => {
    let feedbackSystem;

    beforeEach(() => {
      feedbackSystem = new UIFeedbackSystem(mockCtx, mockCanvas);
    });

    it('should initialize with empty collections', () => {
      expect(feedbackSystem.ctx).to.equal(mockCtx);
      expect(feedbackSystem.canvas).to.equal(mockCanvas);
      expect(feedbackSystem.damageNumbers).to.be.an('array').with.length(0);
      expect(feedbackSystem.statusIndicators).to.be.an('array').with.length(0);
      expect(feedbackSystem.combo).to.exist;
    });

    it('should show damage numbers correctly', () => {
      feedbackSystem.showDamage(100, 200, 50);
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.damageNumbers[0].value).to.equal(50);
    });

    it('should show critical damage with special effects', () => {
      feedbackSystem.showCriticalDamage(150, 250, 100);
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.damageNumbers[0].critical).to.be.true;
      expect(feedbackSystem.damageNumbers[0].size).to.be.greaterThan(24);
    });

    it('should show heal numbers', () => {
      feedbackSystem.showHeal(200, 300, 25);
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.damageNumbers[0].heal).to.be.true;
      expect(feedbackSystem.damageNumbers[0].color).to.equal('#4ade80');
    });

    it('should show miss indicators', () => {
      feedbackSystem.showMiss(250, 350);
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.damageNumbers[0].miss).to.be.true;
      expect(feedbackSystem.damageNumbers[0].value).to.equal('MISS');
    });

    it('should add status effects', () => {
      feedbackSystem.addStatusEffect('BURNING', {
        duration: 3.0,
        color: '#ef4444'
      });
      
      expect(feedbackSystem.statusIndicators).to.have.length(1);
      expect(feedbackSystem.statusIndicators[0].text).to.equal('BURNING');
    });

    it('should remove expired status effects', () => {
      feedbackSystem.addStatusEffect('TEMPORARY', {
        duration: 0.1
      });
      
      expect(feedbackSystem.statusIndicators).to.have.length(1);
      
      feedbackSystem.update(0.2);
      
      expect(feedbackSystem.statusIndicators).to.have.length(0);
    });

    it('should handle combo system integration', () => {
      feedbackSystem.incrementCombo();
      feedbackSystem.incrementCombo();
      
      expect(feedbackSystem.combo.count).to.equal(2);
      expect(feedbackSystem.combo.isActive()).to.be.true;
    });

    it('should update all elements', () => {
      feedbackSystem.showDamage(100, 200, 50);
      feedbackSystem.addStatusEffect('TEST', { duration: 1.0 });
      feedbackSystem.incrementCombo();
      
      const deltaTime = 1/60;
      feedbackSystem.update(deltaTime);

      // All elements should be updated
      expect(feedbackSystem.damageNumbers[0].age).to.be.greaterThan(0);
      expect(feedbackSystem.statusIndicators[0].age).to.be.greaterThan(0);
      expect(feedbackSystem.combo.lastHitTime).to.be.greaterThan(0);
    });

    it('should render all elements', () => {
      feedbackSystem.showDamage(100, 200, 50);
      feedbackSystem.addStatusEffect('VISIBLE', { duration: 1.0 });
      feedbackSystem.incrementCombo();
      
      feedbackSystem.render();

      // Verify rendering calls were made
      expect(mockCtx.save).to.have.been.called;
      expect(mockCtx.restore).to.have.been.called;
      expect(mockCtx.fillText).to.have.been.called;
    });

    it('should clean up expired elements', () => {
      feedbackSystem.showDamage(100, 200, 50, { lifetime: 0.1 });
      feedbackSystem.addStatusEffect('SHORT', { duration: 0.1 });
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.statusIndicators).to.have.length(1);
      
      feedbackSystem.update(0.2);
      
      expect(feedbackSystem.damageNumbers).to.have.length(0);
      expect(feedbackSystem.statusIndicators).to.have.length(0);
    });

    it('should handle screen shake effects', () => {
      feedbackSystem.addScreenShake(10, 0.5);
      
      expect(feedbackSystem.screenShake.intensity).to.equal(10);
      expect(feedbackSystem.screenShake.duration).to.equal(0.5);
      
      feedbackSystem.update(0.1);
      
      expect(feedbackSystem.screenShake.duration).to.be.lessThan(0.5);
    });

    it('should position status effects correctly', () => {
      feedbackSystem.addStatusEffect('FIRST', { duration: 1.0 });
      feedbackSystem.addStatusEffect('SECOND', { duration: 1.0 });
      feedbackSystem.addStatusEffect('THIRD', { duration: 1.0 });
      
      expect(feedbackSystem.statusIndicators).to.have.length(3);
      
      // Each status should have different y position
      const yPositions = feedbackSystem.statusIndicators.map(s => s.y);
      expect(new Set(yPositions)).to.have.size(3);
    });

    it('should handle performance under load', () => {
      // Add many elements
      for (let i = 0; i < 100; i++) {
        feedbackSystem.showDamage(Math.random() * 800, Math.random() * 600, Math.random() * 100);
      }
      
      for (let i = 0; i < 20; i++) {
        feedbackSystem.addStatusEffect(`STATUS_${i}`, { duration: 1.0 });
      }

      const startTime = performance.now();
      feedbackSystem.update(1/60);
      feedbackSystem.render();
      const endTime = performance.now();

      expect(endTime - startTime).to.be.lessThan(16); // Should maintain 60fps
    });

    it('should clear all feedback elements', () => {
      feedbackSystem.showDamage(100, 200, 50);
      feedbackSystem.addStatusEffect('TEST', { duration: 1.0 });
      feedbackSystem.incrementCombo();
      
      feedbackSystem.clear();
      
      expect(feedbackSystem.damageNumbers).to.have.length(0);
      expect(feedbackSystem.statusIndicators).to.have.length(0);
      expect(feedbackSystem.combo.count).to.equal(0);
    });
  });

  describe('UI Feedback Integration', () => {
    let feedbackSystem;

    beforeEach(() => {
      feedbackSystem = new UIFeedbackSystem(mockCtx, mockCanvas);
    });

    it('should handle complex damage scenarios', () => {
      // Simulate a complex combat scenario
      feedbackSystem.showDamage(100, 200, 25);
      feedbackSystem.incrementCombo();
      feedbackSystem.showCriticalDamage(120, 180, 50);
      feedbackSystem.incrementCombo();
      feedbackSystem.showDamage(140, 160, 30);
      feedbackSystem.incrementCombo();
      
      expect(feedbackSystem.damageNumbers).to.have.length(3);
      expect(feedbackSystem.combo.count).to.equal(3);
      expect(feedbackSystem.combo.getMultiplier()).to.be.greaterThan(1.0);
    });

    it('should handle overlapping status effects', () => {
      feedbackSystem.addStatusEffect('BURNING', { duration: 2.0 });
      feedbackSystem.addStatusEffect('POISONED', { duration: 3.0 });
      feedbackSystem.addStatusEffect('SLOWED', { duration: 1.5 });
      
      expect(feedbackSystem.statusIndicators).to.have.length(3);
      
      // Update to expire some effects
      feedbackSystem.update(1.6);
      
      expect(feedbackSystem.statusIndicators).to.have.length(2);
      expect(feedbackSystem.statusIndicators.some(s => s.text === 'SLOWED')).to.be.false;
    });

    it('should maintain visual hierarchy', () => {
      feedbackSystem.showDamage(100, 200, 10);
      feedbackSystem.showCriticalDamage(120, 180, 50);
      feedbackSystem.showHeal(140, 160, 20);
      
      const critical = feedbackSystem.damageNumbers.find(d => d.critical);
      const normal = feedbackSystem.damageNumbers.find(d => !d.critical && !d.heal);
      const heal = feedbackSystem.damageNumbers.find(d => d.heal);
      
      expect(critical.size).to.be.greaterThan(normal.size);
      expect(critical.color).to.not.equal(normal.color);
      expect(heal.color).to.not.equal(normal.color);
    });
  });
});
