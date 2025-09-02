import { expect } from 'chai';
import sinon from 'sinon';
import { CameraEffects } from '../../src/camera-effects.js';

describe('Camera Effects', () => {
  let canvas, ctx, cameraEffects;

  beforeEach(() => {
    // Create mock canvas and context
    ctx = {
      save: sinon.stub(),
      restore: sinon.stub(),
      translate: sinon.stub(),
      rotate: sinon.stub(),
      scale: sinon.stub(),
      fillRect: sinon.stub(),
      strokeRect: sinon.stub(),
      clearRect: sinon.stub(),
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      filter: '',
      createRadialGradient: sinon.stub().returns({
        addColorStop: sinon.stub()
      })
    };
    
    canvas = {
      width: 800,
      height: 600,
      getContext: sinon.stub().returns(ctx)
    };
    
    cameraEffects = new CameraEffects(canvas);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(cameraEffects.canvas).to.equal(canvas);
      expect(cameraEffects.ctx).to.equal(ctx);
      expect(cameraEffects.shakeIntensity).to.equal(0);
      expect(cameraEffects.shakeDecay).to.equal(0.9);
      expect(cameraEffects.baseZoom).to.equal(1.0);
      expect(cameraEffects.currentZoom).to.equal(1.0);
      expect(cameraEffects.position).to.deep.equal({ x: 0, y: 0 });
      expect(cameraEffects.rotation).to.equal(0);
      expect(cameraEffects.chromaticAberration).to.equal(0);
      expect(cameraEffects.motionBlurEnabled).to.be.false;
      expect(cameraEffects.flashAlpha).to.equal(0);
      expect(cameraEffects.vignetteIntensity).to.equal(0);
    });
  });

  describe('screen shake', () => {
    it('should add trauma for screen shake', () => {
      cameraEffects.addTrauma(0.5);
      expect(cameraEffects.shakeIntensity).to.equal(0.5);
      
      cameraEffects.addTrauma(0.3);
      expect(cameraEffects.shakeIntensity).to.equal(0.8);
    });

    it('should clamp trauma to maximum of 1', () => {
      cameraEffects.addTrauma(1.5);
      expect(cameraEffects.shakeIntensity).to.equal(1);
    });

    it('should trigger different shake intensities', () => {
      cameraEffects.shake('light');
      expect(cameraEffects.shakeIntensity).to.be.closeTo(0.2, 0.01);
      
      cameraEffects.shakeIntensity = 0;
      cameraEffects.shake('medium');
      expect(cameraEffects.shakeIntensity).to.be.closeTo(0.4, 0.01);
      
      cameraEffects.shakeIntensity = 0;
      cameraEffects.shake('heavy');
      expect(cameraEffects.shakeIntensity).to.be.closeTo(0.7, 0.01);
      
      cameraEffects.shakeIntensity = 0;
      cameraEffects.shake('extreme');
      expect(cameraEffects.shakeIntensity).to.equal(1.0);
    });

    it('should update shake offset during update', () => {
      cameraEffects.shakeIntensity = 0.5;
      cameraEffects.update(16);
      
      // Shake should produce some offset
      expect(cameraEffects.shakeOffset.x).to.not.equal(0);
      expect(cameraEffects.shakeOffset.y).to.not.equal(0);
      
      // Intensity should decay
      expect(cameraEffects.shakeIntensity).to.be.lessThan(0.5);
    });
  });

  describe('zoom effects', () => {
    it('should set zoom level', () => {
      cameraEffects.setZoom(2.0);
      expect(cameraEffects.targetZoom).to.equal(2.0);
    });

    it('should zoom to specific level with duration', () => {
      const clock = sinon.useFakeTimers();
      
      cameraEffects.zoomTo(2.0, 1000);
      expect(cameraEffects.targetZoom).to.equal(2.0);
      
      clock.restore();
    });

    it('should pulse zoom effect', () => {
      const clock = sinon.useFakeTimers();
      
      cameraEffects.pulseZoom(1.5, 500);
      expect(cameraEffects.targetZoom).to.equal(1.5);
      
      clock.tick(500);
      // After duration, should return to base zoom
      
      clock.restore();
    });

    it('should interpolate zoom during update', () => {
      cameraEffects.currentZoom = 1.0;
      cameraEffects.targetZoom = 2.0;
      cameraEffects.zoomSpeed = 0.1;
      
      cameraEffects.update(16);
      
      expect(cameraEffects.currentZoom).to.be.greaterThan(1.0);
      expect(cameraEffects.currentZoom).to.be.lessThan(2.0);
    });
  });

  describe('camera position', () => {
    it('should set camera position', () => {
      cameraEffects.setPosition(100, 200);
      
      expect(cameraEffects.targetPosition).to.deep.equal({ x: 100, y: 200 });
    });

    it('should follow target smoothly', () => {
      cameraEffects.position = { x: 0, y: 0 };
      cameraEffects.followTarget({ x: 100, y: 100 });
      
      expect(cameraEffects.targetPosition).to.deep.equal({ x: 100, y: 100 });
      
      cameraEffects.update(16);
      
      expect(cameraEffects.position.x).to.be.greaterThan(0);
      expect(cameraEffects.position.y).to.be.greaterThan(0);
    });

    it('should look ahead based on velocity', () => {
      const target = { x: 100, y: 100 };
      const velocity = { x: 10, y: 5 };
      
      cameraEffects.followWithLookAhead(target, velocity, 0.5);
      
      expect(cameraEffects.targetPosition.x).to.be.greaterThan(100);
      expect(cameraEffects.targetPosition.y).to.be.greaterThan(100);
    });
  });

  describe('rotation effects', () => {
    it('should set rotation', () => {
      cameraEffects.setRotation(Math.PI / 4);
      
      expect(cameraEffects.targetRotation).to.equal(Math.PI / 4);
    });

    it('should rotate to angle with duration', () => {
      const clock = sinon.useFakeTimers();
      
      cameraEffects.rotateTo(Math.PI / 2, 1000);
      expect(cameraEffects.targetRotation).to.equal(Math.PI / 2);
      
      clock.restore();
    });

    it('should interpolate rotation during update', () => {
      cameraEffects.rotation = 0;
      cameraEffects.targetRotation = Math.PI;
      cameraEffects.rotationSpeed = 0.1;
      
      cameraEffects.update(16);
      
      expect(cameraEffects.rotation).to.be.greaterThan(0);
      expect(cameraEffects.rotation).to.be.lessThan(Math.PI);
    });
  });

  describe('visual effects', () => {
    it('should trigger flash effect', () => {
      cameraEffects.flash('#ffffff', 0.8);
      
      expect(cameraEffects.flashColor).to.equal('#ffffff');
      expect(cameraEffects.flashAlpha).to.equal(0.8);
    });

    it('should decay flash during update', () => {
      cameraEffects.flashAlpha = 1.0;
      cameraEffects.flashDecay = 0.9;
      
      cameraEffects.update(16);
      
      expect(cameraEffects.flashAlpha).to.be.closeTo(0.9, 0.01);
    });

    it('should set vignette intensity', () => {
      cameraEffects.setVignette(0.5);
      
      expect(cameraEffects.vignetteTargetIntensity).to.equal(0.5);
    });

    it('should add chromatic aberration', () => {
      cameraEffects.addChromaticAberration(5);
      
      expect(cameraEffects.chromaticAberration).to.equal(5);
    });

    it('should decay chromatic aberration during update', () => {
      cameraEffects.chromaticAberration = 10;
      cameraEffects.chromaticDecay = 0.9;
      
      cameraEffects.update(16);
      
      expect(cameraEffects.chromaticAberration).to.be.closeTo(9, 0.1);
    });
  });

  describe('motion blur', () => {
    it('should enable motion blur', () => {
      cameraEffects.setMotionBlur(true, 0.7);
      
      expect(cameraEffects.motionBlurEnabled).to.be.true;
      expect(cameraEffects.motionBlurStrength).to.equal(0.7);
    });

    it('should disable motion blur', () => {
      cameraEffects.motionBlurEnabled = true;
      cameraEffects.setMotionBlur(false);
      
      expect(cameraEffects.motionBlurEnabled).to.be.false;
    });
  });

  describe('slow motion', () => {
    it('should set time scale', () => {
      cameraEffects.setTimeScale(0.5);
      
      expect(cameraEffects.targetTimeScale).to.equal(0.5);
    });

    it('should trigger slow motion with duration', () => {
      const clock = sinon.useFakeTimers();
      
      cameraEffects.slowMotion(0.3, 2000);
      expect(cameraEffects.targetTimeScale).to.equal(0.3);
      
      clock.tick(2000);
      // After duration, should return to normal time scale
      
      clock.restore();
    });
  });

  describe('transform application', () => {
    it('should begin transform', () => {
      cameraEffects.position = { x: 100, y: 50 };
      cameraEffects.currentZoom = 2.0;
      cameraEffects.rotation = Math.PI / 4;
      cameraEffects.shakeOffset = { x: 5, y: -3 };
      
      cameraEffects.beginTransform();
      
      expect(ctx.save.calledOnce).to.be.true;
      expect(ctx.translate.called).to.be.true;
      expect(ctx.rotate.calledWith(Math.PI / 4)).to.be.true;
      expect(ctx.scale.calledWith(2.0, 2.0)).to.be.true;
    });

    it('should end transform', () => {
      cameraEffects.endTransform();
      
      expect(ctx.restore.calledOnce).to.be.true;
    });
  });

  describe('reset', () => {
    it('should reset all effects', () => {
      cameraEffects.shakeIntensity = 0.5;
      cameraEffects.currentZoom = 2.0;
      cameraEffects.position = { x: 100, y: 100 };
      cameraEffects.rotation = Math.PI;
      cameraEffects.flashAlpha = 0.8;
      
      cameraEffects.reset();
      
      expect(cameraEffects.shakeIntensity).to.equal(0);
      expect(cameraEffects.currentZoom).to.equal(1.0);
      expect(cameraEffects.position).to.deep.equal({ x: 0, y: 0 });
      expect(cameraEffects.rotation).to.equal(0);
      expect(cameraEffects.flashAlpha).to.equal(0);
    });
  });
});