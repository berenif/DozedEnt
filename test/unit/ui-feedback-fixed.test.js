import { expect } from 'chai';
import sinon from 'sinon';

// Mock Canvas and 2D Context
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

describe('UI Feedback System - Fixed Tests', () => {
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
      const status = new StatusIndicator('poison', 5.0);
      
      expect(status.type).to.equal('poison');
      expect(status.duration).to.equal(5.0);
      expect(status.active).to.be.true;
      expect(status.elapsed).to.equal(0);
    });

    it('should update and track remaining time', () => {
      const status = new StatusIndicator('poison', 2.0);
      
      expect(status.elapsed).to.equal(0);
      
      status.update(0.5);
      expect(status.elapsed).to.equal(0.5);
      
      status.update(2.0);
      expect(status.active).to.be.false;
    });

    it('should render with correct canvas calls', () => {
      const status = new StatusIndicator('poison', 5.0);
      
      status.render(mockCtx, 50, 100, 0);

      expect(mockCtx.save.callCount).to.be.greaterThan(0);
      expect(mockCtx.restore.callCount).to.be.greaterThan(0);
    });
  });

  describe('UIFeedbackSystem Class', () => {
    let feedbackSystem;

    beforeEach(() => {
      feedbackSystem = new UIFeedbackSystem();
    });

    it('should initialize with empty collections', () => {
      expect(feedbackSystem.damageNumbers).to.be.an('array');
      expect(feedbackSystem.damageNumbers).to.have.length(0);
      expect(feedbackSystem.comboCounter).to.be.an('object');
      expect(feedbackSystem.statusIndicators).to.be.an('array');
      expect(feedbackSystem.statusIndicators).to.have.length(0);
    });

    it('should show damage numbers correctly', () => {
      feedbackSystem.showDamage(100, 200, 50);
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.damageNumbers[0].x).to.equal(100);
      expect(feedbackSystem.damageNumbers[0].y).to.equal(200);
      expect(feedbackSystem.damageNumbers[0].value).to.equal(50);
    });

    it('should add combo hits', () => {
      const initialCount = feedbackSystem.comboCounter.count;
      
      feedbackSystem.addComboHit();
      
      expect(feedbackSystem.comboCounter.count).to.equal(initialCount + 1);
    });

    it('should add status effects', () => {
      feedbackSystem.addStatus('poison', 5.0);
      
      expect(feedbackSystem.statusIndicators).to.have.length(1);
      expect(feedbackSystem.statusIndicators[0].type).to.equal('poison');
      expect(feedbackSystem.statusIndicators[0].duration).to.equal(5.0);
    });

    it('should remove status effects', () => {
      feedbackSystem.addStatus('poison', 5.0);
      expect(feedbackSystem.statusIndicators).to.have.length(1);
      
      feedbackSystem.removeStatus('poison');
      expect(feedbackSystem.statusIndicators).to.have.length(0);
    });

    it('should update all elements', () => {
      feedbackSystem.showDamage(100, 200, 50);
      feedbackSystem.addStatus('poison', 0.1); // Short duration
      
      expect(feedbackSystem.damageNumbers).to.have.length(1);
      expect(feedbackSystem.statusIndicators).to.have.length(1);
      
      feedbackSystem.update(0.2); // Should expire status
      
      expect(feedbackSystem.statusIndicators).to.have.length(0);
    });

    it('should render all elements', () => {
      feedbackSystem.showDamage(100, 200, 50);
      feedbackSystem.addStatus('poison', 5.0);
      
      feedbackSystem.render(mockCtx);

      expect(mockCtx.save.callCount).to.be.greaterThan(0);
      expect(mockCtx.restore.callCount).to.be.greaterThan(0);
    });

    it('should show notifications', () => {
      feedbackSystem.showNotification('Test Message', 2, '#ff0000');
      
      expect(feedbackSystem.notifications).to.have.length(1);
      expect(feedbackSystem.notifications[0].text).to.equal('Test Message');
      expect(feedbackSystem.notifications[0].duration).to.equal(2);
      expect(feedbackSystem.notifications[0].color).to.equal('#ff0000');
    });

    it('should flash screen', () => {
      feedbackSystem.flashScreen('#ff0000', 0.5);
      
      expect(feedbackSystem.screenFlash).to.not.be.null;
      expect(feedbackSystem.screenFlash.color).to.equal('#ff0000');
      expect(feedbackSystem.screenFlash.alpha).to.equal(0.5);
    });

    it('should handle health bar updates', () => {
      feedbackSystem.setHealth(80, 100);
      
      expect(feedbackSystem.healthBar.currentHealth).to.equal(80);
      expect(feedbackSystem.healthBar.maxHealth).to.equal(100);
    });
  });
});
